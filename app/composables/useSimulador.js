// useSimulador.js — Lógica del Simulador de inversión "what-if"
// =============================================================================
// Estima, de forma SIMPLIFICADA y honesta, el efecto de colocar un equipamiento
// nuevo (IPS de salud o colegio) sobre el score_accesibilidad de las manzanas
// cercanas. NO sustituye un estudio técnico: usa distancia euclidiana convertida
// a tiempo de viaje y una curva minutos→score derivada empíricamente de los
// datos reales (isocronas OSRM + score_accesibilidad del Atlas).
//
// Reglas del recálculo (transparentes):
//  1. Para cada manzana dentro del radio de influencia se calcula la distancia
//     en línea recta al punto hipotético.
//  2. Se convierte a minutos asumiendo una velocidad efectiva rural/urbana
//     (incluye factor de rodeo por la red vial real).
//  3. Si esos minutos son MENORES que el tiempo actual al equipamiento más
//     cercano (isocrona real), la manzana mejora: su nuevo tiempo de acceso
//     baja y su score_accesibilidad sube según la curva minutos→score.
//  4. El score nunca empeora (solo se modela la incorporación de oferta nueva).
// =============================================================================

import { ref, computed, shallowRef } from 'vue'

// ── Constantes del modelo ────────────────────────────────────────────────────
export const RADIO_KM = 3            // radio de influencia del recálculo
const VEL_EFECTIVA_KMH = 22          // velocidad efectiva puerta-a-puerta (rural/urbana mixta)
const FACTOR_RODEO = 1.35            // sobrecosto de distancia por trazado vial real (vs línea recta)

// Tipos de equipamiento que el usuario puede colocar
export const TIPOS_EQUIPAMIENTO = [
  {
    key: 'ips',
    label: 'IPS de salud',
    descripcion: 'Hospital, centro o puesto de salud',
    color: '#3B82F6',
    fuente: '/data/reps.geojson',
    isoField: 'min_ips',
    icon: 'salud',
  },
  {
    key: 'colegio',
    label: 'Colegio',
    descripcion: 'Sede educativa SIMAT',
    color: '#F59E0B',
    fuente: '/data/simat.geojson',
    isoField: 'min_colegio',
    icon: 'educacion',
  },
]

// ── Curva minutos → score_accesibilidad ──────────────────────────────────────
// Derivada de los promedios reales observados (buckets de min_ips vs score_acc):
//   0–5min ≈ 0.87 · 5–10 ≈ 0.75 · 10–15 ≈ 0.60 · 15–20 ≈ 0.53 · 20–25 ≈ 0.35
//   25–35 ≈ 0.30 · 35–45 ≈ 0.25 · 45–55 ≈ 0.13 · 55–65 ≈ 0.10
// Interpolación lineal a tramos sobre esos anclajes (cap a 60+ min).
const CURVA = [
  [0, 0.93], [5, 0.81], [10, 0.67], [15, 0.55], [20, 0.42],
  [25, 0.35], [35, 0.28], [45, 0.18], [55, 0.12], [65, 0.08], [120, 0.0],
]

export function minutosAScore(min) {
  const m = Math.max(0, +min || 0)
  for (let i = 0; i < CURVA.length - 1; i++) {
    const [m0, s0] = CURVA[i]
    const [m1, s1] = CURVA[i + 1]
    if (m <= m1) {
      const t = (m - m0) / (m1 - m0 || 1)
      return s0 + (s1 - s0) * t
    }
  }
  return 0
}

// Distancia Haversine en km
export function haversineKm(lng1, lat1, lng2, lat2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function kmAMinutos(km) {
  return (km * FACTOR_RODEO) / VEL_EFECTIVA_KMH * 60
}

// Centroide aproximado de un polígono (promedio del primer anillo)
export function centroide(geometry) {
  let ring
  if (geometry.type === 'Polygon') ring = geometry.coordinates[0]
  else if (geometry.type === 'MultiPolygon') ring = geometry.coordinates[0][0]
  else return null
  let x = 0, y = 0, n = 0
  for (const [lng, lat] of ring) { x += lng; y += lat; n++ }
  return n ? [x / n, y / n] : null
}

// ── Estado y carga de datos ──────────────────────────────────────────────────
export function useSimulador() {
  const cargando = ref(true)
  const error = ref(null)

  // Manzanas pre-procesadas: { id, cod, municipio, lng, lat, accBase, minIps, minColegio }
  const manzanas = shallowRef([])
  // GeoJSON original (para pintar el mapa)
  const atlasGeo = shallowRef(null)

  async function cargarDatos() {
    cargando.value = true
    error.value = null
    try {
      const [geo, isoText] = await Promise.all([
        fetch('/data/atlas.geojson').then((r) => r.json()),
        fetch('/data/isocronas_osrm_real.csv').then((r) => r.text()),
      ])

      // Parse isocronas
      const iso = {}
      const rows = isoText.trim().split('\n').slice(1)
      for (const row of rows) {
        const c = row.split(',')
        iso[c[0]] = { min_ips: +c[1], min_colegio: +c[2] }
      }

      const list = []
      for (const f of geo.features) {
        const p = f.properties
        const cen = centroide(f.geometry)
        if (!cen) continue
        const i = iso[p.cod_manzana] || {}
        list.push({
          id: p._fid,
          cod: p.cod_manzana,
          municipio: p.municipio,
          lng: cen[0],
          lat: cen[1],
          accBase: p.score_accesibilidad ?? 0,
          min_ips: i.min_ips ?? 999,
          min_colegio: i.min_colegio ?? 999,
        })
      }

      manzanas.value = list
      atlasGeo.value = geo
      cargando.value = false
    } catch (e) {
      error.value = e.message || 'Error cargando datos'
      cargando.value = false
    }
  }

  // ── Recálculo what-if ──────────────────────────────────────────────────────
  // punto = { lng, lat }, tipo = 'ips' | 'colegio'
  // Devuelve { afectadas: [{id, accBase, accNueva, delta}], resumen }
  function simular(punto, tipo) {
    if (!punto || !manzanas.value.length) return null
    const isoField = tipo === 'colegio' ? 'min_colegio' : 'min_ips'

    const afectadas = []
    let sumaDelta = 0
    let maxDelta = 0

    // Prefiltro barato por bounding-box: descarta las manzanas fuera del radio sin
    // evaluar trigonometría. Sobre 7.028 manzanas, solo las pocas dentro de la caja
    // (~3km) llegan al Haversine, en vez de recalcularlo para todas en cada arrastre.
    const dLat = RADIO_KM / 111                                            // 1° lat ≈ 111 km
    const dLng = RADIO_KM / (111 * Math.cos((punto.lat * Math.PI) / 180))  // ajustado por latitud

    for (const m of manzanas.value) {
      if (Math.abs(m.lat - punto.lat) > dLat || Math.abs(m.lng - punto.lng) > dLng) continue

      const km = haversineKm(punto.lng, punto.lat, m.lng, m.lat)
      if (km > RADIO_KM) continue

      const minNuevo = kmAMinutos(km)
      const minActual = m[isoField]
      // Solo mejora si el nuevo equipamiento queda más cerca (menos minutos)
      if (minNuevo >= minActual) continue

      const accBase = m.accBase
      // El score nuevo es el mejor entre el base y el que produce el menor tiempo.
      // Modelamos la mejora como la diferencia de la curva entre tiempo actual y nuevo,
      // aplicada sobre el score base (para no romper su calibración original).
      const ganancia = minutosAScore(minNuevo) - minutosAScore(minActual)
      if (ganancia <= 0.0001) continue

      const accNueva = Math.min(1, accBase + ganancia)
      const delta = accNueva - accBase
      if (delta <= 0.0001) continue

      afectadas.push({ id: m.id, accBase, accNueva, delta })
      sumaDelta += delta
      if (delta > maxDelta) maxDelta = delta
    }

    const n = afectadas.length
    const resumen = {
      beneficiadas: n,
      mejoraPromedio: n ? sumaDelta / n : 0,
      mejoraMaxima: maxDelta,
      mejoraTotal: sumaDelta,
      tipo,
      radioKm: RADIO_KM,
    }

    return { afectadas, resumen }
  }

  return {
    cargando,
    error,
    manzanas,
    atlasGeo,
    cargarDatos,
    simular,
  }
}
