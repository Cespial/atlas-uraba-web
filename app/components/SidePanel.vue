<template>
  <aside class="
    absolute left-0 top-0 h-full w-72 z-10 flex flex-col
    bg-atlas-panel/95 backdrop-blur-sm border-r border-atlas-border
    overflow-y-auto
  ">
    <!-- Header -->
    <div class="px-5 pt-5 pb-4 border-b border-atlas-border">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-2 h-2 rounded-full bg-atlas-accent animate-pulse" />
        <span class="text-xs text-atlas-muted font-medium uppercase tracking-widest">Atlas Urabá</span>
      </div>
      <h1 class="text-lg font-bold text-atlas-text leading-tight">
        Bienestar Humano<br>Territorial
      </h1>
      <p class="text-xs text-atlas-muted mt-1">
        7,028 manzanas · 8 municipios · 10 indicadores reales
      </p>
    </div>

    <!-- Selector municipio -->
    <div class="px-5 py-4 border-b border-atlas-border">
      <p class="text-xs text-atlas-muted uppercase tracking-wider mb-2 font-medium">Municipio</p>
      <div class="flex flex-col gap-1">
        <button
          v-for="mun in municipios"
          :key="mun.nombre"
          @click="store.setMunicipio(mun.nombre)"
          :class="[
            'text-left px-3 py-1.5 rounded-md text-sm transition-all duration-150',
            store.municipioActivo === mun.nombre
              ? 'bg-atlas-accent/20 text-atlas-accent font-semibold'
              : 'text-atlas-muted hover:text-atlas-text hover:bg-white/5'
          ]"
        >
          {{ mun.nombre }}
          <span v-if="munScore(mun.nombre)" class="float-right text-xs opacity-70">
            {{ munScore(mun.nombre) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Selector dimensión -->
    <div class="px-5 py-4 border-b border-atlas-border">
      <p class="text-xs text-atlas-muted uppercase tracking-wider mb-2 font-medium">Dimensión</p>
      <div class="flex flex-col gap-1">
        <button
          v-for="dim in dimensiones"
          :key="dim.key"
          @click="store.setDimension(dim.key)"
          :class="[
            'flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-all',
            store.dimension === dim.key
              ? 'bg-white/10 text-atlas-text font-semibold'
              : 'text-atlas-muted hover:text-atlas-text hover:bg-white/5'
          ]"
        >
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: dim.color }" />
          {{ dim.label }}
        </button>
      </div>
    </div>

    <!-- Stats municipio activo -->
    <div v-if="statsActivo" class="px-5 py-4 border-b border-atlas-border">
      <p class="text-xs text-atlas-muted uppercase tracking-wider mb-3 font-medium">
        {{ store.municipioActivo === 'Todos' ? 'Urabá' : store.municipioActivo }}
      </p>
      <div class="space-y-2.5">
        <div v-for="dim in dimensiones" :key="dim.key" class="flex items-center gap-2">
          <span class="text-xs text-atlas-muted w-20 flex-shrink-0">{{ dim.label.split(' ')[0] }}</span>
          <div class="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              class="h-1.5 rounded-full transition-all duration-500"
              :style="{ width: pct(statsActivo.avg?.[dim.key]), background: dim.color }"
            />
          </div>
          <span class="text-xs font-medium w-8 text-right" :style="{ color: dim.color }">
            {{ pct(statsActivo.avg?.[dim.key]) }}
          </span>
        </div>
      </div>
      <p class="text-xs text-atlas-muted mt-3">{{ statsActivo.count?.toLocaleString() }} manzanas</p>
    </div>

    <!-- Leyenda -->
    <div class="px-5 py-4">
      <p class="text-xs text-atlas-muted uppercase tracking-wider mb-2 font-medium">Índice 0–100</p>
      <div class="flex items-center gap-2">
        <span class="text-xs text-atlas-muted">0</span>
        <div class="flex-1 h-3 rounded-full" style="background: linear-gradient(to right, #d73027, #fdae61, #fee08b, #d9ef8b, #1a9850)" />
        <span class="text-xs text-atlas-muted">100</span>
      </div>
      <div class="flex justify-between mt-1 text-xs text-atlas-muted">
        <span>Crítico</span><span>Óptimo</span>
      </div>
      <!-- Zonas Atlas -->
      <p class="text-xs text-atlas-muted uppercase tracking-wider mb-2 mt-4 font-medium">Zonas Atlas (LISA)</p>
      <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div v-for="z in zonas" :key="z.key" class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-sm flex-shrink-0" :style="{ background: z.color }" />
          <span class="text-atlas-muted">{{ z.label }}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-auto px-5 py-3 border-t border-atlas-border text-xs text-atlas-muted">
      <p>CNPV 2018 · REPS · SIMAT · OSM</p>
      <p class="mt-0.5">© Atlas Urabá 2025</p>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore, DIMENSIONES, MUNICIPIOS } from '~/stores/atlas'

const store = useAtlasStore()
const dimensiones = DIMENSIONES
const municipios  = MUNICIPIOS

const zonas = [
  { key: 'HH', label: 'HH · Próspero',  color: '#1a9641' },
  { key: 'LL', label: 'LL · Crítico',    color: '#d7191c' },
  { key: 'HL', label: 'HL · Isla alta',  color: '#f39c12' },
  { key: 'LH', label: 'LH · Rezago',     color: '#3498db' },
  { key: 'NS', label: 'NS · No sig.',    color: '#555' },
]

const statsActivo = computed(() => {
  const m = store.municipioActivo
  if (m === 'Todos') {
    // Agregar todos
    const all = Object.values(store.stats)
    if (!all.length) return null
    const total = all.reduce((acc, s) => acc + s.count, 0)
    const avg = {}
    DIMENSIONES.forEach(d => {
      avg[d.key] = all.reduce((acc, s) => acc + (s.avg?.[d.key] || 0) * s.count, 0) / total
    })
    return { count: total, avg }
  }
  return store.stats[m] || null
})

function pct(v) {
  if (v == null) return '—'
  return Math.round(v * 100) + '%'
}

function munScore(nombre) {
  if (nombre === 'Todos') return null
  const s = store.stats[nombre]
  if (!s?.avg) return null
  return Math.round(s.avg.atlas_score * 100)
}
</script>
