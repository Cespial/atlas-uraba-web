<template>
  <div
    ref="mapRef"
    class="absolute inset-0"
    :style="{ left: 'var(--atlas-panel-w)', top: 'var(--atlas-header-h)' }"
  />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAtlasMap } from '~/composables/useAtlasMap'

const emit = defineEmits(['loaded', 'error'])
const mapRef = ref(null)
const { map, ready, initMap } = useAtlasMap(mapRef)

onMounted(async () => {
  if (!import.meta.client) return
  try {
    await initMap()
  } catch (e) {
    console.error('[Atlas] initMap error:', e)
    emit('error', e.message || 'Error al inicializar el mapa')
  }
})

onBeforeUnmount(() => {
  map.value?.remove()
})
</script>
