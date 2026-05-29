<template>
  <div class="relative h-full w-full">
    <!-- Loading overlay -->
    <Transition name="fade">
      <div
        v-if="store.cargando"
        class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-atlas-dark gap-4"
      >
        <div class="w-10 h-10 border-2 border-atlas-accent/30 border-t-atlas-accent rounded-full animate-spin" />
        <div class="text-center">
          <p class="text-atlas-text font-semibold">Cargando Atlas Urabá</p>
          <p class="text-atlas-muted text-sm mt-1">7,028 manzanas · 8 municipios</p>
        </div>
      </div>
    </Transition>

    <!-- Mapa full-screen -->
    <ClientOnly>
      <AtlasMap />
    </ClientOnly>

    <!-- Panel lateral izquierdo -->
    <SidePanel />

    <!-- Panel detalle manzana -->
    <ClientOnly>
      <ManzanaPanel />
    </ClientOnly>

    <!-- Badge de fuentes -->
    <div class="absolute bottom-2 left-80 z-10 text-xs text-white/40 pl-2">
      CNPV 2018 · REPS MinSalud · SIMAT MEN · OSM Colombia · MGN DANE 2024
    </div>
  </div>
</template>

<script setup>
import { useAtlasStore } from '~/stores/atlas'
const store = useAtlasStore()

useHead({
  title: 'Atlas Urabá — Bienestar Humano Territorial',
})
</script>

<style>
/* Tooltip de MapLibre */
.atlas-tooltip .maplibregl-popup-content {
  background: #1a1a2e;
  border: 1px solid #2a2a45;
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}
.atlas-tooltip .maplibregl-popup-tip { display: none; }

/* Controles de mapa */
.maplibregl-ctrl-group {
  background: #161625 !important;
  border: 1px solid #2a2a45 !important;
}
.maplibregl-ctrl-group button {
  background: transparent !important;
  color: #94a3b8 !important;
}
.maplibregl-ctrl-group button:hover { background: rgba(255,255,255,0.05) !important; }

.fade-enter-active, .fade-leave-active { transition: opacity .4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
