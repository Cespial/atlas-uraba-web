<template>
  <div v-if="municipios.length" class="mt-3">
    <div class="font-mono text-[8px] uppercase tracking-[0.15em] text-atlas-muted mb-2">
      Ranking regional
    </div>
    <div class="space-y-1.5">
      <div
        v-for="(m, i) in municipios"
        :key="m.nombre"
        @click="store.setMunicipio(m.nombre)"
        class="flex items-center gap-2 cursor-pointer group"
      >
        <span class="font-mono text-[8px] text-atlas-muted w-4 flex-shrink-0 text-right">
          {{ i + 1 }}
        </span>
        <span class="font-mono text-[8px] flex-1 truncate transition-colors"
              :class="store.municipioActivo === m.nombre ? 'text-tensor-teal' : 'text-atlas-muted group-hover:text-atlas-text'">
          {{ m.short }}
        </span>
        <div class="w-16 bg-white/5 rounded-full h-1 overflow-hidden flex-shrink-0">
          <div
            class="h-1 rounded-full transition-all duration-500"
            :style="{ width: Math.round(m.score * 100) + '%', background: scoreColor(m.score) }"
          />
        </div>
        <span class="font-mono text-[9px] w-5 flex-shrink-0 text-right"
              :style="{ color: scoreColor(m.score) }">
          {{ Math.round(m.score * 100) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore, DIMENSIONES } from '~/stores/atlas'

const store = useAtlasStore()

const municipios = computed(() => {
  const dim = store.dimension
  return Object.entries(store.stats)
    .map(([nombre, s]) => ({
      nombre,
      short: nombre.replace('San ', 'S.').replace(' de Urabá','').replace(' de Antioquia',''),
      score: s.avg?.[dim] ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
})

function scoreColor(v) {
  if (v >= 0.85) return '#1a9850'
  if (v >= 0.70) return '#66bd63'
  if (v >= 0.55) return '#a6d96a'
  if (v >= 0.40) return '#fdae61'
  if (v >= 0.20) return '#f46d43'
  return '#d73027'
}
</script>
