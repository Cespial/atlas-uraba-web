import { ref, watch, onUnmounted } from 'vue'
import { useAtlasStore, COLOR_EXPR_TEMPLATE } from '~/stores/atlas'

let hoveredId = null
let selectedId = null

export function useAtlasMap(mapRef) {
  const store = useAtlasStore()
  const map = ref(null)
  const ready = ref(false)

  async function initMap() {
    const maplibregl = (await import('maplibre-gl')).default
    const { Protocol } = await import('pmtiles')

    // Registrar protocolo PMTiles globalmente (una sola vez)
    if (!maplibregl.config.REGISTERED_PROTOCOLS?.['pmtiles']) {
      const protocol = new Protocol()
      maplibregl.addProtocol('pmtiles', protocol.tile)
    }

    map.value = new maplibregl.Map({
      container: mapRef.value,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap · © CARTO',
          },
        },
        layers: [{ id: 'background', type: 'raster', source: 'carto-dark', paint: { 'raster-opacity': 0.7 } }],
      },
      center: [-76.65, 7.9],
      zoom: 9,
      minZoom: 8,
      maxZoom: 17,
    })

    const nav = new maplibregl.NavigationControl({ visualizePitch: false })
    map.value.addControl(nav, 'top-right')
    map.value.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')

    map.value.on('load', () => {
      loadAtlasLayer(maplibregl)
    })

    map.value.on('error', (e) => {
      console.warn('[Atlas] Map error:', e.error?.message)
    })
  }

  function loadAtlasLayer(maplibregl) {
    // Intentar PMTiles primero, fallback a GeoJSON si falla
    const usePMTiles = true

    if (usePMTiles) {
      map.value.addSource('atlas', {
        type: 'vector',
        url: 'pmtiles:///data/atlas.pmtiles',
        promoteId: 'cod_manzana',
        minzoom: 10,
        maxzoom: 14,
      })
    } else {
      map.value.addSource('atlas', {
        type: 'geojson',
        data: '/data/atlas.geojson',
        promoteId: 'cod_manzana',
      })
    }

    // Capa fill
    map.value.addLayer({
      id: 'manzanas-fill',
      type: 'fill',
      source: 'atlas',
      'source-layer': usePMTiles ? 'manzanas' : undefined,
      paint: {
        'fill-color': buildColorExpr(store.dimension),
        'fill-opacity': [
          'interpolate', ['linear'], ['zoom'],
          9, ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.7],
          14, ['case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.82],
        ],
      },
    })

    // Capa stroke
    map.value.addLayer({
      id: 'manzanas-stroke',
      type: 'line',
      source: 'atlas',
      'source-layer': usePMTiles ? 'manzanas' : undefined,
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], '#1B6B6D',
          ['boolean', ['feature-state', 'hover'], false], 'rgba(255,255,255,0.5)',
          'rgba(255,255,255,0.12)',
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], 2.5,
          ['boolean', ['feature-state', 'hover'], false], 1.5,
          ['interpolate', ['linear'], ['zoom'], 10, 0.3, 15, 0.8],
        ],
      },
    })

    // Tooltip
    const tooltip = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'atlas-tooltip',
      maxWidth: '280px',
      offset: [0, -8],
    })

    // Hover — featureState
    const sourceRef = usePMTiles
      ? { source: 'atlas', sourceLayer: 'manzanas' }
      : { source: 'atlas' }

    map.value.on('mousemove', 'manzanas-fill', (e) => {
      if (!e.features?.length) return
      map.value.getCanvas().style.cursor = 'pointer'

      const f = e.features[0]
      // Quitar hover anterior
      if (hoveredId !== null) {
        map.value.setFeatureState({ ...sourceRef, id: hoveredId }, { hover: false })
      }
      hoveredId = f.id ?? f.properties.cod_manzana
      map.value.setFeatureState({ ...sourceRef, id: hoveredId }, { hover: true })

      tooltip.setLngLat(e.lngLat).setHTML(buildTooltip(f.properties)).addTo(map.value)
    })

    map.value.on('mouseleave', 'manzanas-fill', () => {
      map.value.getCanvas().style.cursor = ''
      if (hoveredId !== null) {
        map.value.setFeatureState({ ...sourceRef, id: hoveredId }, { hover: false })
        hoveredId = null
      }
      tooltip.remove()
    })

    // Click — select
    map.value.on('click', 'manzanas-fill', (e) => {
      if (!e.features?.length) return
      const f = e.features[0]

      if (selectedId !== null) {
        map.value.setFeatureState({ ...sourceRef, id: selectedId }, { selected: false })
      }
      selectedId = f.id ?? f.properties.cod_manzana
      map.value.setFeatureState({ ...sourceRef, id: selectedId }, { selected: true })
      store.selectManzana(f.properties)
    })

    // Click en mapa vacío — deselect
    map.value.on('click', (e) => {
      const features = map.value.queryRenderedFeatures(e.point, { layers: ['manzanas-fill'] })
      if (!features.length) {
        if (selectedId !== null) {
          map.value.setFeatureState({ ...sourceRef, id: selectedId }, { selected: false })
          selectedId = null
        }
        store.clearManzana()
      }
    })

    // Calcular stats para el store cuando las tiles cargan
    map.value.on('sourcedata', (e) => {
      if (e.sourceId === 'atlas' && e.isSourceLoaded && !ready.value) {
        ready.value = true
        store.setLoaded()
      }
    })
  }

  // FIX CRÍTICO: índice 2 (no 1) es donde va el campo de datos
  function buildColorExpr(dim) {
    const scale = [
      'interpolate', ['linear'],
      ['to-number', ['get', dim], 0],  // <-- FIX: get the correct field
      0.0, '#d73027',
      0.2, '#f46d43',
      0.4, '#fdae61',
      0.55,'#a6d96a',
      0.7, '#66bd63',
      1.0, '#1a9850',
    ]
    return scale
  }

  function updateColor(dim) {
    if (!map.value || !ready.value) return
    try {
      map.value.setPaintProperty('manzanas-fill', 'fill-color', buildColorExpr(dim))
    } catch (e) {
      console.warn('[Atlas] updateColor error:', e)
    }
  }

  function flyTo(lat, lng, zoom) {
    map.value?.flyTo({ center: [lng, lat], zoom, duration: 1400, essential: true })
  }

  function setFilter(nombre) {
    if (!map.value || !ready.value) return
    const filter = nombre === 'Todos'
      ? null
      : ['==', ['get', 'municipio'], nombre]
    try {
      map.value.setFilter('manzanas-fill', filter)
      map.value.setFilter('manzanas-stroke', filter)
    } catch (e) {
      console.warn('[Atlas] setFilter error:', e)
    }
  }

  // Watchers reactivos
  watch(() => store.dimension, updateColor)
  watch(() => store.municipioActivo, (nombre) => {
    const cfg = store.municipioConfig
    if (cfg) flyTo(cfg.lat, cfg.lng, cfg.zoom)
    setFilter(nombre)
  })

  onUnmounted(() => {
    map.value?.remove()
    hoveredId = null
    selectedId = null
  })

  return { map, ready, initMap }
}

function buildTooltip(p) {
  const pct = (v) => v != null ? Math.round((+v || 0) * 100) : '—'
  const bar = (v, color = '#1B6B6D') => {
    const w = Math.round((+v || 0) * 100)
    return `<div style="background:#1e2738;border-radius:3px;height:3px;margin-top:2px">
      <div style="width:${w}%;height:3px;background:${color};border-radius:3px;transition:width .3s"></div></div>`
  }
  const scoreColor = (v) => {
    const n = +v || 0
    if (n >= 0.85) return '#1a9850'
    if (n >= 0.70) return '#66bd63'
    if (n >= 0.55) return '#a6d96a'
    if (n >= 0.40) return '#fdae61'
    if (n >= 0.20) return '#f46d43'
    return '#d73027'
  }
  return `<div style="font-family:'Inter',sans-serif;font-size:12px;color:#E6EDF3;min-width:220px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <div>
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:14px;color:#E6EDF3">${p.municipio || ''}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E;letter-spacing:0.08em;margin-top:1px">${(p.cod_manzana || '').slice(-8)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:22px;color:${scoreColor(p.atlas_score)};line-height:1">${pct(p.atlas_score)}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E;letter-spacing:0.12em;text-transform:uppercase">Score</div>
      </div>
    </div>
    ${bar(p.atlas_score, scoreColor(p.atlas_score))}
    <div style="margin-top:10px;display:grid;grid-template-columns:1fr auto;gap:3px 12px;font-size:11px">
      <span style="color:#8B949E;font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:0.1em">Accesibilidad</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#E6EDF3">${pct(p.score_accesibilidad)}</span>
      <span style="color:#8B949E;font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:0.1em">Ambiental</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#E6EDF3">${pct(p.score_ambiental)}</span>
      <span style="color:#8B949E;font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:0.1em">Socioeconómico</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#E6EDF3">${pct(p.score_socioeconomico)}</span>
      <span style="color:#8B949E;font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:0.1em">Seguridad</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#E6EDF3">${pct(p.score_seguridad)}</span>
    </div>
    <div style="margin-top:8px;display:flex;gap:6px;align-items:center">
      <span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E;text-transform:uppercase;letter-spacing:0.1em">Zona:</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#1B6B6D;font-weight:500">${p.zona_atlas || '—'}</span>
      <span style="color:#30363D">·</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E">${p.quintil || '—'}</span>
    </div>
  </div>`
}
