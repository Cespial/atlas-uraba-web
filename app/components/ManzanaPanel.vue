<template>
  <Transition name="slide-up">
    <div
      v-if="store.manzanaSeleccionada"
      class="absolute bottom-6 left-80 right-6 z-10 max-w-lg mx-auto
             bg-atlas-panel/95 backdrop-blur-sm border border-atlas-border
             rounded-xl p-4 shadow-2xl"
    >
      <div class="flex justify-between items-start mb-3">
        <div>
          <p class="text-xs text-atlas-muted uppercase tracking-widest">Manzana seleccionada</p>
          <h3 class="font-semibold text-atlas-text">{{ p.municipio }}</h3>
          <p class="text-xs text-atlas-muted font-mono">{{ p.cod_manzana }}</p>
        </div>
        <button @click="store.clearManzana()" class="text-atlas-muted hover:text-atlas-text text-lg leading-none">×</button>
      </div>

      <!-- Score principal -->
      <div class="flex items-center gap-3 mb-4">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2"
          :style="{ borderColor: scoreColor(p.atlas_score), color: scoreColor(p.atlas_score) }"
        >
          {{ Math.round((p.atlas_score ?? 0) * 100) }}
        </div>
        <div>
          <p class="text-sm text-atlas-muted">Atlas Score</p>
          <p class="text-xs">
            <span class="px-1.5 py-0.5 rounded text-xs font-medium" :style="zonaStyle(p.zona_atlas)">
              {{ p.zona_atlas || '—' }}
            </span>
            · {{ p.quintil || '—' }}
          </p>
        </div>
      </div>

      <!-- Dimensiones -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-2">
        <div v-for="dim in dimensiones" :key="dim.key">
          <div class="flex justify-between text-xs mb-0.5">
            <span class="text-atlas-muted">{{ dim.label }}</span>
            <span :style="{ color: dim.color }">{{ Math.round((p[dim.key] ?? 0) * 100) }}</span>
          </div>
          <div class="bg-white/5 rounded-full h-1 overflow-hidden">
            <div class="h-1 rounded-full" :style="{ width: Math.round((p[dim.key] ?? 0) * 100) + '%', background: dim.color }" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore, DIMENSIONES } from '~/stores/atlas'

const store = useAtlasStore()
const dimensiones = DIMENSIONES.filter(d => d.key !== 'atlas_score')
const p = computed(() => store.manzanaSeleccionada || {})

function scoreColor(v) {
  const pct = (v ?? 0) * 100
  if (pct >= 70) return '#4ade80'
  if (pct >= 40) return '#fbbf24'
  return '#f87171'
}

const zonaColors = { HH: '#1a9641', LL: '#d7191c', HL: '#f39c12', LH: '#3498db', NS: '#555' }
function zonaStyle(z) {
  const c = zonaColors[z] || '#555'
  return { background: c + '33', color: c, border: `1px solid ${c}66` }
}
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all .25s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(12px); }
</style>
