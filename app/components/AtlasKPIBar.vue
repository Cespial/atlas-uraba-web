<template>
  <div class="absolute z-20 flex items-center gap-0"
       :style="{ top: '100px', left: '0', right: '0', height: '36px' }">
    <!-- Solo visible en desktop, posicionado sobre el mapa al lado del sidebar -->
    <div class="ml-auto mr-4 flex items-center gap-4 px-4 py-1.5
                bg-atlas-panel/80 backdrop-blur-sm rounded-full
                border border-atlas-border/50">
      <KPIItem label="MANZANAS" :value="totalManzanas.toLocaleString('es')" />
      <div class="w-px h-3 bg-atlas-border" />
      <KPIItem label="MUNICIPIOS" value="8" />
      <div class="w-px h-3 bg-atlas-border" />
      <KPIItem label="INDICADORES" value="10" />
      <div class="w-px h-3 bg-atlas-border" />
      <KPIItem label="SCORE REGIÓN" :value="regionScore" :color="scoreColor" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

const store = useAtlasStore()

const totalManzanas = computed(() =>
  Object.values(store.stats).reduce((s, v) => s + v.count, 0) || 7028
)

const regionScore = computed(() => {
  const stats = Object.values(store.stats)
  if (!stats.length) return '—'
  const avg = stats.reduce((s, v) => s + (v.avg?.atlas_score ?? 0) * v.count, 0) /
               Math.max(stats.reduce((s,v) => s + v.count, 0), 1)
  return Math.round(avg * 100).toString()
})

const scoreColor = computed(() => {
  const n = +regionScore.value / 100
  if (n >= 0.7) return '#66bd63'
  if (n >= 0.5) return '#fdae61'
  return '#f46d43'
})
</script>
