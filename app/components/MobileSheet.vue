<template>
  <div
    class="mobile-sheet"
    :class="{ 'sheet-open': isOpen }"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- Handle -->
    <div class="sheet-handle" @click="toggle" />

    <!-- Peek: siempre visible cuando cerrado -->
    <div class="sheet-peek-content" @click="!isOpen && toggle()">
      <div class="peek-row">
        <!-- Municipio activo + score -->
        <div class="peek-municipio">
          <span class="peek-label">{{ store.municipioActivo }}</span>
          <div class="peek-score-row">
            <span class="peek-score" :style="{ color: scoreColor(regionScore) }">
              {{ regionScore != null ? Math.round(regionScore * 100) : '—' }}
            </span>
            <span class="peek-score-unit">/ 100</span>
            <span class="peek-badge" :style="scoreBadgeStyle(regionScore)">
              {{ scoreLabel(regionScore) }}
            </span>
          </div>
        </div>

        <!-- Dimensión activa + toggle -->
        <div class="peek-right">
          <span class="peek-dim-dot" :style="{ background: store.dimensionActual?.color }" />
          <span class="peek-dim-label">{{ store.dimensionActual?.label?.split(' ')[0] }}</span>
          <button class="peek-toggle" @click.stop="toggle">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path :d="isOpen ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mini barra de score -->
      <div class="peek-progress">
        <div
          class="peek-progress-fill"
          :style="{
            width: (regionScore != null ? Math.round(regionScore*100) : 0) + '%',
            background: scoreColor(regionScore)
          }"
        />
      </div>
    </div>

    <!-- Contenido expandido -->
    <div v-show="isOpen" class="sheet-content">

      <!-- Dimensiones -->
      <div class="sheet-section">
        <div class="sheet-section-label">Dimensión</div>
        <div class="dim-pills">
          <button
            v-for="dim in dimensiones"
            :key="dim.key"
            @click="store.setDimension(dim.key)"
            class="dim-pill"
            :class="{ 'dim-pill--active': store.dimension === dim.key }"
            :style="store.dimension === dim.key ? { borderColor: dim.color, color: dim.color } : {}"
          >
            <span class="dim-pill-dot" :style="{ background: dim.color }" />
            {{ dim.label.split(' ')[0] }}
            <span v-if="dimScore(dim.key) != null" class="dim-pill-score" :style="{ color: dim.color }">
              {{ dimScore(dim.key) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Municipios -->
      <div class="sheet-section">
        <div class="sheet-section-label">Municipio</div>
        <div class="mun-grid">
          <button
            v-for="mun in municipios"
            :key="mun.nombre"
            @click="store.setMunicipio(mun.nombre); toggle()"
            class="mun-chip"
            :class="{ 'mun-chip--active': store.municipioActivo === mun.nombre }"
          >
            <span class="mun-chip-name">{{ mun.nombre === 'Todos' ? 'Todos' : mun.nombre.split(' de')[0] }}</span>
            <span
              v-if="munScore(mun.nombre)"
              class="mun-chip-score"
              :style="{ color: scoreColor(munScore(mun.nombre)/100) }"
            >{{ munScore(mun.nombre) }}</span>
          </button>
        </div>
      </div>

      <!-- Leyenda compacta -->
      <div class="sheet-section">
        <div class="sheet-section-label">Escala</div>
        <div class="legend-gradient" />
        <div class="legend-labels">
          <span>0 · Crítico</span>
          <span>100 · Excelente</span>
        </div>
        <div class="lisa-chips">
          <span v-for="z in zonas" :key="z.key" class="lisa-chip" :style="{ color: z.color, background: z.color+'18', border: '1px solid '+z.color+'44' }">
            {{ z.key }}
          </span>
        </div>
      </div>

      <!-- Fuentes -->
      <div class="sheet-footer">
        CNPV 2018 · REPS · SIMAT · OSM · Tensor 2025
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAtlasStore, DIMENSIONES, MUNICIPIOS } from '~/stores/atlas'

const emit = defineEmits(['open', 'close'])
const store = useAtlasStore()
const dimensiones = DIMENSIONES
const municipios  = MUNICIPIOS

const isOpen = ref(false)
const zonas = [
  { key: 'HH', color: '#1a9641' }, { key: 'LL', color: '#d7191c' },
  { key: 'HL', color: '#f39c12' }, { key: 'LH', color: '#3498db' },
]

// Touch drag
let touchStartY = 0
let startTransform = 0

function onTouchStart(e) {
  touchStartY = e.touches[0].clientY
}
function onTouchMove(e) {
  const dy = e.touches[0].clientY - touchStartY
  if (!isOpen.value && dy < -30) { isOpen.value = true; emit('open') }
  if (isOpen.value && dy > 60) { isOpen.value = false; emit('close') }
}
function onTouchEnd() { touchStartY = 0 }

function toggle() {
  isOpen.value = !isOpen.value
  emit(isOpen.value ? 'open' : 'close')
}

const regionScore = computed(() => {
  const m = store.municipioActivo
  if (m === 'Todos') {
    const all = Object.values(store.stats)
    if (!all.length) return null
    const total = all.reduce((s,v) => s+v.count, 0) || 1
    return all.reduce((s,v) => s+(v.avg?.atlas_score??0)*v.count, 0) / total
  }
  return store.stats[m]?.avg?.atlas_score ?? null
})

function scoreColor(v) {
  const n = +(v??0)
  if (n>=0.85) return '#1a9850'; if (n>=0.70) return '#66bd63'
  if (n>=0.55) return '#a6d96a'; if (n>=0.40) return '#fdae61'
  if (n>=0.20) return '#f46d43'; return '#d73027'
}
function scoreLabel(v) {
  const n = +(v??0)
  if (n>=0.85) return 'Excelente'; if (n>=0.70) return 'Alto'
  if (n>=0.55) return 'Medio-alto'; if (n>=0.40) return 'Medio-bajo'
  if (n>=0.20) return 'Bajo'; return 'Crítico'
}
function scoreBadgeStyle(v) {
  const c = scoreColor(v)
  return { color: c, background: c+'18', border: '1px solid '+c+'44',
           fontFamily: 'var(--ff-mono)', fontSize: '7px', letterSpacing: '0.1em',
           textTransform: 'uppercase', padding: '1px 5px', borderRadius: '3px' }
}
function munScore(nombre) {
  if (nombre === 'Todos') return null
  const s = store.stats[nombre]
  return s?.avg ? Math.round(s.avg.atlas_score*100) : null
}
function dimScore(key) {
  const m = store.municipioActivo
  if (m === 'Todos') return null
  const s = store.stats[m]
  return s?.avg ? Math.round((s.avg[key]??0)*100) : null
}

// Exponer toggle para el padre
defineExpose({ toggle, isOpen })
</script>

<style scoped>
.sheet-peek-content {
  padding: 4px 16px 12px;
  cursor: pointer;
}

.peek-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.peek-municipio { flex: 1; min-width: 0; }
.peek-label {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--ca, #1B6B6D);
  display: block;
  margin-bottom: 2px;
}
.peek-score-row { display: flex; align-items: baseline; gap: 4px; }
.peek-score {
  font-family: var(--ff-head);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.56px;
  line-height: 1;
}
.peek-score-unit {
  font-family: var(--ff-mono);
  font-size: 9px;
  color: var(--cm, #5F5F5B);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.peek-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.peek-dim-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.peek-dim-label {
  font-family: var(--ff-mono);
  font-size: 9px;
  color: var(--cm, #5F5F5B);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.peek-toggle {
  width: 28px; height: 28px;
  border-radius: 6px;
  border: 1px solid var(--cb, #E5E5E0);
  background: var(--cbg, #F2F1EE);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cm, #5F5F5B);
}

.peek-progress {
  width: 100%; height: 3px;
  background: var(--cb, #E5E5E0);
  border-radius: 2px;
  overflow: hidden;
}
.peek-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease, background 0.4s ease;
}

/* Sheet content */
.sheet-content { padding: 0 16px 32px; }

.sheet-section { margin-bottom: 20px; }
.sheet-section-label {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--ca, #1B6B6D);
  margin-bottom: 10px;
}

/* Dimension pills */
.dim-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dim-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
  border-radius: 20px;
  border: 1px solid var(--cb, #E5E5E0);
  background: transparent;
  cursor: pointer;
  font-family: var(--ff-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
  transition: all 0.15s;
}
.dim-pill--active { background: rgba(27,107,109,0.06); }
.dim-pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dim-pill-score { font-weight: 600; margin-left: 2px; }

/* Municipio grid */
.mun-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.mun-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid var(--cb, #E5E5E0);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}
.mun-chip--active {
  background: rgba(27,107,109,0.08);
  border-color: rgba(27,107,109,0.3);
}
.mun-chip-name {
  font-family: var(--ff-body, 'Inter');
  font-size: 12px;
  color: var(--c1, #1A1A1A);
}
.mun-chip-score {
  font-family: var(--ff-mono);
  font-size: 12px;
  font-weight: 600;
}

/* Leyenda */
.legend-gradient {
  width: 100%; height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, #d73027, #fdae61, #fee08b, #a6d96a, #1a9850);
  margin-bottom: 4px;
}
.legend-labels {
  display: flex;
  justify-content: space-between;
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  margin-bottom: 10px;
}
.lisa-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.lisa-chip {
  padding: 2px 7px;
  border-radius: 4px;
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.sheet-footer {
  padding-top: 16px;
  border-top: 1px solid var(--cb, #E5E5E0);
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
  text-align: center;
}
</style>
