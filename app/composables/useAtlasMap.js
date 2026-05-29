import { ref, watch, onUnmounted } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

let hoveredId   = null
let selectedId  = null

export function useAtlasMap(mapRef) {
  const store = useAtlasStore()
  const map   = ref(null)
  const ready = ref(false)

  async function initMap() {
    const maplibregl = (await import('maplibre-gl')).default

    map.value = new maplibregl.Map({
      container: mapRef.value,
      // Estilo mínimo: fondo oscuro sin tiles externas (evita errores de CDN)
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'bg',
            type: 'background',
            paint: { 'background-color': '#0D1117' },
          },
        ],
      },
      center: [-76.65, 7.9],
      zoom: 9,
      minZoom: 7,
      maxZoom: 17,
      attributionControl: false,
    })

    map.value.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    )
    map.value.addControl(
      new maplibregl.NavigationControl({ visualizePitch: false }),
      'top-right'
    )
    map.value.addControl(
      new maplibregl.ScaleControl({ unit: 'metric' }),
      'bottom-right'
    )

    map.value.on('load', loadAtlasLayer)

    // setLoaded en cuanto el mapa esté idle (más confiable que sourcedata)
    map.value.once('idle', () => {
      if (!ready.value) {
        ready.value = true
        store.setLoaded()
      }
    })

    // Fallback: quitar loading a los 6 segundos máximo
    setTimeout(() => {
      if (!ready.value) {
        ready.value = true
        store.setLoaded()
      }
    }, 6000)

    map.value.on('error', (e) => {
      if (e.error?.message) console.warn('[Atlas]', e.error.message)
    })
  }

  function loadAtlasLayer() {
    // Fuente GeoJSON — carga completa, funciona a cualquier zoom
    map.value.addSource('atlas', {
      type: 'geojson',
      data: '/data/atlas.geojson',
      promoteId: 'cod_manzana',
    })

    // Capa fill
    map.value.addLayer({
      id: 'manzanas-fill',
      type: 'fill',
      source: 'atlas',
      paint: {
        'fill-color': buildColorExpr(store.dimension),
        'fill-opacity': 0.82,
      },
    })

    // Capa stroke — line-width como interpolate top-level (válido en MapLibre)
    map.value.addLayer({
      id: 'manzanas-stroke',
      type: 'line',
      source: 'atlas',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], '#1B6B6D',
          ['boolean', ['feature-state', 'hover'],   false], 'rgba(255,255,255,0.7)',
          'rgba(255,255,255,0.18)',
        ],
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          10, 0.3,
          14, 0.9,
          17, 2,
        ],
      },
    })

    // Inicializar interactividad
    setupInteraction()

    // Marcar como cargado también cuando el GeoJSON cargue (complementa idle)
    map.value.on('sourcedata', (e) => {
      if (e.sourceId === 'atlas' && e.isSourceLoaded && !ready.value) {
        ready.value = true
        store.setLoaded()
      }
    })

    // Calcular stats desde el GeoJSON una vez que cargue
    map.value.once('data', (e) => {
      if (e.sourceId === 'atlas' && e.dataType === 'source') {
        const features = map.value.querySourceFeatures('atlas')
        if (features.length > 0) computeStatsFromFeatures(features)
      }
    })
  }

  function setupInteraction() {
    const maplibregl = map.value.constructor // referencia a la clase

    const tooltip = new maplibregl.Popup({
      closeButton:  false,
      closeOnClick: false,
      className:    'atlas-tooltip',
      maxWidth:     '290px',
      offset:       [0, -6],
    })

    // Para GeoJSON source (sin source-layer)
    const src = { source: 'atlas' }

    map.value.on('mousemove', 'manzanas-fill', (e) => {
      if (!e.features?.length) return
      map.value.getCanvas().style.cursor = 'pointer'

      const f  = e.features[0]
      const id = f.id ?? f.properties?.cod_manzana

      if (hoveredId !== null && hoveredId !== id) {
        map.value.setFeatureState({ ...src, id: hoveredId }, { hover: false })
      }
      hoveredId = id
      map.value.setFeatureState({ ...src, id: hoveredId }, { hover: true })
      tooltip.setLngLat(e.lngLat).setHTML(buildTooltip(f.properties)).addTo(map.value)
    })

    map.value.on('mouseleave', 'manzanas-fill', () => {
      map.value.getCanvas().style.cursor = ''
      if (hoveredId !== null) {
        map.value.setFeatureState({ ...src, id: hoveredId }, { hover: false })
        hoveredId = null
      }
      tooltip.remove()
    })

    map.value.on('click', 'manzanas-fill', (e) => {
      if (!e.features?.length) return
      const f  = e.features[0]
      const id = f.id ?? f.properties?.cod_manzana

      if (selectedId !== null) {
        map.value.setFeatureState({ ...src, id: selectedId }, { selected: false })
      }
      selectedId = id
      map.value.setFeatureState({ ...src, id: selectedId }, { selected: true })
      store.selectManzana(f.properties)
    })

    // Click fuera — deseleccionar
    map.value.on('click', (e) => {
      const hits = map.value.queryRenderedFeatures(e.point, { layers: ['manzanas-fill'] })
      if (!hits.length && selectedId !== null) {
        map.value.setFeatureState({ ...src, id: selectedId }, { selected: false })
        selectedId = null
        store.clearManzana()
      }
    })
  }

  function computeStatsFromFeatures(features) {
    const byMun = {}
    const dims = ['atlas_score','score_accesibilidad','score_ambiental','score_socioeconomico','score_seguridad']
    features.forEach(f => {
      const p = f.properties
      if (!p) return
      const m = p.municipio || 'Desconocido'
      if (!byMun[m]) byMun[m] = { count: 0, sums: {} }
      byMun[m].count++
      dims.forEach(d => { byMun[m].sums[d] = (byMun[m].sums[d] || 0) + (+(p[d] ?? 0)) })
    })
    const stats = {}
    Object.entries(byMun).forEach(([mun, data]) => {
      stats[mun] = { count: data.count, avg: {} }
      dims.forEach(d => { stats[mun].avg[d] = data.sums[d] / data.count })
    })
    store.setStats(stats)
  }

  function buildColorExpr(dim) {
    return [
      'interpolate', ['linear'],
      ['to-number', ['get', dim], 0],
      0.00, '#d73027',
      0.20, '#f46d43',
      0.40, '#fdae61',
      0.55, '#a6d96a',
      0.70, '#66bd63',
      1.00, '#1a9850',
    ]
  }

  function updateColor(dim) {
    if (!map.value || !ready.value) return
    try {
      map.value.setPaintProperty('manzanas-fill', 'fill-color', buildColorExpr(dim))
    } catch (e) {
      console.warn('[Atlas] updateColor:', e.message)
    }
  }

  function flyTo(lat, lng, zoom) {
    map.value?.flyTo({ center: [lng, lat], zoom, duration: 1300, essential: true })
  }

  function setFilter(nombre) {
    if (!map.value || !ready.value) return
    const filter = nombre === 'Todos' ? null : ['==', ['get', 'municipio'], nombre]
    try {
      map.value.setFilter('manzanas-fill',  filter)
      map.value.setFilter('manzanas-stroke', filter)
    } catch (e) {
      console.warn('[Atlas] setFilter:', e.message)
    }
  }

  watch(() => store.dimension,       updateColor)
  watch(() => store.municipioActivo, (nombre) => {
    const cfg = store.municipioConfig
    if (cfg) flyTo(cfg.lat, cfg.lng, cfg.zoom)
    setFilter(nombre)
  })

  onUnmounted(() => {
    map.value?.remove()
    hoveredId  = null
    selectedId = null
  })

  return { map, ready, initMap }
}

// ─── Tooltip HTML ─────────────────────────────────────────────────────────────
function buildTooltip(p) {
  if (!p) return ''
  const pct = (v) => Math.round((+(v ?? 0)) * 100)
  const color = (v) => {
    const n = +(v ?? 0)
    if (n >= 0.85) return '#1a9850'
    if (n >= 0.70) return '#66bd63'
    if (n >= 0.55) return '#a6d96a'
    if (n >= 0.40) return '#fdae61'
    if (n >= 0.20) return '#f46d43'
    return '#d73027'
  }
  const bar = (v, c) => {
    const w = pct(v)
    return `<div style="background:#1e2738;border-radius:2px;height:3px;margin-top:2px">
      <div style="width:${w}%;height:3px;background:${c};border-radius:2px"></div></div>`
  }
  const zonaColors = { HH: '#1a9641', LL: '#d7191c', HL: '#f39c12', LH: '#3498db', NS: '#555' }
  const zc = zonaColors[p.zona_atlas] || '#555'
  const sc = color(p.atlas_score)

  return `<div style="font-family:'Inter',sans-serif;font-size:12px;color:#E6EDF3;min-width:230px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <div>
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:14px">${p.municipio || ''}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E;margin-top:1px">${(p.cod_manzana || '').slice(-10)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:24px;color:${sc};line-height:1">${pct(p.atlas_score)}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E;text-transform:uppercase;letter-spacing:.12em">Score</div>
      </div>
    </div>
    ${bar(p.atlas_score, sc)}
    <div style="margin-top:10px;display:grid;grid-template-columns:1fr auto;gap:3px 10px;font-size:11px">
      <span style="color:#8B949E;font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-family:'JetBrains Mono',monospace">Accesibilidad</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px">${pct(p.score_accesibilidad)}</span>
      <span style="color:#8B949E;font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-family:'JetBrains Mono',monospace">Ambiental</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px">${pct(p.score_ambiental)}</span>
      <span style="color:#8B949E;font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-family:'JetBrains Mono',monospace">Socioecon.</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px">${pct(p.score_socioeconomico)}</span>
      <span style="color:#8B949E;font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-family:'JetBrains Mono',monospace">Seguridad</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px">${pct(p.score_seguridad)}</span>
    </div>
    <div style="margin-top:8px;padding-top:6px;border-top:1px solid #30363D;display:flex;gap:8px;align-items:center">
      <span style="padding:1px 6px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;background:${zc}22;color:${zc};border:1px solid ${zc}44">${p.zona_atlas || '—'}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E">${p.quintil || '—'}</span>
    </div>
  </div>`
}
