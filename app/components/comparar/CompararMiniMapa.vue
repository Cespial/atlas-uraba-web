<template>
  <div class="minimapa">
    <div ref="el" class="minimapa-canvas" />
    <div v-if="!ready" class="minimapa-loading">
      <span class="spinner" /> cargando mapa…
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { MUNICIPIOS } from '~/stores/atlas'

const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark'

// Escala de score → teal Tensor (idéntica a useAtlasMap)
const COLOR_EXPR = [
  'interpolate', ['linear'],
  ['to-number', ['get', 'atlas_score'], 0],
  0.00, '#d73027',
  0.20, '#f46d43',
  0.40, '#fdae61',
  0.55, '#a8ddb5',
  0.70, '#41b6c4',
  0.85, '#1d91c0',
  1.00, '#1B6B6D',
]

const props = defineProps({
  municipio: { type: String, required: true },
})

const el = ref(null)
const ready = ref(false)
let map = null
let maplibregl = null

function configFor(nombre) {
  return MUNICIPIOS.find(m => m.nombre === nombre)
}

async function build() {
  if (!el.value || map) return
  maplibregl = (await import('maplibre-gl')).default
  const cfg = configFor(props.municipio) || { lat: 7.9, lng: -76.65, zoom: 11 }

  // Registrar protocolo PMTiles (independiente de useAtlasMap: este minimapa
  // puede montarse sin que el mapa principal haya cargado, p. ej. entrando
  // directo a /comparar).
  const { Protocol } = await import('pmtiles')
  const protocol = new Protocol()
  maplibregl.addProtocol('pmtiles', protocol.tile.bind(protocol))

  map = new maplibregl.Map({
    container: el.value,
    style: STYLE_DARK,
    center: [cfg.lng, cfg.lat],
    zoom: (cfg.zoom ?? 12) - 1.4,
    minZoom: 8,
    maxZoom: 15,
    attributionControl: false,
    interactive: true,
    dragRotate: false,
  })
  map.touchZoomRotate.disableRotation()
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

  map.on('load', async () => {
    // Misma fuente que el mapa principal (atlas.pmtiles) — evita re-descargar
    // atlas.geojson (7.3 MB) solo para el minimapa. Preflight HEAD + fallback
    // a GeoJSON: mismo patrón que useAtlasMap.js (loadAtlasLayer).
    let usePmtiles = true
    try {
      const head = await fetch('/data/atlas.pmtiles', { method: 'HEAD' })
      const ct = head.headers.get('content-type') || ''
      usePmtiles = head.ok && !ct.includes('text/html')
    } catch {
      usePmtiles = false
    }

    if (usePmtiles) {
      map.addSource('atlas-mini', {
        type: 'vector',
        url: 'pmtiles:///data/atlas.pmtiles',
        minzoom: 9,
        maxzoom: 14,
      })
    } else {
      map.addSource('atlas-mini', { type: 'geojson', data: '/data/atlas.geojson' })
    }
    const sourceLayerExtra = usePmtiles ? { 'source-layer': 'manzanas' } : {}

    map.addLayer({
      id: 'mini-fill',
      type: 'fill',
      source: 'atlas-mini',
      ...sourceLayerExtra,
      filter: ['==', ['get', 'municipio'], props.municipio],
      paint: {
        'fill-color': COLOR_EXPR,
        'fill-opacity': 0.82,
      },
    })
    map.addLayer({
      id: 'mini-stroke',
      type: 'line',
      source: 'atlas-mini',
      ...sourceLayerExtra,
      filter: ['==', ['get', 'municipio'], props.municipio],
      paint: {
        'line-color': 'rgba(255,255,255,0.12)',
        'line-width': 0.4,
      },
    })
    map.once('idle', () => { ready.value = true })
    // garantía
    setTimeout(() => { ready.value = true }, 3500)
  })
  map.on('error', () => { ready.value = true })
}

function recenter() {
  if (!map) return
  const cfg = configFor(props.municipio)
  if (cfg) map.flyTo({ center: [cfg.lng, cfg.lat], zoom: (cfg.zoom ?? 12) - 1.4, duration: 800 })
  for (const id of ['mini-fill', 'mini-stroke']) {
    if (map.getLayer(id)) map.setFilter(id, ['==', ['get', 'municipio'], props.municipio])
  }
}

onMounted(build)
watch(() => props.municipio, recenter)
onBeforeUnmount(() => { if (map) { map.remove(); map = null } })
</script>

<style scoped>
.minimapa {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  background: #0D1117;
  border: 1px solid var(--cb, #E5E5E0);
}
.minimapa-canvas { position: absolute; inset: 0; }
.minimapa-loading {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  color: rgba(255,255,255,0.7);
  font-family: var(--ff-mono, monospace);
  font-size: 11px;
  pointer-events: none;
}
.spinner {
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,0.25);
  border-top-color: #1B6B6D;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
