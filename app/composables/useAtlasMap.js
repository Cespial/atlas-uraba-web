import { ref, watch, onUnmounted } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

// Estilos de mapa disponibles
const STYLE_DARK      = 'https://tiles.openfreemap.org/styles/dark'
const STYLE_SATELLITE = 'https://tiles.openfreemap.org/styles/positron'

export function useAtlasMap(mapRef) {
  const store = useAtlasStore()
  const map   = ref(null)
  const ready = ref(false)

  // Fix Bug 4: hoveredId/selectedId en scope del composable (no module-level)
  let hoveredId    = null
  let selectedId   = null
  // Fix Bug 5: guardar referencia al módulo maplibre-gl en el closure
  let _maplibregl  = null
  let isSatellite  = false

  // Registro de visibilidad de capas opcionales
  const layerVisibility = {
    veredas:    true,
    municipios: true,
    reps:       false,
    simat:      false,
  }

  // ─── Inicialización del mapa ────────────────────────────────────────────
  async function initMap() {
    // Fix Bug 5: asignar a closure var, no a const local
    _maplibregl = (await import('maplibre-gl')).default

    map.value = new _maplibregl.Map({
      container: mapRef.value,
      style: STYLE_DARK,
      center: [-76.65, 7.9],
      zoom: 9,
      minZoom: 7,
      maxZoom: 17,
      attributionControl: false,
    })

    map.value.addControl(
      new _maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    )
    map.value.addControl(
      new _maplibregl.NavigationControl({ visualizePitch: false }),
      'top-right'
    )
    map.value.addControl(
      new _maplibregl.ScaleControl({ unit: 'metric' }),
      'bottom-right'
    )

    map.value.on('load', loadAtlasLayer)

    // Fix Bug 2: NO registrar idle aquí — se registra en loadAtlasLayer()
    // para que dispare DESPUÉS de cargar el GeoJSON, no antes

    // Fallback de 8 segundos como garantía mínima
    setTimeout(() => {
      if (!ready.value) {
        ready.value = true
        store.setLoaded()
      }
    }, 8000)

    map.value.on('error', (e) => {
      if (e.error?.message) console.warn('[Atlas]', e.error.message)
    })
  }

  // ─── Carga de capas de datos ────────────────────────────────────────────
  function loadAtlasLayer() {
    map.value.addSource('atlas', {
      type: 'geojson',
      data: '/data/atlas.geojson',
      promoteId: '_fid',
    })

    map.value.addLayer({
      id: 'manzanas-fill',
      type: 'fill',
      source: 'atlas',
      paint: {
        'fill-color': buildColorExpr(store.dimension),
        'fill-opacity': 0.82,
      },
    })

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

    // ── Contexto geográfico: veredas y municipios ──────────────────────────
    map.value.addSource('veredas', {
      type: 'geojson',
      data: '/data/veredas.geojson',
    })

    map.value.addSource('municipios', {
      type: 'geojson',
      data: '/data/municipios.geojson',
    })

    map.value.addLayer({
      id: 'veredas-outline',
      type: 'line',
      source: 'veredas',
      layout: { visibility: 'visible' },
      paint: {
        'line-color': 'rgba(255,255,255,0.12)',
        'line-width': 0.8,
      },
    })

    map.value.addLayer({
      id: 'municipios-outline',
      type: 'line',
      source: 'municipios',
      layout: { visibility: 'visible' },
      paint: {
        'line-color': 'rgba(255,255,255,0.30)',
        'line-width': 1.2,
        'line-dasharray': [4, 2],
      },
    })

    map.value.addLayer({
      id: 'municipios-label',
      type: 'symbol',
      source: 'municipios',
      layout: {
        visibility: 'visible',
        'text-field': ['get', 'municipio'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          8, 10,
          12, 13,
        ],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
        'text-max-width': 8,
        'symbol-placement': 'point',
        'text-anchor': 'center',
      },
      paint: {
        'text-color': 'rgba(255,255,255,0.70)',
        'text-halo-color': 'rgba(13,17,23,0.85)',
        'text-halo-width': 1.5,
      },
      minzoom: 8,
    })

    // ── Equipamientos: REPS (salud) ────────────────────────────────────────
    map.value.addSource('reps', {
      type: 'geojson',
      data: '/data/reps.geojson',
    })

    map.value.addLayer({
      id: 'reps-points',
      type: 'circle',
      source: 'reps',
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, 3,
          13, 5,
          16, 7,
        ],
        'circle-color': '#3B82F6',
        'circle-opacity': 0.85,
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,255,0.4)',
      },
    })

    // ── Equipamientos: SIMAT (educacion) ──────────────────────────────────
    map.value.addSource('simat', {
      type: 'geojson',
      data: '/data/simat.geojson',
    })

    map.value.addLayer({
      id: 'simat-points',
      type: 'circle',
      source: 'simat',
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, 3,
          13, 5,
          16, 7,
        ],
        'circle-color': '#F59E0B',
        'circle-opacity': 0.85,
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,255,0.4)',
      },
    })

    // Fix Bug 5 aplicado aquí también: usa _maplibregl en vez de map.value.constructor
    setupInteraction(_maplibregl)

    // Stats cuando el GeoJSON cargue
    map.value.on('sourcedata', (e) => {
      if (e.sourceId === 'atlas' && e.isSourceLoaded && map.value.isStyleLoaded()) {
        requestAnimationFrame(() => {
          const features = map.value.querySourceFeatures('atlas')
          if (features.length > 0) computeStatsFromFeatures(features)
        })
      }
    })

    // Fix Bug 2: 'idle' registrado AQUÍ, después de agregar la source GeoJSON
    // Así dispara cuando el GeoJSON termina de renderizarse, no antes
    map.value.once('idle', () => {
      if (!ready.value) {
        ready.value = true
        store.setLoaded()
      }
    })
  }

  // ─── Toggle de capa (veredas / municipios / reps / simat) ───────────────
  function toggleLayer(id) {
    if (!map.value || !ready.value) return

    layerVisibility[id] = !layerVisibility[id]
    const vis = layerVisibility[id] ? 'visible' : 'none'

    // Mapa de id lógico → capas de mapa
    const layerMap = {
      veredas:    ['veredas-outline'],
      municipios: ['municipios-outline', 'municipios-label'],
      reps:       ['reps-points'],
      simat:      ['simat-points'],
    }

    const targets = layerMap[id] || []
    targets.forEach(layerId => {
      try {
        map.value.setLayoutProperty(layerId, 'visibility', vis)
      } catch (e) {
        console.warn('[Atlas] toggleLayer:', e.message)
      }
    })

    return layerVisibility[id]
  }

  // ─── Toggle satélite / vectorial ────────────────────────────────────────
  function toggleSatellite() {
    if (!map.value) return
    isSatellite = !isSatellite
    const newStyle = isSatellite ? STYLE_SATELLITE : STYLE_DARK

    // Guardar estado previo de visibilidad para restaurar tras recargar estilo
    const prevVisibility = { ...layerVisibility }

    map.value.once('styledata', () => {
      // Re-añadir capas de datos tras cambio de estilo base
      loadAtlasLayer()
      // Restaurar visibilidades
      Object.keys(prevVisibility).forEach(id => {
        if (!prevVisibility[id]) toggleLayer(id)
      })
    })

    map.value.setStyle(newStyle)
    return isSatellite
  }

  // ─── Interactividad (hover, click, tooltip) ─────────────────────────────
  function setupInteraction(maplibregl) {
    // Fix Bug 5: usar el maplibregl pasado como argumento — NO map.value.constructor
    const tooltip = new maplibregl.Popup({
      closeButton:  false,
      closeOnClick: false,
      className:    'atlas-tooltip',
      maxWidth:     '290px',
      offset:       [0, -6],
    })

    const src = { source: 'atlas' }

    map.value.on('mousemove', 'manzanas-fill', (e) => {
      if (!e.features?.length) return
      map.value.getCanvas().style.cursor = 'pointer'

      const f  = e.features[0]
      const id = f.id ?? f.properties?._fid

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
      const id = f.id ?? f.properties?._fid

      if (selectedId !== null) {
        map.value.setFeatureState({ ...src, id: selectedId }, { selected: false })
      }
      selectedId = id
      map.value.setFeatureState({ ...src, id: selectedId }, { selected: true })
      store.selectManzana(f.properties)
    })

    map.value.on('click', (e) => {
      const hits = map.value.queryRenderedFeatures(e.point, { layers: ['manzanas-fill'] })
      if (!hits.length && selectedId !== null) {
        map.value.setFeatureState({ ...src, id: selectedId }, { selected: false })
        selectedId = null
        store.clearManzana()
      }
    })

    // Tooltips para equipamientos
    setupEquipamientosInteraction(maplibregl)
  }

  // ─── Tooltips equipamientos ──────────────────────────────────────────────
  function setupEquipamientosInteraction(maplibregl) {
    const tooltipEq = new maplibregl.Popup({
      closeButton:  false,
      closeOnClick: false,
      className:    'atlas-tooltip',
      maxWidth:     '260px',
      offset:       [0, -4],
    })

    const eqLayers = [
      { id: 'reps-points',  color: '#3B82F6', nameField: 'NombreSede',              munField: 'MunicipioPrestadorDesc', extraField: 'ClasePrestadorDesc' },
      { id: 'simat-points', color: '#F59E0B', nameField: 'nombreestablecimiento',    munField: 'nombremunicipio',        extraField: 'zona' },
    ]

    eqLayers.forEach(({ id, color, nameField, munField, extraField }) => {
      map.value.on('mousemove', id, (e) => {
        if (!e.features?.length) return
        map.value.getCanvas().style.cursor = 'pointer'
        const p = e.features[0].properties
        tooltipEq.setLngLat(e.lngLat).setHTML(buildEquipamientoTooltip(p, color, nameField, munField, extraField)).addTo(map.value)
      })
      map.value.on('mouseleave', id, () => {
        map.value.getCanvas().style.cursor = ''
        tooltipEq.remove()
      })
    })
  }

  // ─── Stats desde features del viewport ──────────────────────────────────
  function computeStatsFromFeatures(features) {
    const dims = ['atlas_score','score_accesibilidad','score_ambiental','score_socioeconomico','score_seguridad']
    const byMun = {}
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
    if (Object.keys(stats).length > 0) store.setStats(stats)
  }

  // ─── Expresión de color para MapLibre ───────────────────────────────────
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
      map.value.setFilter('manzanas-fill',   filter)
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

  // Fix Bug 3: solo un remove() — aquí en el composable
  onUnmounted(() => {
    map.value?.remove()
    map.value   = null
    hoveredId   = null
    selectedId  = null
    _maplibregl = null
  })

  return { map, ready, initMap, toggleLayer, toggleSatellite }
}

// ─── Tooltip manzana HTML ─────────────────────────────────────────────────────
function buildTooltip(p) {
  if (!p) return ''
  const pct = (v) => Math.round((+(v ?? 0)) * 100)
  const col = (v) => {
    const n = +(v ?? 0)
    if (n >= 0.85) return '#1a9850'
    if (n >= 0.70) return '#66bd63'
    if (n >= 0.55) return '#a6d96a'
    if (n >= 0.40) return '#fdae61'
    if (n >= 0.20) return '#f46d43'
    return '#d73027'
  }
  const bar = (v, c) => `<div style="background:#1e2738;border-radius:2px;height:3px;margin-top:2px">
    <div style="width:${pct(v)}%;height:3px;background:${c};border-radius:2px"></div></div>`
  const zc = { HH:'#1a9641',LL:'#d7191c',HL:'#f39c12',LH:'#3498db',NS:'#555' }[p.zona_atlas] || '#555'
  const sc = col(p.atlas_score)
  return `<div style="font-family:'Inter',sans-serif;font-size:12px;color:#E6EDF3;min-width:230px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <div>
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:14px">${p.municipio||''}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E;margin-top:1px">${(p.cod_manzana||'').slice(-10)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:24px;color:${sc};line-height:1">${pct(p.atlas_score)}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E;text-transform:uppercase;letter-spacing:.12em">Score</div>
      </div>
    </div>
    ${bar(p.atlas_score, sc)}
    <div style="margin-top:10px;display:grid;grid-template-columns:1fr auto;gap:3px 10px">
      ${[['Accesibilidad','score_accesibilidad'],['Ambiental','score_ambiental'],['Socioecon.','score_socioeconomico'],['Seguridad','score_seguridad']].map(([label,key])=>`
      <span style="color:#8B949E;font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-family:'JetBrains Mono',monospace">${label}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px">${pct(p[key])}</span>`).join('')}
    </div>
    <div style="margin-top:8px;padding-top:6px;border-top:1px solid #30363D;display:flex;gap:8px;align-items:center">
      <span style="padding:1px 6px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;background:${zc}22;color:${zc};border:1px solid ${zc}44">${p.zona_atlas||'—'}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E">${p.quintil||'—'}</span>
    </div>
  </div>`
}

// ─── Tooltip equipamiento HTML ────────────────────────────────────────────────
function buildEquipamientoTooltip(p, color, nameField, munField, extraField) {
  const name  = p[nameField]  || '—'
  const mun   = p[munField]   || ''
  const extra = p[extraField] || ''
  return `<div style="font-family:'Inter',sans-serif;font-size:12px;color:#E6EDF3;min-width:180px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0;display:inline-block"></span>
      <span style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;line-height:1.3">${name}</span>
    </div>
    ${mun   ? `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8B949E;margin-bottom:2px">${mun}</div>`   : ''}
    ${extra ? `<div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:${color};text-transform:uppercase;letter-spacing:.08em">${extra}</div>` : ''}
  </div>`
}
