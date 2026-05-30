import { ref, watch, onUnmounted } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

// Estilos de mapa disponibles
const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark'
const STYLE_SAT  = {
  version: 8,
  sources: { esri: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: '© Esri' } },
  layers:  [{ id: 'esri-sat', type: 'raster', source: 'esri' }],
}

// ─── Mejora 1: PALETA TENSOR TEAL ────────────────────────────────────────────
// Expresión MapLibre para choropleth — rojo crítico → teal Tensor
function buildColorExpr(dim) {
  return [
    'interpolate', ['linear'],
    ['to-number', ['get', dim], 0],
    0.00, '#d73027',
    0.20, '#f46d43',
    0.40, '#fdae61',
    0.55, '#a8ddb5',
    0.70, '#41b6c4',
    0.85, '#1d91c0',
    1.00, '#1B6B6D',
  ]
}

// Versión escalar (para tooltip y municipio cards)
export function buildColorExprFromScore(score) {
  const s = +score
  if (s >= 0.85) return '#1B6B6D'
  if (s >= 0.70) return '#1d91c0'
  if (s >= 0.55) return '#41b6c4'
  if (s >= 0.40) return '#a8ddb5'
  if (s >= 0.20) return '#fdae61'
  if (s >= 0.00) return '#f46d43'
  return '#d73027'
}

export function useAtlasMap(mapRef) {
  const store = useAtlasStore()
  const map   = ref(null)
  const ready = ref(false)

  let hoveredId   = null
  let selectedId  = null
  let _maplibregl = null
  let isSatellite = false

  // Registro de visibilidad de capas opcionales
  const layerVisibility = {
    veredas:    true,
    municipios: true,
    reps:       false,
    simat:      false,
  }

  // Capas activas como Set reactivo para la UI
  const activeLayers = ref(new Set(['veredas', 'municipios']))

  // ─── Inicialización del mapa ────────────────────────────────────────────────
  async function initMap() {
    _maplibregl = (await import('maplibre-gl')).default

    // ── Flyover de entrada: Colombia → Urabá (solo la primera vez por sesión) ──
    const firstVisit = !sessionStorage.getItem('atlas-visited')
    const startCenter = firstVisit ? [-74.0, 4.5] : [-76.65, 7.9]
    const startZoom   = firstVisit ? 5 : 9

    map.value = new _maplibregl.Map({
      container:          mapRef.value,
      style:              STYLE_DARK,
      center:             startCenter,
      zoom:               startZoom,
      minZoom:            4,
      maxZoom:            17,
      attributionControl: false,
    })

    map.value.addControl(
      new _maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    )
    map.value.addControl(
      new _maplibregl.NavigationControl({ visualizePitch: true }),
      'top-right'
    )
    map.value.addControl(
      new _maplibregl.ScaleControl({ unit: 'metric' }),
      'bottom-right'
    )

    map.value.on('load', () => {
      if (firstVisit) {
        sessionStorage.setItem('atlas-visited', '1')
        // Breve pausa → volar a Urabá
        setTimeout(() => {
          map.value.flyTo({
            center:   [-76.65, 7.9],
            zoom:     9,
            duration: 3800,
            easing:   (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            essential: true,
          })
        }, 600)
      }
      loadAtlasLayer()
    })

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

  // ─── Carga de capas de datos ────────────────────────────────────────────────
  function loadAtlasLayer() {
    // Source principal de manzanas
    map.value.addSource('atlas', {
      type:      'geojson',
      data:      '/data/atlas.geojson',
      promoteId: '_fid',
    })

    // ── Mejora 2 & 7: SOURCE DE MUNICIPIOS con promoteId para feature-state ──
    if (!map.value.getSource('municipios-score')) {
      map.value.addSource('municipios-score', {
        type:      'geojson',
        data:      '/data/municipios.geojson',
        promoteId: 'municipio',   // campo clave = nombre en MAYÚSCULAS
      })
    }

    // ── Sources contextuales ─────────────────────────────────────────────────
    map.value.addSource('veredas',    { type: 'geojson', data: '/data/veredas.geojson' })
    map.value.addSource('municipios', { type: 'geojson', data: '/data/municipios.geojson' })

    // ── Capa veredas (referencia geográfica) ─────────────────────────────────
    map.value.addLayer({
      id:     'veredas-outline',
      type:   'line',
      source: 'veredas',
      layout: { visibility: 'visible' },
      paint: {
        'line-color': 'rgba(255,255,255,0.12)',
        'line-width': 0.8,
      },
    })

    // ── Mejora 7: CAPA FILL DE MUNICIPIOS (choropleth baja resolución) ────────
    // Visible a zoom bajo, se desvanece al hacer zoom in
    map.value.addLayer({
      id:      'municipios-score-fill',
      type:    'fill',
      source:  'municipios-score',
      maxzoom: 12,
      paint: {
        // Scores pre-computados en el GeoJSON — no depende de feature-state
        'fill-color': [
          'case',
          ['has', 'atlas_score'],
          ['interpolate', ['linear'], ['to-number', ['get', 'atlas_score'], 0],
            0.00, '#d73027', 0.20, '#f46d43', 0.40, '#fdae61',
            0.55, '#a8ddb5', 0.70, '#41b6c4', 0.85, '#1d91c0', 1.00, '#1B6B6D',
          ],
          'rgba(80,80,80,0.3)',  // Mutatá u otros sin datos
        ],
        'fill-opacity': [
          'interpolate', ['linear'], ['zoom'],
          7, 0.85,
          10, 0.5,
          12, 0,
        ],
        'fill-color-transition':   { duration: 600 },
        'fill-opacity-transition': { duration: 400 },
      },
    }, 'veredas-outline')   // insertar DEBAJO de las veredas

    // Outline de municipios para vista de baja resolución
    map.value.addLayer({
      id:      'municipios-score-outline',
      type:    'line',
      source:  'municipios-score',
      maxzoom: 12,
      paint: {
        'line-color':   'rgba(255,255,255,0.4)',
        'line-width':   1.5,
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.9, 12, 0],
      },
    }, 'veredas-outline')

    // Label de municipios con score visible a zoom bajo
    map.value.addLayer({
      id:      'municipios-score-label',
      type:    'symbol',
      source:  'municipios-score',
      maxzoom: 11,
      layout: {
        'text-field': ['concat',
          ['get', 'municipio'],
          '\n',
          ['case',
            ['has', 'score_display'],
            ['concat', ['to-string', ['get', 'score_display']], '/100'],
            '',
          ],
        ],
        'text-font':           ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size':           ['interpolate', ['linear'], ['zoom'], 7, 10, 10, 13],
        'text-max-width':      10,
        'text-line-height':    1.3,
        'text-transform':      'uppercase',
        'text-letter-spacing': 0.05,
      },
      paint: {
        'text-color':      'rgba(255,255,255,0.85)',
        'text-halo-color': 'rgba(13,17,23,0.9)',
        'text-halo-width': 2,
        'text-opacity':    ['interpolate', ['linear'], ['zoom'], 8, 1, 11, 0],
      },
    })

    // ── Capas de contorno de municipios (contexto vectorial) ─────────────────
    map.value.addLayer({
      id:     'municipios-outline',
      type:   'line',
      source: 'municipios',
      layout: { visibility: 'visible' },
      paint: {
        'line-color':     'rgba(255,255,255,0.30)',
        'line-width':     1.2,
        'line-dasharray': [4, 2],
      },
    })

    map.value.addLayer({
      id:      'municipios-label',
      type:    'symbol',
      source:  'municipios',
      minzoom: 8,
      layout: {
        visibility:            'visible',
        'text-field':          ['get', 'municipio'],
        'text-font':           ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size':           ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 13],
        'text-transform':      'uppercase',
        'text-letter-spacing': 0.08,
        'text-max-width':      8,
        'symbol-placement':    'point',
        'text-anchor':         'center',
      },
      paint: {
        'text-color':      'rgba(255,255,255,0.70)',
        'text-halo-color': 'rgba(13,17,23,0.85)',
        'text-halo-width': 1.5,
      },
    })

    // ── Mejora 2 & 3: MANZANAS FILL con granularidad adaptiva y transición suave ──
    map.value.addLayer({
      id:      'manzanas-fill',
      type:    'fill',
      source:  'atlas',
      minzoom: 10,
      paint: {
        'fill-color': buildColorExpr(store.dimension),
        'fill-opacity': [
          'interpolate', ['linear'], ['zoom'],
          10, 0,
          11, 0.5,
          12, 0.82,
        ],
        'fill-color-transition':   { duration: 500, delay: 0 },
        'fill-opacity-transition': { duration: 400 },
      },
    })

    map.value.addLayer({
      id:     'manzanas-stroke',
      type:   'line',
      source: 'atlas',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], '#1B6B6D',
          ['boolean', ['feature-state', 'hover'],    false], 'rgba(255,255,255,0.7)',
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

    // ── Mejora 6: CAPA 3D EXTRUSIÓN ──────────────────────────────────────────
    map.value.addLayer({
      id:      'manzanas-3d',
      type:    'fill-extrusion',
      source:  'atlas',
      minzoom: 12,
      layout:  { visibility: 'none' },
      paint: {
        'fill-extrusion-color': buildColorExpr(store.dimension),
        'fill-extrusion-height': [
          '*',
          ['to-number', ['get', store.dimension], 0],
          250,   // max 250 m de altura para score = 1.0
        ],
        'fill-extrusion-base':    0,
        'fill-extrusion-opacity': 0.85,
        'fill-extrusion-color-transition': { duration: 500 },
      },
    })

    // ── Equipamientos: REPS (salud) ───────────────────────────────────────────
    map.value.addSource('reps', { type: 'geojson', data: '/data/reps.geojson' })
    map.value.addLayer({
      id:     'reps-points',
      type:   'circle',
      source: 'reps',
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 13, 5, 16, 7],
        'circle-color':        '#3B82F6',
        'circle-opacity':      0.85,
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,255,0.4)',
      },
    })

    // ── Equipamientos: SIMAT (educación) ─────────────────────────────────────
    map.value.addSource('simat', { type: 'geojson', data: '/data/simat.geojson' })
    map.value.addLayer({
      id:     'simat-points',
      type:   'circle',
      source: 'simat',
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 13, 5, 16, 7],
        'circle-color':        '#F59E0B',
        'circle-opacity':      0.85,
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,255,0.4)',
      },
    })

    // ── SIPRA: Aptitud bananera ───────────────────────────────────────────────
    map.value.addSource('sipra', { type: 'geojson', data: '/data/sipra.geojson' })
    map.value.addLayer({
      id:     'sipra-fill',
      type:   'fill',
      source: 'sipra',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': [
          'match', ['get', 'aptitud'],
          'Aptitud alta',    '#00cc44',
          'Aptitud media',   '#88cc00',
          'Aptitud baja',    '#ccaa00',
          'Aptitud muy baja','#cc6600',
          '#888888',
        ],
        'fill-opacity': 0.45,
      },
    })
    map.value.addLayer({
      id:     'sipra-outline',
      type:   'line',
      source: 'sipra',
      layout: { visibility: 'none' },
      paint: { 'line-color': 'rgba(255,255,255,0.3)', 'line-width': 0.6 },
    })

    // ── SIPRA: Zonas de exclusión ─────────────────────────────────────────────
    map.value.addSource('sipra-exclusion', { type: 'geojson', data: '/data/sipra_exclusion.geojson' })
    map.value.addLayer({
      id:     'sipra-exclusion-fill',
      type:   'fill',
      source: 'sipra-exclusion',
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#cc3333', 'fill-opacity': 0.25 },
    })
    map.value.addLayer({
      id:     'sipra-exclusion-outline',
      type:   'line',
      source: 'sipra-exclusion',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#cc3333', 'line-width': 0.8, 'line-dasharray': [3, 2] },
    })

    // ── Fincas bananeras ──────────────────────────────────────────────────────
    map.value.addSource('fincas', { type: 'geojson', data: '/data/fincas.geojson' })
    map.value.addLayer({
      id:     'fincas-fill',
      type:   'fill',
      source: 'fincas',
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#F5E642', 'fill-opacity': 0.35 },
    })
    map.value.addLayer({
      id:     'fincas-outline',
      type:   'line',
      source: 'fincas',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#D4B800', 'line-width': 0.8 },
    })

    // ── Hidrografía ───────────────────────────────────────────────────────────
    map.value.addSource('waterways', { type: 'geojson', data: '/data/waterways.geojson' })
    map.value.addLayer({
      id:     'waterways-line',
      type:   'line',
      source: 'waterways',
      layout: { visibility: 'none' },
      paint: {
        'line-color': [
          'match', ['get', 'waterway'],
          'river',  '#3B82F6',
          'stream', '#60A5FA',
          'canal',  '#0EA5E9',
          '#93C5FD',
        ],
        'line-width': ['match', ['get', 'waterway'], 'river', 2.5, 'stream', 1.2, 1],
        'line-opacity': 0.75,
      },
    })

    // ── Red vial ──────────────────────────────────────────────────────────────
    map.value.addSource('roads', { type: 'geojson', data: '/data/roads.geojson' })
    map.value.addLayer({
      id:     'roads-line',
      type:   'line',
      source: 'roads',
      layout: { visibility: 'none' },
      paint: {
        'line-color': [
          'match', ['get', 'highway'],
          'primary',   '#F97316',
          'secondary', '#FB923C',
          'tertiary',  '#FCA5A5',
          '#D97706',
        ],
        'line-width': ['match', ['get', 'highway'], 'primary', 2.5, 'secondary', 1.8, 'tertiary', 1.2, 1],
        'line-opacity': 0.8,
      },
    })

    // ── UARIV: Desplazamiento forzado ──────────────────────────────────────────
    map.value.addSource('uariv', { type: 'geojson', data: '/data/uariv_desplazamiento.geojson' })
    map.value.addLayer({
      id: 'uariv-fill', type: 'fill', source: 'uariv',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': [
          'interpolate', ['linear'], ['to-number', ['get', 'intensidad'], 0],
          0.0, 'rgba(255,200,200,0.1)',
          0.3, 'rgba(255,150,100,0.4)',
          0.7, 'rgba(220,50,50,0.55)',
          1.0, 'rgba(180,0,0,0.65)',
        ],
        'fill-opacity': 0.75,
      },
    })
    map.value.addLayer({
      id: 'uariv-outline', type: 'line', source: 'uariv',
      layout: { visibility: 'none' },
      paint: { 'line-color': 'rgba(200,0,0,0.5)', 'line-width': 1 },
    })

    // ── Infraestructura: Puerto Antioquia, aeropuerto, vías clave ─────────
    map.value.addSource('infraestructura', { type: 'geojson', data: '/data/infraestructura.geojson' })
    map.value.addLayer({
      id: 'infra-lineas', type: 'line', source: 'infraestructura',
      layout: { visibility: 'none' },
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3,
        'line-dasharray': [6, 3],
        'line-opacity': 0.85,
      },
    })
    map.value.addLayer({
      id: 'infra-puntos', type: 'circle', source: 'infraestructura',
      layout: { visibility: 'none' },
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 13, 12],
        'circle-color': ['get', 'color'],
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 2,
        'circle-opacity': 0.95,
      },
    })
    map.value.addLayer({
      id: 'infra-labels', type: 'symbol', source: 'infraestructura',
      layout: {
        visibility: 'none',
        'text-field': ['get', 'nombre'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-max-width': 10,
      },
      filter: ['==', '$type', 'Point'],
      paint: {
        'text-color': '#FFFFFF',
        'text-halo-color': 'rgba(13,17,23,0.9)',
        'text-halo-width': 2,
      },
    })

    // ── EVA: Producción bananera por municipio ─────────────────────────────
    map.value.addSource('eva-agro', { type: 'geojson', data: '/data/eva_agro.geojson' })
    map.value.addLayer({
      id: 'eva-banano-fill', type: 'fill', source: 'eva-agro',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': ['interpolate', ['linear'], ['to-number', ['get', 'banano_ha'], 0],
          0, 'rgba(245,230,66,0.1)', 5000, 'rgba(245,210,0,0.5)', 25000, 'rgba(220,160,0,0.75)'],
        'fill-opacity': 0.75,
      },
    })
    map.value.addLayer({
      id: 'eva-banano-outline', type: 'line', source: 'eva-agro',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#D4B800', 'line-width': 1.5 },
    })

    // ── Amenaza de inundación IDEAM TR50 ──────────────────────────────────
    map.value.addSource('inundacion', { type: 'geojson', data: '/data/ideam_inundacion.geojson' })
    map.value.addLayer({
      id: 'inundacion-fill', type: 'fill', source: 'inundacion',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': ['match', ['get', 'amenaza'],
          'Alta', 'rgba(0,80,220,0.55)', 'Media-Alta', 'rgba(0,130,220,0.45)',
          'Media', 'rgba(0,180,220,0.3)', 'rgba(100,180,255,0.2)'],
        'fill-opacity': 0.85,
      },
    })
    map.value.addLayer({
      id: 'inundacion-outline', type: 'line', source: 'inundacion',
      layout: { visibility: 'none' },
      paint: { 'line-color': 'rgba(0,100,255,0.7)', 'line-width': 1, 'line-dasharray': [3,2] },
    })

    // ── Deforestación SMByC ────────────────────────────────────────────────
    map.value.addSource('deforestacion', { type: 'geojson', data: '/data/smbyc_deforestacion_uraba.geojson' })
    map.value.addLayer({
      id: 'deforestacion-fill', type: 'fill', source: 'deforestacion',
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.65 },
    })

    // ── SINAP: Áreas protegidas ───────────────────────────────────────────
    map.value.addSource('sinap', { type: 'geojson', data: '/data/sinap_areas_protegidas.geojson' })
    map.value.addLayer({
      id: 'sinap-fill', type: 'fill', source: 'sinap',
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#166534', 'fill-opacity': 0.4 },
    })
    map.value.addLayer({
      id: 'sinap-outline', type: 'line', source: 'sinap',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#15803d', 'line-width': 1.5, 'line-dasharray': [5,2] },
    })

    // ── Resguardos indígenas ──────────────────────────────────────────────
    map.value.addSource('resguardos', { type: 'geojson', data: '/data/resguardos_indigenas.geojson' })
    map.value.addLayer({
      id: 'resguardos-fill', type: 'fill', source: 'resguardos',
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.35 },
    })
    map.value.addLayer({
      id: 'resguardos-outline', type: 'line', source: 'resguardos',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#6d28d9', 'line-width': 1.5 },
    })

    // ── ZOMAC ─────────────────────────────────────────────────────────────
    map.value.addSource('zomac', { type: 'geojson', data: '/data/zomac_uraba.geojson' })
    map.value.addLayer({
      id: 'zomac-fill', type: 'fill', source: 'zomac',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': ['case', ['==', ['get', 'zomac'], true], 'rgba(234,88,12,0.25)', 'rgba(0,0,0,0)'],
        'fill-opacity': 0.8,
      },
    })
    map.value.addLayer({
      id: 'zomac-outline', type: 'line', source: 'zomac',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#ea580c', 'line-width': 1.2, 'line-dasharray': [4,2] },
    })

    setupInteraction(_maplibregl)

    // Stats cuando el GeoJSON cargue
    map.value.on('sourcedata', (e) => {
      // Calcular stats cuando el atlas GeoJSON carga
      if (e.sourceId === 'atlas' && e.isSourceLoaded && map.value.isStyleLoaded()) {
        requestAnimationFrame(() => {
          const features = map.value.querySourceFeatures('atlas')
          if (features.length > 0) computeStatsFromFeatures(features)
        })
      }
      // Aplicar feature-state a municipios cuando ese source carga
      if (e.sourceId === 'municipios-score' && e.isSourceLoaded) {
        requestAnimationFrame(() => updateMunicipioFeatureStates())
      }
    })

    // Marcar ready tras primer idle post-carga de datos
    map.value.once('idle', () => {
      if (!ready.value) {
        ready.value = true
        store.setLoaded()
      }
    })
  }

  // ─── Toggle de capa ─────────────────────────────────────────────────────────
  function toggleLayer(id) {
    if (!map.value) return

    // ── Mejora: incluir '3d' en el mapa de capas ─────────────────────────────
    const layerMap = {
      veredas:      ['veredas-outline'],
      municipios:   ['municipios-outline', 'municipios-label'],
      reps:         ['reps-points'],
      simat:        ['simat-points'],
      sipra:        ['sipra-fill', 'sipra-outline'],
      'sipra-excl': ['sipra-exclusion-fill', 'sipra-exclusion-outline'],
      fincas:       ['fincas-fill', 'fincas-outline'],
      uariv:          ['uariv-fill', 'uariv-outline'],
      infraestructura: ['infra-lineas', 'infra-puntos', 'infra-labels'],
      'eva-banano':    ['eva-banano-fill', 'eva-banano-outline'],
      inundacion:     ['inundacion-fill', 'inundacion-outline'],
      deforestacion:  ['deforestacion-fill'],
      sinap:          ['sinap-fill', 'sinap-outline'],
      resguardos:     ['resguardos-fill', 'resguardos-outline'],
      zomac:          ['zomac-fill', 'zomac-outline'],
      waterways:    ['waterways-line'],
      roads:        ['roads-line'],
      '3d':         ['manzanas-3d'],
    }

    if (layerMap[id]) {
      layerVisibility[id] = !layerVisibility[id]
      const vis = layerVisibility[id] ? 'visible' : 'none'
      layerMap[id].forEach(layerId => {
        try { map.value.setLayoutProperty(layerId, 'visibility', vis) }
        catch (e) { console.warn('[Atlas] toggleLayer:', e.message) }
      })
      if (layerVisibility[id]) activeLayers.value.add(id)
      else activeLayers.value.delete(id)
      return layerVisibility[id]
    } else {
      try {
        const vis = map.value.getLayoutProperty(id, 'visibility')
        map.value.setLayoutProperty(id, 'visibility', vis === 'none' ? 'visible' : 'none')
      } catch (e) { console.warn('[Atlas] toggleLayer:', e.message) }
    }
  }

  // ─── Toggle satélite / vectorial ────────────────────────────────────────────
  function toggleSatellite() {
    if (!map.value) return false
    isSatellite = !isSatellite

    const prevVisibility = { ...layerVisibility }

    map.value.once('styledata', () => {
      setTimeout(() => {
        try { loadAtlasLayer() } catch (e) {}
        Object.keys(prevVisibility).forEach(id => {
          if (!prevVisibility[id]) toggleLayer(id)
        })
      }, 600)
    })

    map.value.setStyle(isSatellite ? STYLE_SAT : STYLE_DARK)
    return isSatellite
  }

  // ─── Interactividad (hover, click, tooltip) ──────────────────────────────────
  function setupInteraction(maplibregl) {
    const tooltip = new maplibregl.Popup({
      closeButton:  false,
      closeOnClick: false,
      className:    'atlas-tooltip',
      maxWidth:     '300px',
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
      // Mejora 5: pasar store para la comparativa regional
      tooltip.setLngLat(e.lngLat).setHTML(buildTooltip(f.properties, store)).addTo(map.value)
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

    setupEquipamientosInteraction(maplibregl)
  }

  // ─── Tooltips equipamientos ─────────────────────────────────────────────────
  function setupEquipamientosInteraction(maplibregl) {
    const tooltipEq = new maplibregl.Popup({
      closeButton:  false,
      closeOnClick: false,
      className:    'atlas-tooltip',
      maxWidth:     '260px',
      offset:       [0, -4],
    })

    const eqLayers = [
      { id: 'reps-points',  color: '#3B82F6', nameField: 'NombreSede',           munField: 'MunicipioPrestadorDesc', extraField: 'ClasePrestadorDesc' },
      { id: 'simat-points', color: '#F59E0B', nameField: 'nombreestablecimiento', munField: 'nombremunicipio',        extraField: 'zona' },
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

  // ─── Stats desde features del viewport ──────────────────────────────────────
  function computeStatsFromFeatures(features) {
    const dims = ['atlas_score', 'score_accesibilidad', 'score_ambiental', 'score_socioeconomico', 'score_seguridad']
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
    if (Object.keys(stats).length > 0) {
      store.setStats(stats)
      // Mejora 7: actualizar feature-state de municipios tras recalcular stats
      updateMunicipioFeatureStates()
    }
  }

  // ─── Mejora 7: FEATURE STATE en municipios ───────────────────────────────────
  function updateMunicipioFeatureStates() {
    if (!map.value || !map.value.getSource('municipios-score')) return
    const dim = store.dimension
    Object.entries(store.stats).forEach(([nombre, data]) => {
      const score     = data.avg?.[dim] ?? null
      // GeoJSON tiene municipio en MAYÚSCULAS ('APARTADÓ'), store en título ('Apartadó')
      const nombreKey = nombre.toUpperCase()
      try {
        map.value.setFeatureState(
          { source: 'municipios-score', id: nombreKey },
          {
            score,
            scoreDisplay: score !== null ? Math.round(score * 100) : null,
          }
        )
      } catch (e) { /* silenciar errores de feature-state si la feature no existe */ }
    })
  }

  // ─── Utilidades de vuelo y filtro ───────────────────────────────────────────
  function flyTo(lat, lng, zoom) {
    map.value?.flyTo({ center: [lng, lat], zoom, duration: 1300, essential: true })
  }

  function applyFilters() {
    if (!map.value || !ready.value) return
    const { filterMin, filterMax, zonaFilter, municipioActivo, dimension } = store
    const f = ['all']
    if (municipioActivo !== 'Todos') f.push(['==', ['get', 'municipio'], municipioActivo])
    f.push(['>=', ['to-number', ['get', dimension], 0], filterMin])
    f.push(['<=', ['to-number', ['get', dimension], 0], filterMax])
    if (zonaFilter && zonaFilter.length > 0 && zonaFilter.length < 5)
      f.push(['in', ['get', 'zona_atlas'], ['literal', zonaFilter]])
    try {
      const layers = ['manzanas-fill', 'manzanas-stroke', 'manzanas-lisa'].filter(id => map.value.getLayer(id))
      layers.forEach(id => map.value.setFilter(id, f.length > 1 ? f : null))
    } catch (e) { console.warn('[Atlas] applyFilters:', e.message) }
  }

  function updateColor(dim) {
    if (!map.value || !ready.value) return
    try {
      map.value.setPaintProperty('manzanas-fill', 'fill-color', buildColorExpr(dim))
    } catch (e) { console.warn('[Atlas] updateColor:', e.message) }
  }

  // ─── Watchers ────────────────────────────────────────────────────────────────

  // Mejora 3 & 7: cambio de dimensión actualiza color + feature-state + capa 3D
  watch(() => store.dimension, (dim) => {
    updateColor(dim)
    updateMunicipioFeatureStates()

    // Actualizar capa 3D si está activa
    if (map.value?.getLayer('manzanas-3d')) {
      try {
        map.value.setPaintProperty('manzanas-3d', 'fill-extrusion-color', buildColorExpr(dim))
        map.value.setPaintProperty('manzanas-3d', 'fill-extrusion-height', [
          '*', ['to-number', ['get', dim], 0], 250,
        ])
      } catch (e) { console.warn('[Atlas] 3D update:', e.message) }
    }
  })

  watch(() => store.filterMin,  applyFilters)
  watch(() => store.filterMax,  applyFilters)
  watch(() => store.zonaFilter, applyFilters, { deep: true })

  // Mejora 4: FOCUS POR MUNICIPIO — fade de manzanas fuera del municipio activo
  watch(() => store.municipioActivo, (nombre) => {
    const cfg = store.municipioConfig
    if (cfg) flyTo(cfg.lat, cfg.lng, cfg.zoom)
    applyFilters()

    if (!map.value || !ready.value) return

    if (nombre === 'Todos') {
      // Restaurar opacidad normal con fade adaptivo por zoom
      try {
        map.value.setPaintProperty('manzanas-fill', 'fill-opacity', [
          'interpolate', ['linear'], ['zoom'],
          10, 0,
          11, 0.5,
          12, 0.82,
        ])
      } catch (e) { console.warn('[Atlas] focus reset:', e.message) }
    } else {
      // Fade manzanas de otros municipios
      try {
        map.value.setPaintProperty('manzanas-fill', 'fill-opacity', [
          'interpolate', ['linear'], ['zoom'],
          10, 0,
          11, [
            'case',
            ['==', ['get', 'municipio'], nombre], 0.88,
            0.15,
          ],
          12, [
            'case',
            ['==', ['get', 'municipio'], nombre], 0.88,
            0.12,
          ],
        ])
      } catch (e) { console.warn('[Atlas] focus apply:', e.message) }
    }
  })

  // Mejora 7: re-aplicar feature-state cuando las stats se recalculan
  watch(() => store.stats, updateMunicipioFeatureStates, { deep: true })

  onUnmounted(() => {
    map.value?.remove()
    map.value   = null
    hoveredId   = null
    selectedId  = null
    _maplibregl = null
  })

  return { map, ready, activeLayers, initMap, toggleLayer, toggleSatellite, buildColorExprFromScore }
}

// ─── Mejora 5: TOOLTIP MANZANA con comparativa percentil regional ─────────────
function buildTooltip(p, store) {
  if (!p) return ''

  const pct = (v) => Math.round((+(v ?? 0)) * 100)

  // Paleta Tensor teal (coherente con buildColorExprFromScore)
  const col = (v) => {
    const n = +(v ?? 0)
    if (n >= 0.85) return '#1B6B6D'
    if (n >= 0.70) return '#1d91c0'
    if (n >= 0.55) return '#41b6c4'
    if (n >= 0.40) return '#a8ddb5'
    if (n >= 0.20) return '#fdae61'
    if (n >= 0.00) return '#f46d43'
    return '#d73027'
  }

  const bar = (v, c) => `<div style="background:#1e2738;border-radius:2px;height:3px;margin-top:2px">
    <div style="width:${pct(v)}%;height:3px;background:${c};border-radius:2px"></div></div>`

  const zc = { HH: '#1B6B6D', LL: '#d7191c', HL: '#f39c12', LH: '#3498db', NS: '#555' }[p.zona_atlas] || '#555'
  const sc = col(p.atlas_score)

  // ── Comparativa regional ────────────────────────────────────────────────────
  let diffHTML = ''
  if (store) {
    // Calcular score promedio regional desde todos los municipios en stats
    const statsEntries = Object.values(store.stats || {})
    const regionAvg = statsEntries.length > 0
      ? statsEntries.reduce((sum, d) => sum + (d.avg?.atlas_score ?? 0), 0) / statsEntries.length
      : null

    if (regionAvg !== null) {
      const localScore = +(p.atlas_score ?? 0)
      const diff       = localScore - regionAvg
      const diffAbs    = Math.round(Math.abs(diff) * 100)
      const diffSign   = diff >= 0 ? '+' : '-'
      const diffColor  = diff >= 0 ? '#4ade80' : '#f87171'
      const diffText   = `${diffSign}${diffAbs} vs región`
      diffHTML = `<div style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:9px;color:${diffColor};letter-spacing:.05em">${diffText}</div>`
    }
  }

  return `<div style="font-family:'Inter',sans-serif;font-size:12px;color:#E6EDF3;min-width:240px">
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
    ${diffHTML}
    <div style="margin-top:10px;display:grid;grid-template-columns:1fr auto;gap:3px 10px">
      ${[['Accesibilidad', 'score_accesibilidad'], ['Ambiental', 'score_ambiental'], ['Socioecon.', 'score_socioeconomico'], ['Seguridad', 'score_seguridad']].map(([label, key]) => `
      <span style="color:#8B949E;font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-family:'JetBrains Mono',monospace">${label}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px">${pct(p[key])}</span>`).join('')}
    </div>
    <div style="margin-top:8px;padding-top:6px;border-top:1px solid #30363D;display:flex;gap:8px;align-items:center">
      <span style="padding:1px 6px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;background:${zc}22;color:${zc};border:1px solid ${zc}44">${p.zona_atlas || '—'}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8B949E">${p.quintil || '—'}</span>
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
