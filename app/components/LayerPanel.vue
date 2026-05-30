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
                  :class="{ 'lp-capa--active': activeLayers.has(capa.id) }"
                  @click="$emit('toggle', capa.id)"
                >
                  <span class="lp-capa-dot" :style="{ background: capa.color }" />
                  <div class="lp-capa-info">
                    <span class="lp-capa-label">{{ capa.label }}</span>
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
import { ref, computed } from 'vue'

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
      { id: 'manglares',    label: 'Manglares',           desc: '18,600 ha · estado por zona', color: '#166534' },
      { id: 'carbono',      label: 'Carbono en bosques',  desc: '62.5 MtCO₂ · GFW 2020', color: '#4ade80' },
      { id: 'agua',         label: 'Calidad del agua',    desc: 'ICA ríos · IDEAM-Corpourabá', color: '#3b82f6' },
      { id: 'deforestacion',label: 'Deforestación',       desc: 'Alertas SMByC · rojo=pérdida', color: '#dc2626' },
      { id: 'sinap',        label: 'Áreas protegidas',    desc: 'SINAP · reservas forestales', color: '#166534' },
    ]
  },
  {
    id: 'social', emoji: '👥', nombre: 'Gestión social',
    descripcion: 'Pobreza, etnias, conflicto y servicios públicos',
    capas: [
      { id: 'nbi',          label: 'Pobreza (NBI)',        desc: 'Necesidades básicas insatisfechas', color: '#f46d43' },
      { id: 'uariv',        label: 'Desplazamiento',       desc: 'UARIV · expulsados por municipio', color: '#dc2626' },
      { id: 'resguardos',   label: 'Resguardos indígenas', desc: 'Embera, Tule · ANT', color: '#7c3aed' },
      { id: 'zomac',        label: 'ZOMAC',               desc: '7 municipios · beneficios tributarios', color: '#ea580c' },
      { id: 'reps',         label: 'Salud (prestadores)',  desc: '339 IPS geocodificadas · REPS', color: '#3B82F6' },
      { id: 'simat',        label: 'Colegios',            desc: '180 establecimientos · SIMAT', color: '#F59E0B' },
      { id: 'epidemiologia',label: 'Enf. tropicales',     desc: 'Dengue, malaria · SIVIGILA', color: '#f59e0b' },
    ]
  },
  {
    id: 'riesgo', emoji: '⚠️', nombre: 'Riesgo territorial',
    descripcion: 'Amenazas naturales y vulnerabilidades',
    capas: [
      { id: 'inundacion',   label: 'Zonas inundables',    desc: 'IDEAM TR50 · período retorno 50 años', color: '#0066FF' },
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
    capas: ['nbi', 'uariv', 'resguardos', 'reps', 'simat']
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
</script>

<style scoped>
.layer-panel {
  position: absolute;
  bottom: 40px;
  left: calc(var(--atlas-panel-w, 320px) + 12px);
  z-index: 25;
}
@media (max-width: 639px) {
  .layer-panel { bottom: calc(var(--sheet-peek,80px) + 8px); left: 8px; }
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
