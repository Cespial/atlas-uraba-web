<template>
  <div v-if="bars.length" class="mt-3">
    <div class="flex items-center justify-between mb-2">
      <span class="font-mono text-[8px] uppercase tracking-[0.15em] text-atlas-muted">
        Distribución
      </span>
      <span class="font-mono text-[8px] text-atlas-muted">{{ totalManzanas }} manzanas</span>
    </div>
    <div class="space-y-1">
      <div v-for="bar in bars" :key="bar.label" class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-sm flex-shrink-0" :style="{ background: bar.color }" />
        <span class="font-mono text-[8px] text-atlas-muted w-16 flex-shrink-0">
          {{ bar.label }}
        </span>
        <div class="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
          <div
            class="h-1.5 rounded-full transition-all duration-500"
            :style="{ width: bar.pct + '%', background: bar.color }"
          />
        </div>
        <span class="font-mono text-[8px] text-atlas-muted w-6 text-right">{{ bar.pct }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

const store = useAtlasStore()

const RANGES = [
  { label: 'Excelente', color: '#1a9850', min: 0.85, max: 1.01 },
  { label: 'Alto',      color: '#66bd63', min: 0.70, max: 0.85 },
  { label: 'Medio-alto',color: '#a6d96a', min: 0.55, max: 0.70 },
  { label: 'Medio-bajo',color: '#fdae61', min: 0.40, max: 0.55 },
  { label: 'Bajo',      color: '#f46d43', min: 0.20, max: 0.40 },
  { label: 'Crítico',   color: '#d73027', min: 0.00, max: 0.20 },
]

const totalManzanas = computed(() => {
  const m = store.municipioActivo
  if (m === 'Todos') return Object.values(store.stats).reduce((s,v) => s+v.count, 0)
  return store.stats[m]?.count ?? 0
})

const bars = computed(() => {
  const dim = store.dimension
  const m = store.municipioActivo
  const allStats = m === 'Todos'
    ? Object.values(store.stats)
    : [store.stats[store.municipioActivo]].filter(Boolean)
  // Fallback: usa distribución aproximada de avg por municipio
  const avgs = allStats.map(s => s.avg?.[dim] ?? 0)
  const total = avgs.length || 1

  return RANGES.map(r => {
    const cnt = avgs.filter(v => v >= r.min && v < r.max).length
    return { ...r, count: cnt, pct: Math.round(cnt / total * 100) }
  })
})
</script>
