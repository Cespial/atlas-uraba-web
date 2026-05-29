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
         HEADER con soporte mobile
    ═══════════════════════════════════════════ -->
    <AppHeader
      :sheet-open="sheetOpen"
      @toggle-sheet="toggleSheet"
    />

    <!-- ═══════════════════════════════════════════
         TOGGLE SIDEBAR — solo tablet (640–1023px)
    ═══════════════════════════════════════════ -->
    <ClientOnly>
      <SidebarToggle :is-open="sidebarOpen" @toggle="toggleSidebar" />
    </ClientOnly>

    <!-- ═══════════════════════════════════════════
         SIDEBAR — oculto en mobile, colapsable en tablet
    ═══════════════════════════════════════════ -->
    <Transition name="slide-left">
      <SidePanel v-show="sidebarVisible" />
    </Transition>

    <!-- ═══════════════════════════════════════════
         MAPA PRINCIPAL — full-screen detrás de todo
    ═══════════════════════════════════════════ -->
    <ClientOnly>
      <AtlasMap
        :sidebar-open="sidebarVisible"
        @loaded="onMapLoaded"
        @error="onMapError"
      />
    </ClientOnly>

    <!-- ═══════════════════════════════════════════
         LEYENDA DEL MAPA — esquina superior derecha en mobile
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
         BOTTOM SHEET — solo mobile
    ═══════════════════════════════════════════ -->
    <ClientOnly>
      <MobileSheet
        ref="mobileSheetRef"
        @open="sheetOpen = true"
        @close="sheetOpen = false"
      />
    </ClientOnly>

    <!-- ═══════════════════════════════════════════
         FOOTER — banda de fuentes
    ═══════════════════════════════════════════ -->
    <AppFooter />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

const store = useAtlasStore()

const sheetOpen      = ref(false)
const sidebarOpen    = ref(true)   // tablet: sidebar abierto por defecto
const isMobile       = ref(false)
const isTablet       = ref(false)
const mobileSheetRef = ref(null)

function checkBreakpoint() {
  const w = window.innerWidth
  isMobile.value = w < 640
  isTablet.value = w >= 640 && w < 1024
}

const sidebarVisible = computed(() => {
  if (isMobile.value) return false        // nunca visible en mobile
  if (isTablet.value) return sidebarOpen.value
  return true                             // siempre visible en desktop
})

function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }
function toggleSheet()   { mobileSheetRef.value?.toggle() }

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

onMounted(() => {
  checkBreakpoint()
  window.addEventListener('resize', checkBreakpoint)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkBreakpoint)
})
</script>

<style scoped>
/* ─── Layout raíz ─────────────────────────────────────── */
.atlas-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--dk-bg, #0D1117);
  font-family: var(--ff-body);
}

/* ─── Transición fade (loading/error overlays) ────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ─── Transición slide-left (sidebar tablet) ──────────── */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.25s ease;
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
