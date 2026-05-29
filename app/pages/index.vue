<template>
  <div class="atlas-root">

    <!-- ═══════════════════════════════════════════
         LOADING OVERLAY
    ═══════════════════════════════════════════ -->
    <Transition name="fade">
      <LoadingState v-if="store.cargando" />
    </Transition>

    <!-- ═══════════════════════════════════════════
         ERROR OVERLAY
    ═══════════════════════════════════════════ -->
    <Transition name="fade">
      <ErrorState
        v-if="store.error"
        :message="store.error"
        @retry="retryLoad"
      />
    </Transition>

    <!-- ═══════════════════════════════════════════
         HEADER — barra institucional fija
    ═══════════════════════════════════════════ -->
    <AppHeader />

    <!-- ═══════════════════════════════════════════
         SIDEBAR — panel de control izquierdo
    ═══════════════════════════════════════════ -->
    <SidePanel />

    <!-- ═══════════════════════════════════════════
         MAPA PRINCIPAL — full-screen detrás de todo
    ═══════════════════════════════════════════ -->
    <ClientOnly>
      <AtlasMap @loaded="onMapLoaded" @error="onMapError" />
    </ClientOnly>

    <!-- ═══════════════════════════════════════════
         LEYENDA DEL MAPA — esquina inferior derecha
    ═══════════════════════════════════════════ -->
    <ClientOnly>
      <MapLegend />
    </ClientOnly>

    <!-- ═══════════════════════════════════════════
         PANEL DETALLE MANZANA — se abre al click
    ═══════════════════════════════════════════ -->
    <ClientOnly>
      <ManzanaPanel />
    </ClientOnly>

    <!-- ═══════════════════════════════════════════
         FOOTER — banda de fuentes
    ═══════════════════════════════════════════ -->
    <AppFooter />

  </div>
</template>

<script setup>
import { useAtlasStore } from '~/stores/atlas'

const store = useAtlasStore()

useHead({
  title: 'Atlas Urabá — Bienestar Humano Territorial',
  meta: [
    {
      name: 'description',
      content:
        'Índice de bienestar humano territorial por manzana para Urabá, Antioquia. 7,028 manzanas · 8 municipios · 10 indicadores reales.',
    },
  ],
})

function onMapLoaded() {
  /* el store se actualiza internamente desde el composable */
}

function onMapError(msg) {
  store.setError(msg)
}

function retryLoad() {
  store.error = null
  store.cargando = true
  window.location.reload()
}
</script>

<style scoped>
/* ─── Layout raíz ─────────────────────────────────────── */
.atlas-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--dk-bg);
  font-family: var(--ff-body);
}

/* ─── Transición fade global ──────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
