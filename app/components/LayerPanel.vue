<template>
  <div class="layer-panel" :class="{ 'panel-open': isOpen }">

    <!-- Trigger button -->
    <button class="lp-trigger" @click="isOpen = !isOpen">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="1.5" rx="0.75" fill="currentColor"/>
        <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor"/>
        <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" fill="currentColor"/>
      </svg>
      <span>Capas</span>
      <span v-if="activasCount > 0" class="lp-badge">{{ activasCount }}</span>
    </button>

    <!-- Panel -->
    <Transition name="lp-slide">
      <div v-if="isOpen" class="lp-panel">
        <!-- Header -->
        <div class="lp-header">
          <span class="lp-title">Capas del mapa</span>
          <button class="lp-close" @click="isOpen = false">×</button>
        </div>

        <!-- Vistas rápidas -->
        <div class="lp-section">
          <div class="lp-section-label">Vistas rápidas</div>
          <div class="lp-conjuntos">
            <button
              v-for="c in conjuntos"
              :key="c.id"
              class="lp-conjunto"
              :class="{ 'lp-conjunto--active': isConjuntoActive(c) }"
              :title="c.descripcion"
              @click="toggleConjunto(c)"
            >
              <span>{{ c.emoji }}</span>
              <span>{{ c.nombre }}</span>
            </button>
          </div>
        </div>

        <!-- Separador -->
        <div class="lp-divider" />

        <!-- Temas accordion -->
        <div class="lp-temas">
          <div v-for="tema in temas" :key="tema.id" class="lp-tema">
            <!-- Header del tema -->
            <button
              class="lp-tema-header"
              @click="toggleTema(tema.id)"
            >
              <span class="lp-tema-emoji">{{ tema.emoji }}</span>
              <div class="lp-tema-info">
                <span class="lp-tema-nombre">{{ tema.nombre }}</span>
                <span class="lp-tema-desc">{{ tema.descripcion }}</span>
              </div>
              <div class="lp-tema-right">
                <span v-if="activasEnTema(tema) > 0" class="lp-tema-badge">
                  {{ activasEnTema(tema) }}●
                </span>
                <span class="lp-chevron" :class="{ 'lp-chevron--open': temaAbierto === tema.id }">
                  ›
                </span>
              </div>
            </button>

            <!-- Capas del tema -->
            <Transition name="lp-expand">
              <div v-if="temaAbierto === tema.id" class="lp-capas">
                <button
                  v-for="capa in tema.capas"
                  :key="capa.id"
                  class="lp-capa"
                  :class="{
                    'lp-capa--active': activeLayers.has(capa.id),
                    'lp-capa--empty': sinDatos.has(capa.id)
                  }"
                  :title="sinDatos.has(capa.id) ? capa.pendiente || 'Datos pendientes de fuente oficial' : capa.label"
                  @click="$emit('toggle', capa.id)"
                >
                  <span class="lp-capa-dot" :style="{ background: capa.color }" />
                  <div class="lp-capa-info">
                    <span class="lp-capa-label">
                      {{ capa.label }}
                      <span v-if="sinDatos.has(capa.id)" class="lp-sin-datos">sin datos</span>
                      <span
                        v-else-if="dataStatusBadge(capa.id)"
                        class="lp-status-badge"
                        :class="'lp-status-badge--' + dataStatusBadge(capa.id).tipo"
                        :title="dataStatusBadge(capa.id).title"
                      >{{ dataStatusBadge(capa.id).texto }}</span>
                    </span>
                    <span class="lp-capa-desc">{{ capa.desc }}</span>
                  </div>
                  <span class="lp-capa-status">
                    {{ activeLayers.has(capa.id) ? '●' : '○' }}
                  </span>
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Footer -->
        <div class="lp-footer">
          <button class="lp-reset" @click="resetAll" v-if="activasCount > 2">
            Limpiar todo
          </button>
          <span class="lp-count">{{ activasCount }} capa{{ activasCount !== 1 ? 's' : '' }} activa{{ activasCount !== 1 ? 's' : '' }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Capas sin datos reales — geometrías vaciadas, pendientes de fuente oficial
// 'inundacion' NO va aquí: tiene 18 polígonos IDEAM TR50 reales (ver
// ideam_inundacion.geojson) y pinta correctamente — antes estaba marcada
// como "sin datos" por error (Fase C, corregido en Ola 2).
const sinDatos = new Set(['manglares', 'agua'])

const props = defineProps({
  activeLayers: { type: Object, default: () => new Set() }
})
const emit = defineEmits(['toggle', 'set-layers'])

const isOpen = ref(false)
const temaAbierto = ref('territorio')

// ── Datos de temas y capas ──────────────────────────────────
const temas = [
  {
    id: 'territorio', emoji: '🗺️', nombre: 'Territorio base',
    descripcion: 'Límites y redes geográficas de Urabá',
    capas: [
      { id: 'veredas',    label: 'Veredas',         desc: '611 límites veredales', color: 'rgba(255,255,255,0.3)' },
      { id: 'municipios', label: 'Municipios',       desc: '9 municipios con scores', color: 'rgba(255,255,255,0.5)' },
      { id: 'waterways',  label: 'Ríos y ciénagas', desc: 'Red hídrica Urabá', color: '#3B82F6' },
      { id: 'roads',      label: 'Red vial',        desc: 'Carreteras principales', color: '#F97316' },
    ]
  },
  {
    id: 'infraestructura', emoji: '🏗️', nombre: 'Infraestructura',
    descripcion: 'Puertos, vías y conectividad digital',
    capas: [
      { id: 'infraestructura', label: 'Puerto Antioquia', desc: 'Operativo feb 2026 · BID Invest', color: '#0ea5e9' },
      { id: 'tic',             label: 'Cobertura 4G',     desc: 'MinTIC 2023 por municipio', color: '#818cf8' },
    ]
  },
  {
    id: 'agricultura', emoji: '🍌', nombre: 'Agricultura',
    descripcion: 'Sector bananero, aptitud y producción agrícola',
    capas: [
      { id: 'eva-banano',  label: 'Producción banano',   desc: 'EVA MADR 2019-2024 · ha sembradas', color: '#F5E642' },
      { id: 'sipra',       label: 'Aptitud bananera',    desc: 'SIPRA UPRA · zonificación', color: '#00cc44' },
      { id: 'sipra-excl',  label: 'Zonas de exclusión',  desc: 'Restricciones legales de siembra', color: '#cc3333' },
      { id: 'fincas',      label: 'Fincas bananeras',    desc: '402 fincas georeferenciadas', color: '#F5E642' },
    ]
  },
  {
    id: 'ambiente', emoji: '🌿', nombre: 'Medio ambiente',
    descripcion: 'Ecosistemas, carbono, agua y deforestación',
    capas: [
      { id: 'manglares',    label: 'Manglares',           desc: 'Pendiente: Global Mangrove Watch 2020', color: '#166534', pendiente: 'Datos pendientes: Global Mangrove Watch 2020 shapefile (globalmangrovewatch.org)' },
      { id: 'carbono',      label: 'Carbono en bosques',  desc: '62.5 MtCO₂ · GFW 2020', color: '#4ade80' },
      { id: 'agua',         label: 'Calidad del agua',    desc: 'Pendiente: Corpourabá / IDEAM SIRH', color: '#3b82f6', pendiente: 'Datos pendientes: ICA ríos Corpourabá / IDEAM SIRH' },
      { id: 'deforestacion',label: 'Deforestación',       desc: 'Alertas SMByC · rojo=pérdida', color: '#dc2626' },
      { id: 'runap',        label: 'Áreas protegidas',    desc: '23 áreas RUNAP · Parques Nacionales', color: '#166534' },
    ]
  },
  {
    id: 'social', emoji: '👥', nombre: 'Gestión social',
    descripcion: 'Pobreza, etnias, conflicto y servicios públicos',
    capas: [
      { id: 'nbi',          label: 'NBI total (CNPV 2018)',        desc: 'Necesidades básicas insatisfechas · resumen 1 indicador · DANE CNPV 2018', color: '#f46d43' },
      { id: 'terridata-full', label: 'NBI total + desglose (CNPV 2018)',  desc: '9 municipios · mismo NBI total + cabecera/rural · 30 indicadores TerriData DNP', color: '#d73027' },
      { id: 'sui-servicios', label: 'Cobertura acueducto', desc: 'SUI Superservicios · acueducto/alcantarillado/aseo', color: '#1d91c0' },
      { id: 'uariv',        label: 'Desplazamiento',       desc: 'UARIV · expulsados por municipio', color: '#dc2626' },
      { id: 'resguardos-ant', label: 'Resguardos indígenas', desc: '20 resguardos · ANT oficial Embera/Tule', color: '#7c3aed' },
      { id: 'zomac',        label: 'ZOMAC',               desc: '7 municipios · beneficios tributarios', color: '#ea580c' },
      { id: 'reps',         label: 'Salud (prestadores)',  desc: '339 IPS geocodificadas · REPS', color: '#3B82F6' },
      { id: 'simat',        label: 'Colegios',            desc: '180 establecimientos · SIMAT', color: '#F59E0B' },
      { id: 'saber11',      label: 'Saber 11 (colegios)', desc: 'Puntaje global prom. 2022-2024 · ICFES Saber 11 2022-2024', color: '#8b5cf6' },
      { id: 'epidemiologia',label: 'Enf. tropicales',     desc: 'Dengue, malaria · SIVIGILA', color: '#f59e0b' },
      { id: 'irca',         label: 'Calidad de agua (IRCA)', desc: 'INS — SIVICAP · 2024 · 9 municipios', color: '#1a9850' },
    ]
  },
  {
    id: 'seguridad', emoji: '🛡️', nombre: 'Seguridad',
    descripcion: 'Homicidios reportados por municipio',
    capas: [
      { id: 'seguridad', label: 'Homicidios (tasa 100k)', desc: 'hechos reportados · SIEDCO/MinDefensa · 2024', color: '#de2d26' },
    ]
  },
  {
    id: 'riesgo', emoji: '⚠️', nombre: 'Riesgo territorial',
    descripcion: 'Amenazas naturales y vulnerabilidades',
    capas: [
      { id: 'inundacion',   label: 'Zonas inundables',    desc: 'IDEAM TR50 · período retorno 50 años', color: '#0066FF' },
    ]
  },
  {
    id: 'indicadores-v2', emoji: '🛰️', nombre: 'Indicadores v2',
    descripcion: 'GHSL · Sentinel-2 NDVI · Luminosidad satelital',
    capas: [
      { id: 'enriquecido-atlas-v2',          label: 'Atlas Score v2',        desc: 'Índice compuesto con GHSL + NDVI · 7.028 manzanas', color: '#06b6d4' },
      { id: 'enriquecido-accesibilidad-v2',  label: 'Accesibilidad v2',      desc: 'Densidad GHSL + distancia a equipamientos', color: '#38bdf8' },
      { id: 'enriquecido-ndvi',              label: 'Vegetación NDVI',        desc: 'Sentinel-2 · índice verde normalizado 2023', color: '#4ade80' },
      { id: 'enriquecido-ambiental-v2',      label: 'Ambiental v2',          desc: 'NDVI + cobertura vegetal + riesgo hídrico', color: '#86efac' },
      { id: 'enriquecido-impermeabilizacion',label: 'Impermeabilización',     desc: 'GHSL · superficie construida por manzana', color: '#7dd3fc' },
    ]
  },
  {
    id: 'transporte', emoji: '🛣️', nombre: 'Transporte y conectividad',
    descripcion: 'Red vial, isócronas de tiempo y aislamiento territorial',
    capas: [
      { id: 'red-vial',    label: 'Red vial primaria',     desc: '344 seg · trunk/primary/secondary · OSM + INVÍAS', color: '#f97316' },
      { id: 'red-vial-invias', label: 'Red Vial Nacional INVÍAS', desc: '11 troncales/transversales · OpenData INVÍAS', color: '#dc2626' },
      { id: 'aislamiento', label: 'Índice aislamiento',    desc: 'Conectividad compuesta por manzana · 4 niveles', color: '#dc2626' },
    ]
  },
  {
    id: 'conflicto', emoji: '⚡', nombre: 'Conflicto de uso',
    descripcion: 'Uso real vs vocación SIPRA · tensiones territoriales',
    capas: [
      { id: 'conflicto-uso',   label: 'Conflicto de uso suelo',  desc: '4.197 manzanas zona exclusión · 121 fincas conflicto', color: '#dc2626' },
      { id: 'corpouraba-agua', label: 'Concesiones agua',         desc: '371 concesiones subterráneas · CORPOURABÁ', color: '#3b82f6' },
    ]
  },
  {
    id: 'ordenamiento', emoji: '📐', nombre: 'Ordenamiento territorial',
    descripcion: 'Clasificación del suelo, perímetros y zonas funcionales',
    capas: [
      { id: 'prioridad-inversion', label: 'Prioridad de inversión', desc: '4 niveles · Crítica→Baja · 7.028 manzanas', color: '#f97316' },
      { id: 'catastro',            label: 'Catastro urbano',         desc: '5.468 manzanas · predios · GeoAntioquia LADM-COL', color: '#6366f1' },
      { id: 'clasificacion-suelo', label: 'Clasificación del suelo', desc: '7.028 manzanas CNPV · 6 categorías derivadas', color: '#FF8F00' },
      { id: 'zonas-funcionales',   label: 'Zonas funcionales',       desc: '9 municipios · clasificación por dimensiones', color: '#f59e0b' },
      { id: 'osm-landuse',         label: 'Usos del suelo OSM',      desc: '335 polígonos trazados · orchard, residencial, bosque', color: '#7CB342' },
      { id: 'equipamientos',       label: 'Equipamientos',           desc: '1.117 puntos · salud, educación, culto', color: '#E65C00' },
    ]
  },
]

const conjuntos = [
  {
    id: 'riesgo-ambiental', emoji: '🌊', nombre: 'Riesgo ambiental',
    descripcion: 'Ver amenazas naturales y estado de ecosistemas',
    capas: ['inundacion', 'manglares', 'agua', 'deforestacion']
  },
  {
    id: 'agro', emoji: '🍌', nombre: 'Agricultura',
    descripcion: 'Sector bananero: aptitud, fincas y producción',
    capas: ['sipra', 'fincas', 'eva-banano', 'sipra-excl']
  },
  {
    id: 'infraestructura', emoji: '🏗️', nombre: 'Infraestructura',
    descripcion: 'Puerto Antioquia, vías y conectividad',
    capas: ['infraestructura', 'roads', 'tic']
  },
  {
    id: 'social', emoji: '👥', nombre: 'Gestión social',
    descripcion: 'Pobreza, servicios y grupos étnicos',
    capas: ['nbi', 'uariv', 'resguardos-ant', 'reps', 'simat']
  },
]

// ── Computed ────────────────────────────────────────────────
const activasCount = computed(() => {
  const base = new Set(['veredas', 'municipios'])
  return [...props.activeLayers].filter(id => !base.has(id)).length
})

function activasEnTema(tema) {
  return tema.capas.filter(c => props.activeLayers.has(c.id)).length
}

function isConjuntoActive(conjunto) {
  return conjunto.capas.every(id => props.activeLayers.has(id))
}

function toggleTema(id) {
  temaAbierto.value = temaAbierto.value === id ? null : id
}

function toggleConjunto(conjunto) {
  const active = isConjuntoActive(conjunto)
  conjunto.capas.forEach(id => {
    const isOn = props.activeLayers.has(id)
    if (active && isOn) emit('toggle', id)
    else if (!active && !isOn) emit('toggle', id)
  })
}

function resetAll() {
  const base = new Set(['veredas', 'municipios'])
  ;[...props.activeLayers].forEach(id => {
    if (!base.has(id)) emit('toggle', id)
  })
}

/* ═══════════════════════════════════════════════════════════
   BADGE DE CALIDAD DE DATO — real vs proxy por capa
   Fuente: public/data/admin_data_status.json (fase de gestión
   de datos administrativos). Fail-quiet: si el JSON no carga o
   la capa no tiene entrada, no se muestra badge — el panel
   sigue funcionando igual.
═══════════════════════════════════════════════════════════ */
const adminDataStatus = ref(null)

// Mapea el id de capa del LayerPanel a la clave de "sources" del JSON.
// Solo se listan pares donde la capa realmente consume ese dataset
// (verificado contra las fuentes en useAtlasMap.js).
const CAPA_A_FUENTE = {
  catastro:          'igac_catastro',
  'corpouraba-agua':  'corpouraba_concesiones_agua',
}

// Traduce el "status" del JSON a real/proxy. Estados de gestión
// (petición redactada, no disponible) no producen badge — no hay
// datos reales ni proxy que mostrar todavía.
function tipoDeStatus(status) {
  if (status === 'disponible_api_activa' || status === 'disponible_descarga_manual') return 'real'
  if (status === 'proxy' || status === 'estimado') return 'proxy'
  return null
}

function formatCorte(fechaISO) {
  if (!fechaISO) return null
  const [anio, mes] = fechaISO.split('-')
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const idx = parseInt(mes, 10) - 1
  return meses[idx] ? `${meses[idx]} ${anio}` : anio
}

function dataStatusBadge(capaId) {
  const claveFuente = CAPA_A_FUENTE[capaId]
  if (!claveFuente || !adminDataStatus.value) return null

  const fuente = adminDataStatus.value.sources?.[claveFuente]
  if (!fuente) return null

  const tipo = tipoDeStatus(fuente.status)
  if (!tipo) return null

  const corte = formatCorte(adminDataStatus.value.generated)
  return {
    tipo,
    texto: corte ? `${tipo} · ${corte}` : tipo,
    title: `${fuente.name} — dato ${tipo}${corte ? ` · corte ${corte}` : ''}`,
  }
}

onMounted(async () => {
  try {
    const res = await fetch('/data/admin_data_status.json')
    if (!res.ok) return
    adminDataStatus.value = await res.json()
  } catch (e) {
    // Fail-quiet: el panel de capas queda intacto sin badges
    console.warn('[LayerPanel] admin_data_status:', e.message)
  }
})
</script>

<style scoped>
.layer-panel {
  position: absolute;
  bottom: 56px;
  left: calc(var(--atlas-panel-w, 320px) + 12px);
  z-index: 25;
}
/* En mobile el MobileSheet incluye la gestión de capas */
@media (max-width: 639px) {
  .layer-panel { display: none !important; }
}
@media (min-width: 640px) and (max-width: 1023px) {
  .layer-panel { left: calc(260px + 12px); }
}

/* Trigger */
.lp-trigger {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: 8px;
  background: rgba(22,27,34,0.94); backdrop-filter: blur(10px);
  border: 1px solid #30363D; color: #8B949E;
  font-family: var(--ff-mono); font-size: 9px;
  text-transform: uppercase; letter-spacing: 0.12em;
  cursor: pointer; transition: all 0.15s;
  position: relative;
}
.lp-trigger:hover,
.panel-open .lp-trigger {
  border-color: var(--ca,#1B6B6D); color: var(--ca,#1B6B6D);
}
.lp-badge {
  position: absolute; top: -5px; right: -5px;
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--ca,#1B6B6D); color: #fff;
  font-size: 8px; display: flex; align-items: center; justify-content: center;
  font-family: var(--ff-mono); font-weight: 600;
}

/* Panel */
.lp-panel {
  position: absolute; bottom: calc(100% + 8px); left: 0;
  width: 280px; max-height: 78vh;
  background: rgba(22,27,34,0.97); backdrop-filter: blur(14px);
  border: 1px solid #30363D; border-radius: 12px;
  display: flex; flex-direction: column;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  overflow: hidden;
}

.lp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px 8px;
  border-bottom: 1px solid #30363D;
  flex-shrink: 0;
}
.lp-title {
  font-family: var(--ff-mono); font-size: 9px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.18em; color: var(--ca,#1B6B6D);
}
.lp-close {
  width: 20px; height: 20px; border-radius: 4px; border: none;
  background: rgba(255,255,255,0.06); color: #8B949E; cursor: pointer;
  font-size: 14px; display: flex; align-items: center; justify-content: center;
  line-height: 1;
}
.lp-close:hover { background: rgba(255,255,255,0.12); color: #E6EDF3; }

/* Conjuntos rápidos */
.lp-section { padding: 8px 10px; flex-shrink: 0; }
.lp-section-label {
  font-family: var(--ff-mono); font-size: 7px; text-transform: uppercase;
  letter-spacing: 0.18em; color: #555; margin-bottom: 6px;
}
.lp-conjuntos { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.lp-conjunto {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 8px; border-radius: 6px;
  border: 1px solid #30363D; background: transparent; cursor: pointer;
  font-family: var(--ff-mono); font-size: 9px; color: #8B949E;
  transition: all 0.15s; text-align: left; letter-spacing: 0.04em;
}
.lp-conjunto:hover { border-color: var(--ca,#1B6B6D); color: #E6EDF3; background: rgba(27,107,109,0.1); }
.lp-conjunto--active { background: rgba(27,107,109,0.2); border-color: var(--ca,#1B6B6D); color: var(--ca,#1B6B6D); }

.lp-divider { height: 1px; background: #1e2738; flex-shrink: 0; }

/* Temas */
.lp-temas { overflow-y: auto; flex: 1; scrollbar-width: thin; scrollbar-color: #30363D transparent; }

.lp-tema-header {
  width: 100%; display: flex; align-items: flex-start; gap: 8px;
  padding: 9px 12px; border: none; background: transparent; cursor: pointer;
  text-align: left; transition: background 0.12s;
}
.lp-tema-header:hover { background: rgba(255,255,255,0.04); }

.lp-tema-emoji { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.lp-tema-info { flex: 1; min-width: 0; }
.lp-tema-nombre {
  display: block; font-family: var(--ff-mono); font-size: 10px; font-weight: 600;
  color: #E6EDF3; letter-spacing: 0.06em; text-transform: uppercase;
}
.lp-tema-desc {
  display: block; font-family: var(--ff-body); font-size: 10px;
  color: #555; margin-top: 1px; line-height: 1.3;
}
.lp-tema-right { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.lp-tema-badge { font-family: var(--ff-mono); font-size: 8px; color: var(--ca,#1B6B6D); }
.lp-chevron {
  font-size: 14px; color: #555; transition: transform 0.2s; display: inline-block;
  transform: rotate(0deg);
}
.lp-chevron--open { transform: rotate(90deg); }

/* Capas dentro del tema */
.lp-capas { padding: 2px 8px 8px 10px; }
.lp-capa {
  display: flex; align-items: flex-start; gap: 8px; width: 100%;
  padding: 6px 8px; border-radius: 6px; border: 1px solid transparent;
  background: transparent; cursor: pointer; text-align: left; transition: all 0.12s;
}
.lp-capa:hover { background: rgba(255,255,255,0.05); border-color: #30363D; }
.lp-capa--active { background: rgba(27,107,109,0.12); border-color: rgba(27,107,109,0.3); }

/* Capas sin datos */
.lp-capa--empty { opacity: 0.6; cursor: default; }
.lp-capa--empty:hover { background: rgba(255,255,255,0.02); border-color: #30363D; }
.lp-sin-datos {
  display: inline-block;
  margin-left: 4px;
  padding: 0 4px;
  border-radius: 2px;
  background: rgba(107,114,128,0.2);
  border: 1px solid rgba(107,114,128,0.35);
  color: #6b7280;
  font-family: var(--ff-mono);
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  vertical-align: middle;
  line-height: 14px;
}

/* Badge de calidad de dato — real (teal) vs proxy (ámbar) */
.lp-status-badge {
  display: inline-block;
  margin-left: 4px;
  padding: 0 4px;
  border-radius: 2px;
  font-family: var(--ff-mono);
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  vertical-align: middle;
  line-height: 14px;
  white-space: nowrap;
}
.lp-status-badge--real {
  background: rgba(27,107,109,0.18);
  border: 1px solid rgba(27,107,109,0.4);
  color: #2dd4d0;
}
.lp-status-badge--proxy {
  background: rgba(245,158,11,0.16);
  border: 1px solid rgba(245,158,11,0.4);
  color: #f59e0b;
}

.lp-capa-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; margin-top: 3px; }
.lp-capa--active .lp-capa-dot { box-shadow: 0 0 5px currentColor; }
.lp-capa-info { flex: 1; min-width: 0; }
.lp-capa-label {
  display: block; font-family: var(--ff-mono); font-size: 10px; color: #CBD5E0;
  font-weight: 500; letter-spacing: 0.04em;
}
.lp-capa-desc { display: block; font-family: var(--ff-body); font-size: 9px; color: #4a5568; margin-top: 1px; }
.lp-capa-status { font-size: 8px; color: #4a5568; flex-shrink: 0; margin-top: 3px; }
.lp-capa--active .lp-capa-status { color: var(--ca,#1B6B6D); }

/* Footer */
.lp-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-top: 1px solid #1e2738; flex-shrink: 0;
}
.lp-reset {
  font-family: var(--ff-mono); font-size: 8px; text-transform: uppercase;
  letter-spacing: 0.1em; color: #dc2626; background: none; border: none; cursor: pointer;
  padding: 0;
}
.lp-reset:hover { color: #ef4444; }
.lp-count { font-family: var(--ff-mono); font-size: 8px; color: #555; letter-spacing: 0.08em; }

/* Transición panel */
.lp-slide-enter-active, .lp-slide-leave-active { transition: all 0.22s cubic-bezier(0.32,0.72,0,1); }
.lp-slide-enter-from, .lp-slide-leave-to { opacity: 0; transform: translateY(10px) scale(0.97); }

/* Transición expand tema */
.lp-expand-enter-active, .lp-expand-leave-active { transition: all 0.18s ease; overflow: hidden; }
.lp-expand-enter-from, .lp-expand-leave-to { opacity: 0; max-height: 0; }
.lp-expand-enter-to, .lp-expand-leave-from { opacity: 1; max-height: 400px; }
</style>
