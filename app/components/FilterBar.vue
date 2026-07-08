<template>
  <div class="panel-section filter-section">
    <div class="section-label">
      <span class="label-index">{{ index }}</span>
      <span class="label-dash">—</span>
      <span>Filtros</span>
    </div>

    <!-- Rango de score -->
    <div class="filter-score">
      <div class="filter-score-header">
        <span class="filter-score-title">Rango de bienestar</span>
        <span class="filter-score-values">
          <span class="filter-score-val" :style="{ color: scoreColor(store.filterMin) }">
            {{ Math.round(store.filterMin * 100) }}
          </span>
          <span class="filter-score-sep">–</span>
          <span class="filter-score-val" :style="{ color: scoreColor(store.filterMax) }">
            {{ Math.round(store.filterMax * 100) }}
          </span>
        </span>
      </div>

      <div class="filter-range-wrap">
        <input
          type="range" min="0" max="100"
          :value="Math.round(store.filterMin * 100)"
          @input="store.setFilterMin($event.target.value / 100)"
          class="filter-range"
          aria-label="Score mínimo del rango de bienestar filtrado"
        />
        <input
          type="range" min="0" max="100"
          :value="Math.round(store.filterMax * 100)"
          @input="store.setFilterMax($event.target.value / 100)"
          class="filter-range"
          aria-label="Score máximo del rango de bienestar filtrado"
        />
      </div>
    </div>

    <!-- Zona LISA -->
    <div class="filter-zonas">
      <span class="filter-zonas-title">Zona LISA</span>
      <div class="filter-zonas-list" role="group" aria-label="Filtrar por zona LISA">
        <button
          v-for="z in zonas"
          :key="z.key"
          type="button"
          class="filter-zona-btn"
          :aria-pressed="store.zonaFilter.includes(z.key)"
          :aria-label="'Zona ' + z.key + ' — ' + z.label + (store.zonaFilter.includes(z.key) ? ' (filtro activo)' : '')"
          @click="toggleZona(z.key)"
          :style="store.zonaFilter.includes(z.key)
            ? { borderColor: z.color, background: z.color + '1F', color: z.color }
            : {}"
        >{{ z.key }}</button>
      </div>
    </div>

    <!-- Reset -->
    <button
      v-if="hasFilters"
      type="button"
      class="filter-reset"
      @click="store.resetFilters()"
    >
      Restablecer filtros
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

const props = defineProps({
  index: { type: [String, Number], default: '04' },
})

const store = useAtlasStore()

const zonas = [
  { key: 'HH', color: '#1a9641', label: 'Próspero' },
  { key: 'LL', color: '#d7191c', label: 'Crítico' },
  { key: 'HL', color: '#f39c12', label: 'Isla alta' },
  { key: 'LH', color: '#3498db', label: 'Rezago' },
]

const hasFilters = computed(() =>
  store.filterMin > 0 || store.filterMax < 1 || store.zonaFilter.length < 5
)

function toggleZona(key) {
  store.toggleZonaFilter(key)
}

/* ─── Colores escala Jenks (coherente con SidePanel) ─── */
function scoreColor(v) {
  const n = +v
  if (n >= 0.85) return '#1a9850'
  if (n >= 0.70) return '#66bd63'
  if (n >= 0.55) return '#a6d96a'
  if (n >= 0.40) return '#fdae61'
  if (n >= 0.20) return '#f46d43'
  return '#d73027'
}
</script>

<style scoped>
/* ─── Reutiliza el lenguaje visual de SidePanel (sección numerada) ─── */
.section-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ca, #1B6B6D);
  margin-bottom: 10px;
  line-height: 1;
}
.label-index { color: var(--ca, #1B6B6D); opacity: 0.7; }
.label-dash  { color: var(--cb, #E5E5E0); margin: 0 1px; }

/* ─── Rango de score ─────────────────────────────────── */
.filter-score { margin-bottom: 14px; }

.filter-score-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.filter-score-title {
  font-family: var(--ff-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cm, #5F5F5B);
}

.filter-score-values {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--ff-mono);
  font-size: 11px;
  font-weight: 700;
}

.filter-score-sep { color: var(--cm, #5F5F5B); font-weight: 400; }

.filter-range-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 3px;
  background: var(--cb, #E5E5E0);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.filter-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ca, #1B6B6D);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  cursor: pointer;
  transition: transform .15s;
}
.filter-range::-webkit-slider-thumb:hover { transform: scale(1.2); }

.filter-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ca, #1B6B6D);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  cursor: pointer;
}

/* Foco visible — accesibilidad de teclado */
.filter-range:focus-visible {
  outline: 2px solid var(--ca, #1B6B6D);
  outline-offset: 4px;
  border-radius: 2px;
}

/* ─── Zona LISA ───────────────────────────────────────── */
.filter-zonas { margin-bottom: 10px; }

.filter-zonas-title {
  display: block;
  font-family: var(--ff-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cm, #5F5F5B);
  margin-bottom: 6px;
}

.filter-zonas-list {
  display: flex;
  gap: 6px;
}

.filter-zona-btn {
  flex: 1;
  padding: 5px 0;
  border-radius: 5px;
  border: 1px solid var(--cb, #E5E5E0);
  background: transparent;
  color: var(--cm, #5F5F5B);
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s ease;
}
.filter-zona-btn:hover { border-color: var(--ca, #1B6B6D); color: var(--ca, #1B6B6D); }

.filter-zona-btn:focus-visible {
  outline: 2px solid var(--ca, #1B6B6D);
  outline-offset: 2px;
}

/* ─── Reset ───────────────────────────────────────────── */
.filter-reset {
  width: 100%;
  padding: 6px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
  text-align: left;
  transition: color 0.15s ease;
}
.filter-reset:hover { color: var(--ca, #1B6B6D); }
.filter-reset:focus-visible {
  outline: 2px solid var(--ca, #1B6B6D);
  outline-offset: 2px;
}
</style>
