<template>
  <div class="atlas-map-wrapper">
    <div ref="mapRef" class="atlas-map-inner" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAtlasMap } from '~/composables/useAtlasMap'

const props = defineProps({ sidebarOpen: { type: Boolean, default: true } })
const emit = defineEmits(['loaded', 'error', 'map-ready'])
const mapRef = ref(null)
const { map, ready, activeLayers, initMap, toggleLayer, toggleSatellite } = useAtlasMap(mapRef)

watch(ready, (val) => {
  if (val) {
    emit('loaded')
    // Exponer instancia del mapa y funciones de toggle al padre
    emit('map-ready', {
      map: map.value,
      toggleLayer,
      toggleSatellite,
    })
  }
})

// Exponer flyTo genérico para uso externo
function flyToCoords(lat, lng, zoom = 14) {
  map.value?.flyTo({ center: [lng, lat], zoom, duration: 1300, essential: true })
}

defineExpose({ toggleSatellite, toggleLayer, activeLayers, flyToCoords })

// Resize del mapa cuando el sidebar se colapsa/abre
watch(() => props.sidebarOpen, () => {
  setTimeout(() => map.value?.resize(), 300)
})

onMounted(async () => {
  if (!import.meta.client) return
  try { await initMap() }
  catch (e) {
    console.error('[Atlas] initMap error:', e)
    emit('error', e.message || 'Error al inicializar el mapa')
  }
})
</script>

<style scoped>
.atlas-map-wrapper {
  position: absolute;
  left: var(--atlas-panel-w, 320px);
  top: var(--atlas-header-h, 52px);
  right: 0;
  bottom: 28px;
  z-index: 0;
  transition: left 0.25s ease;
}

.atlas-map-inner {
  width: 100%;
  height: 100%;
}

/* Mobile: mapa ocupa toda la pantalla */
@media (max-width: 639px) {
  .atlas-map-wrapper {
    left: 0 !important;
    bottom: var(--sheet-peek, 80px);
  }
}
</style>
