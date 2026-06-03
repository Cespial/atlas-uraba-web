<template>
  <!-- Leyenda dinámica: cambia según la capa activa. Oculta en mobile sin prop -->
  <div class="map-legend" :class="{ 'legend-mobile': isMobile }">

    <!-- Leyenda prioridad de inversión -->
    <template v-if="showPrioridad">
      <div class="leg-header">
        <span class="leg-title">Prioridad inversión</span>
      </div>
      <div class="leg-items">
        <div v-for="p in prioridades" :key="p.label" class="leg-row">
          <span class="leg-dot" :style="{ background: p.color }" />
          <span class="leg-label">{{ p.label }}</span>
          <span class="leg-count">{{ p.count }}</span>
        </div>
      </div>
    </template>

    <!-- Leyenda por defecto: Índice Atlas -->
    <template v-else>
      <div class="leg-header">
        <span class="leg-title">Índice Atlas</span>
        <span class="leg-range">0–100</span>
      </div>
      <div class="leg-grad" />
      <div class="leg-labels">
        <span style="color:#d73027">Crítico</span>
        <span style="color:#1a9850">Excelente</span>
      </div>
      <!-- Solo rangos en desktop — mobile queda compacta -->
      <div class="leg-items leg-items--desktop">
        <div v-for="r in rangos" :key="r.label" class="leg-row">
          <span class="leg-dot" :style="{ background: r.color }" />
          <span class="leg-label">{{ r.label }}</span>
          <span class="leg-count">{{ r.range }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

const props = defineProps({
  activeLayers: { type: Object, default: () => new Set() },
})

// En mobile se muestra también (versión pequeña sobre el peek bar)
const isMobile = computed(() => process.client && window.innerWidth < 640)

const showPrioridad = computed(() =>
  props.activeLayers?.has?.('prioridad-inversion') || false
)

const rangos = [
  { color: '#1a9850', label: 'Excelente', range: '85–100' },
  { color: '#66bd63', label: 'Alto',      range: '70–85'  },
  { color: '#a6d96a', label: 'Medio-alto',range: '55–70'  },
  { color: '#fdae61', label: 'Medio-bajo',range: '40–55'  },
  { color: '#f46d43', label: 'Bajo',      range: '20–40'  },
  { color: '#d73027', label: 'Crítico',   range: '0–20'   },
]

const prioridades = [
  { color: '#dc2626', label: 'Crítica', count: '454' },
  { color: '#f97316', label: 'Alta',    count: '1,418' },
  { color: '#eab308', label: 'Media',   count: '4,231' },
  { color: '#22c55e', label: 'Baja',    count: '925' },
]
</script>

<style scoped>
.map-legend {
  position: absolute;
  bottom: 36px;
  right: 12px;
  z-index: 20;
  width: 156px;
  background: rgba(22,27,34,0.94);
  backdrop-filter: blur(12px);
  border: 1px solid #30363D;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.45);
}

/* Mobile: lado IZQUIERDO sobre el peek bar — deja libre el right para sat/share */
@media (max-width: 639px) {
  .map-legend {
    bottom: calc(var(--sheet-peek, 80px) + 8px);
    right: auto;
    left: 8px;
    width: 130px;
  }
}

.leg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.leg-title {
  font-family: var(--ff-mono, monospace);
  font-size: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--ca, #1B6B6D);
}
.leg-range {
  font-family: var(--ff-mono, monospace);
  font-size: 8px;
  color: #555;
}
.leg-grad {
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #d73027, #f46d43, #fdae61, #a6d96a, #66bd63, #1a9850);
  margin-bottom: 4px;
}
.leg-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.leg-labels span {
  font-family: var(--ff-mono, monospace);
  font-size: 7px;
}
.leg-items { display: flex; flex-direction: column; gap: 4px; }
/* Rangos detallados solo en desktop */
@media (max-width: 639px) {
  .leg-items--desktop { display: none; }
}
.leg-row   { display: flex; align-items: center; gap: 6px; }
.leg-dot   { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.leg-label {
  font-family: var(--ff-mono, monospace);
  font-size: 8px;
  color: #8B949E;
  flex: 1;
}
.leg-count {
  font-family: var(--ff-mono, monospace);
  font-size: 8px;
  color: #555;
}

/* Oculto en desktop si el sidebar cubre ese área */
@media (min-width: 1024px) {
  .map-legend { bottom: 40px; right: 12px; }
}
</style>
