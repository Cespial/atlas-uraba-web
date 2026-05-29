<template>
  <div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-atlas-bg gap-4">
    <div class="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
      <span class="text-red-400 text-xl">!</span>
    </div>
    <div class="text-center">
      <p class="font-head font-semibold text-atlas-text">Error al cargar</p>
      <p class="font-mono text-[9px] uppercase tracking-[0.15em] text-atlas-muted mt-1">{{ message }}</p>
    </div>
    <button
      @click="$emit('retry')"
      class="px-4 py-2 rounded-lg bg-tensor-teal/20 border border-tensor-teal/40
             text-tensor-teal font-mono text-[9px] uppercase tracking-[0.15em]
             hover:bg-tensor-teal/30 transition-colors"
    >
      Reintentar
    </button>
  </div>
</template>

<script setup>
defineProps({ message: { type: String, default: 'No se pudo conectar' } })
defineEmits(['retry'])
</script>
