<template>
  <div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-atlas-bg gap-5">
    <!-- Logo animado -->
    <div class="relative">
      <svg width="48" height="48" viewBox="0 0 36 36" fill="none" class="animate-spin-slow">
        <rect x="7" y="7" width="22" height="22" rx="2.5"
              stroke="#1B6B6D" stroke-width="1.8" stroke-opacity="0.4"
              transform="rotate(45 18 18)" />
      </svg>
      <svg width="48" height="48" viewBox="0 0 36 36" fill="none" class="absolute inset-0">
        <rect x="12" y="12" width="12" height="12" rx="1.5"
              fill="#1B6B6D" fill-opacity="0.9"
              transform="rotate(45 18 18)" />
      </svg>
    </div>

    <!-- Texto -->
    <div class="text-center">
      <p class="font-head font-semibold text-[16px] text-atlas-text tracking-[-0.32px]">
        Atlas Urabá
      </p>
      <p class="font-mono text-[9px] uppercase tracking-[0.18em] text-tensor-teal mt-1">
        Cargando 7,028 manzanas
      </p>
    </div>

    <!-- Progress bar -->
    <div class="w-40 h-[2px] bg-atlas-border rounded-full overflow-hidden">
      <div class="h-full bg-tensor-teal rounded-full skeleton" style="width: 100%" />
    </div>

    <p class="font-mono text-[8px] uppercase tracking-[0.1em] text-atlas-muted">
      CNPV 2018 · REPS · SIMAT · OSM
    </p>
  </div>
</template>

<script setup></script>

<style scoped>
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.animate-spin-slow { animation: spin-slow 3s linear infinite; }
</style>
