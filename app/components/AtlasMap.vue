<template>
  <!--
    Wrapper: posicionamiento absoluto fijo — MapLibre no puede tocarlo.
    Cuando MapLibre inicializa en mapRef (el div interno), cambia ese div
    a position:relative y lo puede redimensionar. El wrapper mantiene
    el área correcta sin importar lo que haga MapLibre.
  -->
  <div class="atlas-map-wrapper">
    <div ref="mapRef" class="atlas-map-inner" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAtlasMap } from '~/composables/useAtlasMap'

const emit = defineEmits(['loaded', 'error'])
const mapRef = ref(null)
const { map, ready, initMap } = useAtlasMap(mapRef)

watch(ready, (val) => { if (val) emit('loaded') })

onMounted(async () => {
  if (!import.meta.client) return
  try {
    await initMap()
  } catch (e) {
    console.error('[Atlas] initMap error:', e)
    emit('error', e.message || 'Error al inicializar el mapa')
  }
})
</script>

<style scoped>
/* Wrapper absoluto que define el área del mapa */
.atlas-map-wrapper {
  position: absolute;
  left: var(--atlas-panel-w, 320px);
  top: var(--atlas-header-h, 52px);
  right: 0;
  bottom: 28px;  /* altura AppFooter */
  z-index: 0;
}

/* Inner: MapLibre toma control de este div */
.atlas-map-inner {
  width: 100%;
  height: 100%;
}
</style>
