<template>
  <div v-if="municipios.length" class="mt-3">
    <div class="flex items-center justify-between mb-2">
      <div class="font-mono text-[8px] uppercase tracking-[0.15em] text-atlas-muted">
        Ranking regional
      </div>
      <button
        v-if="equidad"
        @click="ordenarPor = ordenarPor === 'score' ? 'gini' : 'score'"
        class="font-mono text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-white/10 text-atlas-muted hover:text-atlas-text transition-colors"
        :title="ordenarPor === 'score' ? 'Ordenar por desigualdad interna (Gini)' : 'Ordenar por score'"
      >
        {{ ordenarPor === 'score' ? 'score' : 'desigualdad' }}
      </button>
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
            :style="{ width: m.barPct + '%', background: m.color }"
          />
        </div>
        <span class="font-mono text-[9px] w-7 flex-shrink-0 text-right" :style="{ color: m.color }">
          {{ m.display }}
        </span>
      </div>
    </div>
    <p v-if="ordenarPor === 'gini'" class="font-mono text-[7.5px] text-atlas-muted mt-1.5 leading-snug">
      Gini interno del score v3 — mayor = más desigual entre manzanas.
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAtlasStore } from '~/stores/atlas'
import { useScoreScale } from '~/composables/useScoreScale'
import { useEquidad } from '~/composables/useEquidad'

const store = useAtlasStore()
const { scoreColor } = useScoreScale()
const { equidad } = useEquidad()

const ordenarPor = ref('score')   // 'score' | 'gini'

const municipios = computed(() => {
  const dim = store.dimension
  const rows = Object.entries(store.stats).map(([nombre, s]) => {
    const score = s.avg?.[dim] ?? 0
    const gini = equidad.value?.municipios?.[nombre]?.gini ?? null
    return {
      nombre,
      short: nombre.replace('San ', 'S.').replace(' de Urabá', '').replace(' de Antioquia', ''),
      score,
      gini,
    }
  })

  if (ordenarPor.value === 'gini' && equidad.value) {
    // Barra normalizada al Gini máximo del grupo para que el ranking sea legible.
    const maxG = Math.max(...rows.map(r => r.gini ?? 0), 0.0001)
    return rows
      .filter(r => r.gini != null)
      .sort((a, b) => b.gini - a.gini)
      .map(r => ({
        ...r,
        barPct: Math.round((r.gini / maxG) * 100),
        display: r.gini.toFixed(2),
        color: '#f46d43',
      }))
  }

  return rows
    .sort((a, b) => b.score - a.score)
    .map(r => ({
      ...r,
      barPct: Math.round(r.score * 100),
      display: String(Math.round(r.score * 100)),
      color: scoreColor(r.score),
    }))
})
</script>
