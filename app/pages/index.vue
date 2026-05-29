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
        ref="atlasMapRef"
        :sidebar-open="sidebarVisible"
        @loaded="onMapLoaded"
        @error="onMapError"
        @map-ready="onMapReady"
      />
    </ClientOnly>

    <!-- ═══════════════════════════════════════════
         CONTROLES DEL MAPA
    ═══════════════════════════════════════════ -->
    <ClientOnly>
      <!-- Leyenda Jenks/LISA -->
      <MapLegend />

      <!-- Toggle de capas contextuales + equipamientos -->
      <LayerToggle
        :active-layers="activeLayers"
        @toggle="onToggleLayer"
      />

      <!-- Toggle satélite / vectorial -->
      <SatelliteToggle
        :is-satellite="isSatellite"
        @toggle="onToggleSatellite"
      />

      <!-- Descarga CSV filtrado -->
      <DownloadButton />
    </ClientOnly>

    <!-- Geocoder de búsqueda -->
    <ClientOnly>
      <GeocoderSearch @fly-to="onGeocoderFlyTo" />
    </ClientOnly>

    <!-- Botón compartir -->
    <ClientOnly>
      <ShareButton />
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
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useAtlasStore } from '~/stores/atlas'
import { useRoute, useRouter } from 'vue-router'

const store  = useAtlasStore()
const route  = useRoute()
const router = useRouter()

// ─── Estado de UI ────────────────────────────────────────────────────────────
const sheetOpen      = ref(false)
const sidebarOpen    = ref(true)   // tablet: sidebar abierto por defecto
const isMobile       = ref(false)
const isTablet       = ref(false)
const mobileSheetRef = ref(null)
const atlasMapRef    = ref(null)

// ─── Estado del mapa ─────────────────────────────────────────────────────────
const mapHandles   = ref(null)      // { map, toggleLayer, toggleSatellite }
const activeLayers = reactive(new Set(['veredas', 'municipios']))
const isSatellite  = ref(false)

// ─── Breakpoints ─────────────────────────────────────────────────────────────
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

// ─── URL sync (Sprint B) ─────────────────────────────────────────────────────
function syncToURL() {
  const q = {}
  if (store.municipioActivo !== 'Todos')
    q.mun = store.municipioActivo.toLowerCase().replace(/ /g, '-')
  if (store.dimension !== 'atlas_score')
    q.dim = store.dimension
  router.replace({ query: Object.keys(q).length ? q : undefined }).catch(() => {})
}

function syncFromURL() {
  const { mun, dim } = route.query
  if (mun) {
    const found = store.municipios?.find(
      m => m.nombre.toLowerCase().replace(/ /g, '-') === mun
    )
    if (found) store.setMunicipio(found.nombre)
  }
  if (dim) store.setDimension(dim)
}

// ─── Callbacks del mapa ───────────────────────────────────────────────────────
function onMapLoaded() {
  syncFromURL()
}

function onMapError(msg) {
  store.setError(msg)
}

function onMapReady(handles) {
  mapHandles.value = handles
}

// ─── Toggle capas ─────────────────────────────────────────────────────────────
function onToggleLayer(id) {
  const newState = mapHandles.value?.toggleLayer(id)
  // Sincronizar estado reactivo del Set para la UI
  if (newState === true)        activeLayers.add(id)
  else if (newState === false)  activeLayers.delete(id)
  else {
    // Fallback si el composable no retorna estado
    if (activeLayers.has(id)) activeLayers.delete(id)
    else activeLayers.add(id)
  }
}

// ─── Toggle satélite ──────────────────────────────────────────────────────────
function onToggleSatellite() {
  const newVal = mapHandles.value?.toggleSatellite()
  if (newVal !== undefined) isSatellite.value = newVal
}

// ─── Geocoder flyTo ───────────────────────────────────────────────────────────
function onGeocoderFlyTo({ lat, lng, zoom, name }) {
  // Resetear municipio al buscar un lugar libre
  store.setMunicipio('Todos')
  // El mapa responde con flyTo via ref expuesto
  if (atlasMapRef.value?.flyToCoords) {
    atlasMapRef.value.flyToCoords(lat, lng, zoom)
  }
}

// ─── Watchers URL sync ────────────────────────────────────────────────────────
watch(() => store.municipioActivo, syncToURL)
watch(() => store.dimension, syncToURL)

// ─── Head dinámico ───────────────────────────────────────────────────────────
useHead({
  title: computed(() =>
    store.municipioActivo !== 'Todos'
      ? `${store.municipioActivo} — Atlas Urabá`
      : 'Atlas Urabá — Bienestar Humano Territorial'
  ),
  meta: [
    {
      name: 'description',
      content:
        'Índice de bienestar humano territorial por manzana para Urabá, Antioquia. 7,028 manzanas · 9 municipios · 10 indicadores reales.',
    },
  ],
})

// ─── Retry load ───────────────────────────────────────────────────────────────
function retryLoad() {
  store.error    = null
  store.cargando = true
  window.location.reload()
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
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
