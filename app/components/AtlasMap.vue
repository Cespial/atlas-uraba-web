<template>
  <div ref="mapRef" class="absolute inset-0" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAtlasMap } from '~/composables/useAtlasMap'

const mapRef = ref(null)
const { map, initMap } = useAtlasMap(mapRef)

onMounted(() => { if (import.meta.client) initMap() })
onBeforeUnmount(() => map.value?.remove())
</script>
