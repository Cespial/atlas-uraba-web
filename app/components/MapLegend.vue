<template>
  <div class="absolute bottom-9 right-3 z-20 w-44
              bg-atlas-panel/92 backdrop-blur-md
              border border-atlas-border rounded-xl p-3
              shadow-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2.5">
      <span class="font-mono text-[8px] uppercase tracking-[0.15em] text-atlas-muted">
        Índice Atlas
      </span>
      <span class="font-mono text-[8px] text-atlas-muted">0–100</span>
    </div>

    <!-- Gradiente continuo -->
    <div class="h-2 rounded-full mb-2"
         style="background: linear-gradient(to right, #d73027, #f46d43, #fdae61, #a6d96a, #66bd63, #1a9850)" />

    <!-- Labels extremos -->
    <div class="flex justify-between mb-3">
      <span class="font-mono text-[8px] text-[#d73027]">Crítico</span>
      <span class="font-mono text-[8px] text-[#1a9850]">Excelente</span>
    </div>

    <!-- 6 rangos Jenks -->
    <div class="space-y-1">
      <div v-for="r in rangos" :key="r.label" class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" :style="{ background: r.color }" />
        <span class="font-mono text-[8px] text-atlas-muted flex-1">{{ r.label }}</span>
        <span class="font-mono text-[8px] text-atlas-muted">{{ r.range }}</span>
      </div>
    </div>

    <!-- Divider -->
    <div class="border-t border-atlas-border my-2.5" />

    <!-- Zonas Atlas -->
    <div class="font-mono text-[8px] uppercase tracking-[0.12em] text-atlas-muted mb-1.5">
      Zonas LISA
    </div>
    <div class="grid grid-cols-2 gap-x-2 gap-y-1">
      <div v-for="z in zonas" :key="z.key" class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-sm" :style="{ background: z.color }" />
        <span class="font-mono text-[8px] text-atlas-muted">{{ z.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const rangos = [
  { color: '#1a9850', label: 'Excelente', range: '85–100' },
  { color: '#66bd63', label: 'Alto',      range: '70–85' },
  { color: '#a6d96a', label: 'Medio-alto',range: '55–70' },
  { color: '#fdae61', label: 'Medio-bajo',range: '40–55' },
  { color: '#f46d43', label: 'Bajo',      range: '20–40' },
  { color: '#d73027', label: 'Crítico',   range: '0–20'  },
]
const zonas = [
  { key: 'HH', color: '#1a9641', label: 'HH Próspero' },
  { key: 'LL', color: '#d7191c', label: 'LL Crítico'  },
  { key: 'HL', color: '#f39c12', label: 'HL Isla'     },
  { key: 'LH', color: '#3498db', label: 'LH Rezago'   },
]
</script>
