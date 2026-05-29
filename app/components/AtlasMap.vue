<template>
  <div
    ref="mapRef"
    class="absolute inset-0"
    :style="{ left: 'var(--atlas-panel-w)', top: 'var(--atlas-header-h)' }"
  />
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAtlasMap } from '~/composables/useAtlasMap'

const emit = defineEmits(['loaded', 'error'])
const mapRef = ref(null)
const { map, ready, initMap } = useAtlasMap(mapRef)

// Fix Bug 6: emitir 'loaded' cuando el composable marque ready
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

// Fix Bug 3: onBeforeUnmount eliminado — el composable maneja el cleanup en onUnmounted
</script>
