// useMunicipioResumen.js — composable compartido para la ficha/resumen de un
// municipio. Unifica los fetches fail-quiet y los computeds que HOY estaban
// duplicados entre FichaMunicipal.vue (modal) y brief/[municipio].vue (PDF A4).
//
// ⚠️ Convención de fuentes — NO se "unifican" numéricamente, cada consumidor
// elige la que le corresponde y lo documenta en su propio archivo:
//   - gapEntry / gapAll   → gap_analysis.json   (score v1) — usa FichaMunicipal
//   - statsV3Avg / dimsV3 → atlas_stats_v31.json (score v3.1, Ola 2 adopción) — usa brief/[municipio]
// La reconciliación visual v1/v3 de la ficha es un pendiente conocido, fuera
// de alcance de este refactor.
//
// ⚠️ Nota Ola 2 (adopción v3.1): el archivo fuente de statsV3Avg/dimsV3 pasó de
// atlas_stats_v3.json a atlas_stats_v31.json (docs/investigacion/2026-07-07/
// impacto-v31.md). El mapa de manzanas (atlas.geojson) NO cambió — sigue en v3.
// atlas_stats_v31.json nombra sus campos con sufijo _v31 (atlas_score_v31,
// score_seguridad_v31) porque cambiaron de insumo/fórmula; accesibilidad/
// ambiental/socioeconómico no cambiaron y conservan su nombre v3. Para que
// brief/[municipio].vue y useMunicipiosSimilares no tengan que tocarse campo
// por campo, statsV3Avg re-expone explícitamente atlas_score_v3/score_seguridad
// (mapeo documentado abajo) apuntando a los valores v3.1 reales.
//
// Todos los fetches son fail-quiet (try/catch, null en error) y se cachean a
// nivel de módulo (singleton) — mismo patrón que useEquidad.js — así ambos
// consumidores comparten una sola petición de red por archivo, solo en cliente.

import { ref, computed, toValue } from 'vue'
import { useEquidad } from './useEquidad'

// ─── Caches a nivel de módulo (fetch una sola vez, compartido) ────────────
const gapData        = ref(null)   // gap_analysis.json
const benchmarksData = ref(null)   // benchmarks.json
const statsV3Data    = ref(null)   // atlas_stats_v31.json (Ola 2: reemplaza atlas_stats_v3.json)
const topData        = ref(null)   // top_prioridad.json
const evaData        = ref(null)   // eva_produccion_serie.json
const geoData        = ref(null)   // municipios.geojson (PDET)
const ircaData       = ref(null)   // irca_municipios.json
const seguridadData  = ref(null)   // seguridad_municipios.json

const gapLoaded       = ref(false)
const benchLoaded     = ref(false)
const statsV3Loaded   = ref(false)
const topLoaded       = ref(false)
const evaLoaded       = ref(false)
const geoLoaded       = ref(false)
const ircaLoaded      = ref(false)
const seguridadLoaded = ref(false)

const started = {}

async function fetchOnce(key, url, target, loadedRef) {
  if (started[key]) return
  started[key] = true
  try {
    const r = await fetch(url)
    target.value = r.ok ? await r.json() : null
  } catch (e) {
    console.error(`[useMunicipioResumen] error cargando ${url}:`, e)
    target.value = null
  } finally {
    loadedRef.value = true
  }
}

function cargarTodo() {
  if (!import.meta.client) return
  fetchOnce('gap', '/data/gap_analysis.json', gapData, gapLoaded)
  fetchOnce('bench', '/data/benchmarks.json', benchmarksData, benchLoaded)
  fetchOnce('statsV3', '/data/atlas_stats_v31.json', statsV3Data, statsV3Loaded)
  fetchOnce('top', '/data/top_prioridad.json', topData, topLoaded)
  fetchOnce('eva', '/data/eva_produccion_serie.json', evaData, evaLoaded)
  fetchOnce('geo', '/data/municipios.geojson', geoData, geoLoaded)
  fetchOnce('irca', '/data/irca_municipios.json', ircaData, ircaLoaded)
  fetchOnce('seguridad', '/data/seguridad_municipios.json', seguridadData, seguridadLoaded)
}

const NIVEL_RIESGO_ORDEN = ['Sin riesgo', 'Riesgo bajo', 'Riesgo medio', 'Riesgo alto', 'Inviable sanitariamente']

// Dimensiones v3 (0-1 en el dato crudo) — usadas por brief/[municipio] y por
// el cálculo de perfiles similares.
const DIMS_V3 = [
  { key: 'score_accesibilidad_v3',  label: 'Accesibilidad',  bench: 'score_accesibilidad' },
  { key: 'score_ambiental_v3',      label: 'Ambiental',      bench: 'score_ambiental' },
  { key: 'score_socioeconomico_v3', label: 'Socioeconómico', bench: 'score_socioeconomico' },
  { key: 'score_seguridad',         label: 'Seguridad',      bench: 'score_seguridad' },
]

export function useMunicipioResumen(nombreRef) {
  cargarTodo()
  const { equidad } = useEquidad()
  const nombre = () => toValue(nombreRef)

  // ── gap_analysis (v1) — fuente principal de FichaMunicipal ────────────
  const gapEntry = computed(() => {
    const n = nombre()
    if (!gapData.value || !n || n === 'Todos') return null
    return gapData.value[n] ?? null
  })

  const benchmarksRegion = computed(() => benchmarksData.value?.referencias ?? null)

  // ── stats v3.1 — fuente principal de brief/[municipio] ─────────────────
  // Mapeo EXPLÍCITO: atlas_stats_v31.json nombra el score compuesto y la
  // seguridad como atlas_score_v31/score_seguridad_v31 (cambiaron de fórmula);
  // se re-exponen aquí como atlas_score_v3/score_seguridad para que el resto
  // del composable y sus consumidores (brief, útil similares) seguir leyendo
  // los mismos nombres de siempre sin tocarse campo por campo. El valor real
  // ya es v3.1 — "v3" en estos nombres de variable es histórico, no literal.
  const statsV3Avg = computed(() => {
    const raw = statsV3Data.value?.municipios?.[nombre()]?.avg
    if (!raw) return null
    return {
      ...raw,
      atlas_score_v3: raw.atlas_score_v31 ?? raw.atlas_score_v3,
      score_seguridad: raw.score_seguridad_v31 ?? raw.score_seguridad,
    }
  })

  // ── años SIEDCO usados en el promedio de seguridad del municipio activo ─
  // (Ola 2, adopción v3.1): _meta.anios_usados_por_municipio de
  // atlas_stats_v31.json. <3 años ⇒ el municipio no tiene 2023 reportado
  // (ver docs/investigacion/2026-07-07/impacto-v31.md) — el brief usa esto
  // para mostrar la salvedad junto a la fila de seguridad.
  const aniosSeguridadV31 = computed(() =>
    statsV3Data.value?._meta?.anios_usados_por_municipio?.[nombre()] ?? []
  )

  const regionalScoreV3 = computed(() => {
    const munis = statsV3Data.value?.municipios ?? {}
    let totalCount = 0
    let weightedSum = 0
    for (const m of Object.values(munis)) {
      const c = m?.count ?? 0
      const s = m?.avg?.atlas_score_v31 ?? m?.avg?.atlas_score_v3 ?? 0
      totalCount += c
      weightedSum += c * s
    }
    return totalCount ? Math.round((weightedSum / totalCount) * 100) : null
  })

  const dimsV3 = computed(() => {
    const refs = benchmarksRegion.value ?? {}
    const avg = statsV3Avg.value ?? {}
    const pct = v => Math.round((v ?? 0) * 100)
    return DIMS_V3.map(d => {
      const mun = pct(avg[d.key])
      const uraba = pct(refs.uraba_promedio?.[d.bench])
      return {
        label: d.label,
        mun,
        uraba,
        antioquia: pct(refs.antioquia_promedio?.[d.bench]),
        colombia: pct(refs.colombia_promedio?.[d.bench]),
        color: mun >= uraba ? '#1a9850' : '#d73027',
      }
    })
  })

  // ── equidad interna (ya singleton vía useEquidad) ──────────────────────
  const equidadEntry = computed(() => {
    const n = nombre()
    if (!n || n === 'Todos') return null
    return equidad.value?.municipios?.[n] ?? null
  })

  // ── top 5 manzanas prioritarias (brief) ─────────────────────────────────
  const top5 = computed(() => (topData.value?.[nombre()] ?? []).slice(0, 5))

  // ── agro EVA — banano, último año con datos (brief) ────────────────────
  const agro = computed(() => {
    const n = nombre()
    const m = Object.values(evaData.value?.data ?? {}).find(x => x.municipio === n)
    const series = m?.cultivos?.Banano?.series
    if (!series) return null
    const anios = Object.keys(series).sort()
    if (!anios.length) return null
    const ult = anios[anios.length - 1]
    const arr = Array.isArray(series[ult]) ? series[ult] : [series[ult]]
    const produccion = arr.reduce((t, d) => t + (+d.produccion_ton || 0), 0)
    const area = arr.reduce((t, d) => t + (+d.area_sembrada_ha || 0), 0)
    const cosechada = arr.reduce((t, d) => t + (+d.area_cosechada_ha || 0), 0)
    if (!produccion) return null
    return { anio: ult, produccion, area, rendimiento: cosechada ? produccion / cosechada : 0 }
  })

  // ── satélite (LST/VIIRS), desde el promedio v3 del municipio (brief) ───
  const satelite = computed(() => {
    const a = statsV3Avg.value
    if (!a || (a.lst_c == null && a.viirs_rad == null)) return null
    return {
      lst: a.lst_c != null ? (Math.round(a.lst_c * 10) / 10).toLocaleString('es-CO') : '—',
      viirs: a.viirs_rad != null ? (Math.round(a.viirs_rad * 10) / 10).toLocaleString('es-CO') : '—',
    }
  })

  // ── PDET — subregión "Urabá Antioqueño" oficial (Decreto 893/2017) ─────
  const esPdet = computed(() => {
    const n = nombre()
    const features = geoData.value?.features ?? []
    const feature = features.find(f => f.properties?.municipio === (n || '').toUpperCase())
    return feature ? !!feature.properties.es_pdet : null
  })

  // ── IRCA (INS/SIVICAP): último año + tendencia vs. peor nivel previo ───
  const irca = computed(() => {
    const n = nombre()
    const serie = ircaData.value?.municipios?.[n]
    if (!serie) return null
    const anios = Object.keys(serie).sort()
    if (!anios.length) return null
    const ultimoAnio = anios[anios.length - 1]
    const actual = serie[ultimoAnio]
    if (actual?.irca == null || !actual?.nivel) return null

    let peorNivel = null
    let peorAnios = []
    for (const a of anios) {
      if (a === ultimoAnio) continue
      const nv = serie[a]?.nivel
      if (!nv) continue
      if (peorNivel == null || NIVEL_RIESGO_ORDEN.indexOf(nv) > NIVEL_RIESGO_ORDEN.indexOf(peorNivel)) {
        peorNivel = nv
        peorAnios = [a]
      } else if (nv === peorNivel) {
        peorAnios.push(a)
      }
    }
    let tendencia = ''
    if (peorNivel && NIVEL_RIESGO_ORDEN.indexOf(peorNivel) > NIVEL_RIESGO_ORDEN.indexOf(actual.nivel)) {
      const rango = peorAnios.length > 1 ? `${peorAnios[0]}-${peorAnios[peorAnios.length - 1].slice(-2)}` : peorAnios[0]
      tendencia = `${n} pasó de ${peorNivel.toLowerCase()} (${rango}) a ${actual.nivel.toLowerCase()} (${ultimoAnio}). `
    }
    return { anio: ultimoAnio, valor: actual.irca, nivel: actual.nivel, tendencia }
  })

  // ── Seguridad trazable (MinDefensa/SIEDCO): solo último año COMPLETO ───
  // 2025/2026 quedan fuera por venir parciales (rezago administrativo).
  const seguridad = computed(() => {
    const serie = seguridadData.value?.municipios?.[nombre()]
    const d = serie?.['2024']
    if (d?.homicidios == null || d?.tasa_100k == null) return null
    return { anio: '2024', homicidios: d.homicidios, tasa: d.tasa_100k.toFixed(1) }
  })

  return {
    // datos crudos (compartidos) — para consumidores que necesitan iterar
    // sobre todos los municipios (p.ej. ranking en FichaMunicipal)
    gapData,
    statsV3Data,
    // estado de carga — para el gate de "Cargando…" en brief/[municipio]
    gapLoaded, benchLoaded, statsV3Loaded, topLoaded, evaLoaded,
    // derivados v1 (gap_analysis) — FichaMunicipal
    gapEntry, benchmarksRegion,
    // derivados v3.1 (atlas_stats_v31, Ola 2 adopción) — brief/[municipio]
    statsV3Avg, regionalScoreV3, dimsV3, aniosSeguridadV31,
    // compartidos entre ambos
    equidadEntry,
    // complementarios (brief) — fail-quiet, sin bloquear el resto
    top5, agro, satelite, esPdet, irca, seguridad,
  }
}

// ─── Perfiles similares (Ola 2, ítem B) ────────────────────────────────────
// Distancia euclidiana sobre las 4 dimensiones normalizadas del índice v3.1
// (0-1) entre municipios — patrón "Perfil territorial similar a X y Y"
// (DataMéxico). Usa el mismo cache de atlas_stats_v31.json de este módulo.
// Lee los campos crudos de municipios[].avg directo (sin pasar por el mapeo
// de statsV3Avg), por eso score_seguridad_v31 va explícito con su sufijo.
const DIMS_SIMILARES = ['score_accesibilidad_v3', 'score_ambiental_v3', 'score_socioeconomico_v3', 'score_seguridad_v31']

export function useMunicipiosSimilares(nombreRef) {
  cargarTodo()
  const nombre = () => toValue(nombreRef)

  const similares = computed(() => {
    const munis = statsV3Data.value?.municipios ?? {}
    const n = nombre()
    const base = munis[n]?.avg
    if (!base) return []
    const vector = avg => DIMS_SIMILARES.map(k => avg?.[k] ?? 0)
    const v0 = vector(base)
    return Object.entries(munis)
      .filter(([m]) => m !== n)
      .map(([m, data]) => {
        const v = vector(data?.avg)
        const distancia = Math.sqrt(v.reduce((s, x, i) => s + (x - v0[i]) ** 2, 0))
        return { nombre: m, distancia }
      })
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 2)
  })

  return { similares, statsV3Loaded }
}
