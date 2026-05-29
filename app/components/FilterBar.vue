<template>
  <div class="absolute top-[52px] left-0 right-0 z-20 h-[48px]
              flex items-center gap-4 px-4
              bg-atlas-bg/90 backdrop-blur-sm border-b border-atlas-border/50">
    <!-- Label -->
    <span class="font-mono text-[8px] uppercase tracking-[0.15em] text-atlas-muted flex-shrink-0">
      Filtros
    </span>

    <!-- Score range -->
    <div class="flex items-center gap-2 flex-shrink-0">
      <span class="font-mono text-[8px] text-atlas-muted">Score</span>
      <input
        type="range" min="0" max="100" :value="Math.round(store.filterMin * 100)"
        @input="store.setFilterMin($event.target.value / 100)"
        class="atlas-range w-20"
      />
      <span class="font-mono text-[8px] text-tensor-teal w-6">{{ Math.round(store.filterMin * 100) }}</span>
      <span class="font-mono text-[8px] text-atlas-muted">–</span>
      <input
        type="range" min="0" max="100" :value="Math.round(store.filterMax * 100)"
        @input="store.setFilterMax($event.target.value / 100)"
        class="atlas-range w-20"
      />
      <span class="font-mono text-[8px] text-tensor-teal w-6">{{ Math.round(store.filterMax * 100) }}</span>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Zona Atlas filter -->
    <div class="flex items-center gap-1">
      <button
        v-for="z in zonas"
        :key="z.key"
        @click="toggleZona(z.key)"
        :class="[
          'px-2 py-0.5 rounded font-mono text-[8px] uppercase tracking-[0.1em] transition-all',
          store.zonaFilter.includes(z.key)
            ? 'border text-white'
            : 'border border-atlas-border text-atlas-muted hover:text-atlas-text',
        ]"
        :style="store.zonaFilter.includes(z.key) ? { borderColor: z.color, background: z.color + '33', color: z.color } : {}"
      >{{ z.key }}</button>
    </div>

    <!-- Reset -->
    <button
      v-if="hasFilters"
      @click="store.resetFilters()"
      class="font-mono text-[8px] uppercase tracking-[0.1em] text-atlas-muted
             hover:text-atlas-text transition-colors flex-shrink-0"
    >
      Reset
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

const store = useAtlasStore()

const zonas = [
  { key: 'HH', color: '#1a9641' },
  { key: 'LL', color: '#d7191c' },
  { key: 'HL', color: '#f39c12' },
  { key: 'LH', color: '#3498db' },
]

const hasFilters = computed(() =>
  store.filterMin > 0 || store.filterMax < 1 || store.zonaFilter.length < 5
)

function toggleZona(key) {
  store.toggleZonaFilter(key)
}
</script>

<style scoped>
.atlas-range {
  -webkit-appearance: none;
  height: 2px;
  background: #30363D;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.atlas-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #1B6B6D;
  cursor: pointer;
  transition: transform .15s;
}
.atlas-range::-webkit-slider-thumb:hover { transform: scale(1.3); }
</style>
