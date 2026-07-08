import { ref, watch, onUnmounted } from 'vue'
import { useAtlasStore, MUNICIPIOS } from '~/stores/atlas'

// Estilos de mapa disponibles
// Modo 0 — Dark vectorial (OpenFreeMap)
const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark'

// Modo 1 — Satélite con fuentes de fallback en cascada
// Fuente primaria: Esri World Imagery (robusta, free, sin key para uso web)
// Fuente secundaria: Stadia alidade_smooth_dark (dark como fallback visual)
const STYLE_SAT = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    'esri-sat': {
      type:        'raster',
      tiles:       ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize:    256,
      attribution: '© Esri, Maxar, Earthstar Geographics',
      maxzoom:     19,
    },
    'bing-sat': {
      type:        'raster',
      // OpenAerialMap tiles — libre, sin key, buena cobertura Colombia
      tiles:       ['https://tiles.openaerialmap.org/tiles/{z}/{x}/{y}.png'],
      tileSize:    256,
      attribution: '© OpenAerialMap contributors',
      maxzoom:     18,
    },
  },
  layers: [
    {
      id:     'esri-imagery',
      type:   'raster',
      source: 'esri-sat',
      paint:  { 'raster-opacity': 1 },
    },
  ],
}

// Modo 2 — Calles claras (OpenFreeMap positron/bright)
const STYLE_STREETS = 'https://tiles.openfreemap.org/styles/positron'

// Ciclo de modos: 0=Dark, 1=Satélite, 2=Calles claras
const MAP_STYLES    = [STYLE_DARK, STYLE_SAT, STYLE_STREETS]
const MAP_MODE_NAMES = ['dark', 'satellite', 'streets']

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

  let hoveredId  = null
  let selectedId = null
  let _maplibregl = null
  let mapMode    = 0  // 0=Dark, 1=Satélite, 2=Calles claras

  // Cache de datos IRCA/seguridad para los tooltips de las capas coropléticas
  // municipales (poblado por optionalLayerRegistrars.irca/seguridad al primer
  // toggle; setupIndicadoresInteraction los lee por closure).
  let ircaTooltipData      = null
  let seguridadTooltipData = null

  // Registro de visibilidad de capas opcionales
  const layerVisibility = {
    veredas:    true,
    municipios: true,
    reps:       false,
    simat:      false,
  }

  // Capas activas como Set reactivo para la UI
  const activeLayers = ref(new Set(['veredas', 'municipios']))

  // ─── Mapa de capa lógica → capas MapLibre reales ─────────────────────────────
  // Compartido por toggleLayer() y toggleSatellite() (restauración tras reload).
  const layerMap = {
    veredas:      ['veredas-outline'],
    municipios:   ['municipios-outline', 'municipios-label', 'municipios-score-fill', 'municipios-score-outline', 'municipios-score-label'],
    reps:         ['reps-points'],
    simat:        ['simat-points'],
    sipra:        ['sipra-fill', 'sipra-outline'],
    'sipra-excl': ['sipra-exclusion-fill', 'sipra-exclusion-outline'],
    fincas:       ['fincas-fill', 'fincas-outline'],
    uariv:          ['uariv-fill', 'uariv-outline'],
    manglares:      ['manglares-fill', 'manglares-outline'],
    carbono:        ['carbono-fill'],
    agua:           ['agua-line', 'agua-polygon'],
    tic:            ['tic-fill'],
    epidemiologia:  ['epidemiologia-fill'],
    'nbi':          ['terridata-nbi'],
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
    'clasificacion-suelo':  ['clasificacion-suelo-fill', 'clasificacion-suelo-outline'],
    'prioridad-inversion':  ['prioridad-fill', 'prioridad-outline'],
    'red-vial':             ['red-vial-line'],
    'corpouraba-agua':      ['corpouraba-puntos'],
    'aislamiento':          ['aislamiento-fill'],
    'conflicto-uso':        ['conflicto-fill', 'conflicto-outline'],
    'zonas-funcionales':    ['zonas-funcionales-fill', 'zonas-funcionales-outline'],
    'osm-landuse':          ['osm-landuse-fill', 'osm-landuse-outline'],
    'equipamientos':        ['equipamientos-points'],
    // Capas v2 — atlas enriquecido GHSL + NDVI + Luminosidad
    'enriquecido-atlas-v2':          ['enriquecido-atlas-v2'],
    'enriquecido-accesibilidad-v2':  ['enriquecido-accesibilidad-v2'],
    'enriquecido-ndvi':              ['enriquecido-ndvi'],
    'enriquecido-impermeabilizacion':['enriquecido-impermeabilizacion'],
    'enriquecido-ambiental-v2':      ['enriquecido-ambiental-v2'],
    // Capas nuevas con datos reales
    'catastro':         ['catastro-fill', 'catastro-outline'],
    'red-vial-invias':  ['red-vial-invias-line'],
    'sui-servicios':    ['sui-servicios-fill', 'sui-servicios-outline'],
    'terridata-full':   ['terridata-full-fill', 'terridata-full-outline'],
    'resguardos-ant':   ['resguardos-ant-fill', 'resguardos-ant-outline'],
    'runap':            ['runap-fill', 'runap-outline'],
    // Capas nuevas — IRCA (calidad de agua) y seguridad (homicidios), join en runtime
    'irca':             ['irca-fill', 'irca-outline'],
    'seguridad':        ['seguridad-fill', 'seguridad-outline'],
  }

  // ─── Registro perezoso de fuentes/capas OPCIONALES (lazy-on-first-toggle) ───
  // Antes, loadAtlasLayer() registraba ~37 addSource() incondicionalmente al
  // cargar el mapa (equipamientos, capas ambientales, catastro IGAC, etc.),
  // sumando ~72 MB de GeoJSON descargados aunque el usuario nunca abriera el
  // panel de capas. Ahora cada fuente/capa opcional se registra (addSource +
  // addLayer) la PRIMERA VEZ que el usuario la activa desde toggleLayer(),
  // detrás de un guard "if (!map.value.getSource(...))" — el mismo patrón que
  // ya usaba 'municipios-score' en loadAtlasLayer (línea ~197). Las capas BASE
  // del atlas (manzanas/atlas.pmtiles con fallback GeoJSON, municipios,
  // veredas) NO son opcionales y siguen cargando eager, igual que antes.
  // Cada registrador se auto-protege contra re-registro (chequea su propia
  // fuente antes de addSource) para que toggleSatellite() —que destruye y
  // reconstruye todas las fuentes/capas al cambiar de estilo— pueda invocarlo
  // de nuevo sin duplicar sources ni lanzar error de MapLibre.
  const optionalLayerRegistrars = {
    reps() {
      if (map.value.getSource('reps')) return
      map.value.addSource('reps', { type: 'geojson', data: '/data/reps.geojson' })
      map.value.addLayer({
        id: 'reps-points', type: 'circle', source: 'reps',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 13, 5, 16, 7],
          'circle-color': '#3B82F6', 'circle-opacity': 0.85,
          'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(255,255,255,0.4)',
        },
      })
    },
    simat() {
      if (map.value.getSource('simat')) return
      map.value.addSource('simat', { type: 'geojson', data: '/data/simat.geojson' })
      map.value.addLayer({
        id: 'simat-points', type: 'circle', source: 'simat',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 13, 5, 16, 7],
          'circle-color': '#F59E0B', 'circle-opacity': 0.85,
          'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(255,255,255,0.4)',
        },
      })
    },
    sipra() {
      if (map.value.getSource('sipra')) return
      map.value.addSource('sipra', { type: 'geojson', data: '/data/sipra.geojson' })
      map.value.addLayer({
        id: 'sipra-fill', type: 'fill', source: 'sipra',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['match', ['get', 'aptitud'],
            'Aptitud alta', '#00cc44', 'Aptitud media', '#88cc00',
            'Aptitud baja', '#ccaa00', 'Aptitud muy baja', '#cc6600', '#888888'],
          'fill-opacity': 0.45,
        },
      })
      map.value.addLayer({
        id: 'sipra-outline', type: 'line', source: 'sipra',
        layout: { visibility: 'none' },
        paint: { 'line-color': 'rgba(255,255,255,0.3)', 'line-width': 0.6 },
      })
    },
    'sipra-excl'() {
      if (map.value.getSource('sipra-exclusion')) return
      map.value.addSource('sipra-exclusion', { type: 'geojson', data: '/data/sipra_exclusion.geojson' })
      map.value.addLayer({
        id: 'sipra-exclusion-fill', type: 'fill', source: 'sipra-exclusion',
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#cc3333', 'fill-opacity': 0.25 },
      })
      map.value.addLayer({
        id: 'sipra-exclusion-outline', type: 'line', source: 'sipra-exclusion',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#cc3333', 'line-width': 0.8, 'line-dasharray': [3, 2] },
      })
    },
    fincas() {
      if (map.value.getSource('fincas')) return
      map.value.addSource('fincas', { type: 'geojson', data: '/data/fincas.geojson' })
      map.value.addLayer({
        id: 'fincas-fill', type: 'fill', source: 'fincas',
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#F5E642', 'fill-opacity': 0.35 },
      })
      map.value.addLayer({
        id: 'fincas-outline', type: 'line', source: 'fincas',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#D4B800', 'line-width': 0.8 },
      })
    },
    waterways() {
      if (map.value.getSource('waterways')) return
      map.value.addSource('waterways', { type: 'geojson', data: '/data/waterways.geojson' })
      map.value.addLayer({
        id: 'waterways-line', type: 'line', source: 'waterways',
        layout: { visibility: 'none' },
        paint: {
          'line-color': ['match', ['get', 'waterway'],
            'river', '#3B82F6', 'stream', '#60A5FA', 'canal', '#0EA5E9', '#93C5FD'],
          'line-width': ['match', ['get', 'waterway'], 'river', 2.5, 'stream', 1.2, 1],
          'line-opacity': 0.75,
        },
      })
    },
    roads() {
      if (map.value.getSource('roads')) return
      map.value.addSource('roads', { type: 'geojson', data: '/data/roads.geojson' })
      map.value.addLayer({
        id: 'roads-line', type: 'line', source: 'roads',
        layout: { visibility: 'none' },
        paint: {
          'line-color': ['match', ['get', 'highway'],
            'primary', '#F97316', 'secondary', '#FB923C', 'tertiary', '#FCA5A5', '#D97706'],
          'line-width': ['match', ['get', 'highway'], 'primary', 2.5, 'secondary', 1.8, 'tertiary', 1.2, 1],
          'line-opacity': 0.8,
        },
      })
    },
    uariv() {
      if (map.value.getSource('uariv')) return
      map.value.addSource('uariv', { type: 'geojson', data: '/data/uariv_desplazamiento.geojson' })
      map.value.addLayer({
        id: 'uariv-fill', type: 'fill', source: 'uariv',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['interpolate', ['linear'], ['to-number', ['get', 'intensidad'], 0],
            0.0, 'rgba(255,200,200,0.1)', 0.3, 'rgba(255,150,100,0.4)',
            0.7, 'rgba(220,50,50,0.55)', 1.0, 'rgba(180,0,0,0.65)'],
          'fill-opacity': 0.75,
        },
      })
      map.value.addLayer({
        id: 'uariv-outline', type: 'line', source: 'uariv',
        layout: { visibility: 'none' },
        paint: { 'line-color': 'rgba(200,0,0,0.5)', 'line-width': 1 },
      })
    },
    manglares() {
      if (map.value.getSource('manglares')) return
      map.value.addSource('manglares', { type: 'geojson', data: '/data/manglares_uraba.geojson' })
      map.value.addLayer({
        id: 'manglares-fill', type: 'fill', source: 'manglares',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['match', ['get', 'estado'],
            'Crítico', '#7f1d1d', 'Degradado', '#dc2626', 'Perturbado', '#f97316',
            'Moderadamente degradado', '#fbbf24', 'Moderado', '#86efac', '#166534'],
          'fill-opacity': 0.75,
        },
      })
      map.value.addLayer({
        id: 'manglares-outline', type: 'line', source: 'manglares',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#166534', 'line-width': 1.5 },
      })
    },
    carbono() {
      if (map.value.getSource('carbono')) return
      map.value.addSource('carbono', { type: 'geojson', data: '/data/gfw_carbono_bosques.geojson' })
      map.value.addLayer({
        id: 'carbono-fill', type: 'fill', source: 'carbono',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['interpolate', ['linear'], ['to-number', ['get', 'total_ktco2'], 0],
            0, '#f0fdf4', 3000, '#4ade80', 8000, '#16a34a', 15000, '#166534', 25000, '#052e16'],
          'fill-opacity': 0.7,
        },
      })
    },
    agua() {
      if (map.value.getSource('agua')) return
      map.value.addSource('agua', { type: 'geojson', data: '/data/calidad_agua_uraba.geojson' })
      map.value.addLayer({
        id: 'agua-line', type: 'line', source: 'agua',
        layout: { visibility: 'none' },
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': ['match', ['get', 'categoria'],
            'Buena', '#3b82f6', 'Regular', '#f59e0b', 'Mala', '#dc2626', '#94a3b8'],
          'line-width': 3, 'line-opacity': 0.85,
        },
      })
      map.value.addLayer({
        id: 'agua-polygon', type: 'fill', source: 'agua',
        layout: { visibility: 'none' },
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': ['match', ['get', 'categoria'],
            'Buena', 'rgba(59,130,246,0.35)', 'Regular', 'rgba(245,158,11,0.35)', 'rgba(220,38,38,0.35)'],
          'fill-opacity': 0.7,
        },
      })
    },
    tic() {
      if (map.value.getSource('tic')) return
      map.value.addSource('tic', { type: 'geojson', data: '/data/tic_cobertura.geojson' })
      map.value.addLayer({
        id: 'tic-fill', type: 'fill', source: 'tic',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['interpolate', ['linear'], ['to-number', ['get', 'pct_4g'], 0],
            0, '#1e1b4b', 40, '#312e81', 70, '#4f46e5', 90, '#818cf8', 100, '#c7d2fe'],
          'fill-opacity': 0.75,
        },
      })
    },
    epidemiologia() {
      if (map.value.getSource('epidemiologia')) return
      map.value.addSource('epidemiologia', { type: 'geojson', data: '/data/sivigila_epidemiologia.geojson' })
      map.value.addLayer({
        id: 'epidemiologia-fill', type: 'fill', source: 'epidemiologia',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['interpolate', ['linear'], ['to-number', ['get', 'casos_tropicales'], 0],
            0, 'rgba(254,243,199,0.3)', 100, 'rgba(251,191,36,0.55)',
            200, 'rgba(245,158,11,0.7)', 300, 'rgba(217,119,6,0.85)'],
          'fill-opacity': 0.8,
        },
      })
    },
    nbi() {
      if (map.value.getSource('terridata')) return
      map.value.addSource('terridata', { type: 'geojson', data: '/data/terridata_indicadores.geojson' })
      map.value.addLayer({
        id: 'terridata-nbi', type: 'fill', source: 'terridata',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['interpolate', ['linear'], ['to-number', ['get', 'nbi_pct'], 0],
            20, '#1a9850', 35, '#a6d96a', 50, '#fdae61', 65, '#f46d43'],
          'fill-opacity': 0.8,
        },
      })
    },
    infraestructura() {
      if (map.value.getSource('infraestructura')) return
      map.value.addSource('infraestructura', { type: 'geojson', data: '/data/infraestructura.geojson' })
      map.value.addLayer({
        id: 'infra-lineas', type: 'line', source: 'infraestructura',
        layout: { visibility: 'none' },
        filter: ['==', '$type', 'LineString'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [6, 3], 'line-opacity': 0.85 },
      })
      map.value.addLayer({
        id: 'infra-puntos', type: 'circle', source: 'infraestructura',
        layout: { visibility: 'none' },
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 13, 12],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2, 'circle-opacity': 0.95,
        },
      })
      map.value.addLayer({
        id: 'infra-labels', type: 'symbol', source: 'infraestructura',
        layout: {
          visibility: 'none', 'text-field': ['get', 'nombre'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-max-width': 10,
        },
        filter: ['==', '$type', 'Point'],
        paint: { 'text-color': '#FFFFFF', 'text-halo-color': 'rgba(13,17,23,0.9)', 'text-halo-width': 2 },
      })
    },
    'eva-banano'() {
      if (map.value.getSource('eva-agro')) return
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
    },
    inundacion() {
      if (map.value.getSource('inundacion')) return
      map.value.addSource('inundacion', { type: 'geojson', data: '/data/ideam_inundacion.geojson' })
      map.value.addLayer({
        id: 'inundacion-fill', type: 'fill', source: 'inundacion',
        layout: { visibility: 'none' },
        paint: { 'fill-color': ['coalesce', ['get', 'color'], '#3b82f6'], 'fill-opacity': 0.6 },
      })
      map.value.addLayer({
        id: 'inundacion-outline', type: 'line', source: 'inundacion',
        layout: { visibility: 'none' },
        paint: { 'line-color': ['coalesce', ['get', 'color'], '#3b82f6'], 'line-width': 1.5 },
      })
    },
    deforestacion() {
      if (map.value.getSource('deforestacion')) return
      map.value.addSource('deforestacion', { type: 'geojson', data: '/data/smbyc_deforestacion_uraba.geojson' })
      map.value.addLayer({
        id: 'deforestacion-fill', type: 'fill', source: 'deforestacion',
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.65 },
      })
    },
    sinap() {
      if (map.value.getSource('sinap')) return
      map.value.addSource('sinap', { type: 'geojson', data: '/data/sinap_areas_protegidas.geojson' })
      map.value.addLayer({
        id: 'sinap-fill', type: 'fill', source: 'sinap',
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#166534', 'fill-opacity': 0.4 },
      })
      map.value.addLayer({
        id: 'sinap-outline', type: 'line', source: 'sinap',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#15803d', 'line-width': 1.5, 'line-dasharray': [5, 2] },
      })
    },
    resguardos() {
      if (map.value.getSource('resguardos')) return
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
    },
    'clasificacion-suelo'() {
      try {
        if (map.value.getSource('clasificacion-suelo')) return
        map.value.addSource('clasificacion-suelo', { type: 'geojson', data: '/data/clasificacion_suelo.geojson' })
        map.value.addLayer({
          id: 'clasificacion-suelo-fill', type: 'fill', source: 'clasificacion-suelo',
          layout: { visibility: 'none' },
          paint: {
            'fill-color': [
              'match', ['get', 'clasificacion_suelo'],
              'Urbano consolidado', '#C62828', 'Urbano en desarrollo', '#FF8F00',
              'Periurbano/Expansión', '#FDD835', 'Rural productivo', '#795548',
              'Riesgo/Restricción', '#EF5350', 'Protección ambiental', '#2E7D32', '#888888',
            ],
            'fill-opacity': 0.65,
          },
        })
        map.value.addLayer({
          id: 'clasificacion-suelo-outline', type: 'line', source: 'clasificacion-suelo',
          layout: { visibility: 'none' },
          paint: { 'line-color': 'rgba(255,255,255,0.12)', 'line-width': 0.4 },
        })
      } catch (e) { console.warn('[Atlas] clasificacion-suelo:', e.message) }
    },
    'prioridad-inversion'() {
      try {
        if (map.value.getSource('prioridad-inversion')) return
        map.value.addSource('prioridad-inversion', {
          type: 'geojson', data: '/data/prioridad_inversion.geojson', promoteId: '_fid',
        })
        map.value.addLayer({
          id: 'prioridad-fill', type: 'fill', source: 'prioridad-inversion',
          minzoom: 10, layout: { visibility: 'none' },
          paint: {
            'fill-color': [
              'match', ['get', 'prioridad'],
              'Crítica', '#dc2626', 'Alta', '#f97316', 'Media', '#eab308', 'Baja', '#22c55e', '#94a3b8',
            ],
            'fill-opacity': 0.75,
          },
        })
        map.value.addLayer({
          id: 'prioridad-outline', type: 'line', source: 'prioridad-inversion',
          minzoom: 10, layout: { visibility: 'none' },
          paint: { 'line-color': 'rgba(0,0,0,0.2)', 'line-width': 0.4 },
        })
      } catch (e) { console.warn('[Atlas] prioridad-inversion:', e.message) }
    },
    'zonas-funcionales'() {
      try {
        if (map.value.getSource('zonas-funcionales')) return
        map.value.addSource('zonas-funcionales', { type: 'geojson', data: '/data/zonas_funcionales.geojson' })
        map.value.addLayer({
          id: 'zonas-funcionales-fill', type: 'fill', source: 'zonas-funcionales',
          layout: { visibility: 'none' },
          paint: { 'fill-color': ['coalesce', ['get', 'color'], '#f59e0b'], 'fill-opacity': 0.45 },
        })
        map.value.addLayer({
          id: 'zonas-funcionales-outline', type: 'line', source: 'zonas-funcionales',
          layout: { visibility: 'none' },
          paint: { 'line-color': ['coalesce', ['get', 'color'], '#f59e0b'], 'line-width': 1.5 },
        })
      } catch (e) { console.warn('[Atlas] zonas-funcionales:', e.message) }
    },
    'osm-landuse'() {
      try {
        if (map.value.getSource('osm-landuse')) return
        map.value.addSource('osm-landuse', { type: 'geojson', data: '/data/osm_landuse.geojson' })
        map.value.addLayer({
          id: 'osm-landuse-fill', type: 'fill', source: 'osm-landuse',
          layout: { visibility: 'none' },
          paint: {
            'fill-color': [
              'match', ['get', 'uso_osm'],
              'orchard', '#7CB342', 'residential', '#90A4AE', 'farmland', '#C8E6C9',
              'cemetery', '#78909C', 'forest', '#2E7D32', 'military', '#B71C1C',
              'industrial', '#546E7A', 'recreation_ground', '#26A69A', 'meadow', '#AED581',
              'commercial', '#FFA726', '#8fbc8f',
            ],
            'fill-opacity': 0.50,
          },
        })
        map.value.addLayer({
          id: 'osm-landuse-outline', type: 'line', source: 'osm-landuse',
          layout: { visibility: 'none' },
          paint: { 'line-color': 'rgba(255,255,255,0.2)', 'line-width': 0.5 },
        })
      } catch (e) { console.warn('[Atlas] osm-landuse:', e.message) }
    },
    equipamientos() {
      try {
        if (map.value.getSource('equipamientos')) return
        map.value.addSource('equipamientos', { type: 'geojson', data: '/data/equipamientos.geojson' })
        map.value.addLayer({
          id: 'equipamientos-points', type: 'circle', source: 'equipamientos',
          layout: { visibility: 'none' },
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 5, 15, 7],
            'circle-color': [
              'match', ['get', 'tipo_equipamiento'],
              'Educacion', '#F59E0B', 'Salud', '#3B82F6', 'Culto', '#A855F7',
              'Cultura', '#EC4899', 'Seguridad', '#EF4444', '#E65C00',
            ],
            'circle-opacity': 0.85, 'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(255,255,255,0.4)',
          },
        })
      } catch (e) { console.warn('[Atlas] equipamientos:', e.message) }
    },
    zomac() {
      if (map.value.getSource('zomac')) return
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
        paint: { 'line-color': '#ea580c', 'line-width': 1.2, 'line-dasharray': [4, 2] },
      })
    },
    'red-vial'() {
      try {
        if (map.value.getSource('red-vial')) return
        map.value.addSource('red-vial', { type: 'geojson', data: '/data/red_vial_primaria.geojson' })
        map.value.addLayer({
          id: 'red-vial-line', type: 'line', source: 'red-vial',
          layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['match', ['get', 'highway'],
              'trunk', '#dc2626', 'primary', '#f97316', 'secondary', '#eab308', '#94a3b8'],
            'line-width': ['match', ['get', 'highway'],
              'trunk', 3, 'primary', 2.5, 'secondary', 1.8, 1.2],
            'line-opacity': 0.85,
          },
        })
      } catch (e) { console.warn('[Atlas] red-vial:', e.message) }
    },
    'corpouraba-agua'() {
      try {
        if (map.value.getSource('corpouraba-agua')) return
        map.value.addSource('corpouraba-agua', { type: 'geojson', data: '/data/corpouraba_agua.geojson' })
        map.value.addLayer({
          id: 'corpouraba-puntos', type: 'circle', source: 'corpouraba-agua',
          layout: { visibility: 'none' },
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2, 12, 5, 15, 8],
            'circle-color': '#3b82f6', 'circle-stroke-color': '#1d4ed8', 'circle-stroke-width': 0.8,
            'circle-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 0.85],
          },
        })
      } catch (e) { console.warn('[Atlas] corpouraba-agua:', e.message) }
    },
    aislamiento() {
      try {
        if (map.value.getSource('aislamiento')) return
        map.value.addSource('aislamiento', { type: 'geojson', data: '/data/aislamiento_manzanas.geojson', promoteId: 'cod_manzana' })
        map.value.addLayer({
          id: 'aislamiento-fill', type: 'fill', source: 'aislamiento',
          minzoom: 9, layout: { visibility: 'none' },
          paint: {
            'fill-color': ['match', ['get', 'categoria_aislamiento'],
              'bien_conectado', '#1a9850', 'conectividad_media', '#a6d96a',
              'semi_aislado', '#fdae61', 'aislado_critico', '#dc2626', '#94a3b8'],
            'fill-opacity': 0.75,
          },
        })
      } catch (e) { console.warn('[Atlas] aislamiento:', e.message) }
    },
    'conflicto-uso'() {
      try {
        if (map.value.getSource('conflicto-uso')) return
        map.value.addSource('conflicto-uso', { type: 'geojson', data: '/data/conflicto_uso_manzanas.geojson', promoteId: 'cod_manzana' })
        map.value.addLayer({
          id: 'conflicto-fill', type: 'fill', source: 'conflicto-uso',
          minzoom: 9, layout: { visibility: 'none' },
          paint: {
            'fill-color': ['match', ['get', 'conflicto_uso'],
              'zona_exclusion', 'rgba(220,38,38,0.65)', 'expansion_urbana', 'rgba(249,115,22,0.65)', 'rgba(0,0,0,0)'],
            'fill-opacity': 1,
          },
        })
        map.value.addLayer({
          id: 'conflicto-outline', type: 'line', source: 'conflicto-uso',
          minzoom: 11, layout: { visibility: 'none' },
          paint: {
            'line-color': ['match', ['get', 'conflicto_uso'],
              'zona_exclusion', '#dc2626', 'expansion_urbana', '#f97316', 'rgba(0,0,0,0)'],
            'line-width': 0.6,
          },
        })
      } catch (e) { console.warn('[Atlas] conflicto-uso:', e.message) }
    },
    // Capas v2 — atlas enriquecido (GHSL + NDVI + Luminosidad): comparten UNA
    // sola fuente ('atlas-enriquecido', 11 MB); cada registrador la agrega solo
    // si aún no existe y añade únicamente su propia capa (guard por getLayer,
    // no por getSource, porque el source es compartido entre las 5).
    'enriquecido-atlas-v2'() {
      try {
        if (map.value.getLayer('enriquecido-atlas-v2')) return
        if (!map.value.getSource('atlas-enriquecido')) {
          map.value.addSource('atlas-enriquecido', { type: 'geojson', data: '/data/atlas_enriquecido.geojson', promoteId: '_fid' })
        }
        map.value.addLayer({
          id: 'enriquecido-atlas-v2', type: 'fill', source: 'atlas-enriquecido',
          minzoom: 10, layout: { visibility: 'none' },
          paint: {
            'fill-color': buildColorExpr('atlas_score_v2'),
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 0.55, 12, 0.82],
            'fill-color-transition': { duration: 500 },
          },
        })
      } catch (e) { console.warn('[Atlas] atlas-enriquecido:', e.message) }
    },
    'enriquecido-accesibilidad-v2'() {
      try {
        if (map.value.getLayer('enriquecido-accesibilidad-v2')) return
        if (!map.value.getSource('atlas-enriquecido')) {
          map.value.addSource('atlas-enriquecido', { type: 'geojson', data: '/data/atlas_enriquecido.geojson', promoteId: '_fid' })
        }
        map.value.addLayer({
          id: 'enriquecido-accesibilidad-v2', type: 'fill', source: 'atlas-enriquecido',
          minzoom: 10, layout: { visibility: 'none' },
          paint: {
            'fill-color': buildColorExpr('score_accesibilidad_v2'),
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 0.55, 12, 0.82],
            'fill-color-transition': { duration: 500 },
          },
        })
      } catch (e) { console.warn('[Atlas] atlas-enriquecido:', e.message) }
    },
    'enriquecido-ndvi'() {
      try {
        if (map.value.getLayer('enriquecido-ndvi')) return
        if (!map.value.getSource('atlas-enriquecido')) {
          map.value.addSource('atlas-enriquecido', { type: 'geojson', data: '/data/atlas_enriquecido.geojson', promoteId: '_fid' })
        }
        map.value.addLayer({
          id: 'enriquecido-ndvi', type: 'fill', source: 'atlas-enriquecido',
          minzoom: 10, layout: { visibility: 'none' },
          paint: {
            'fill-color': [
              'interpolate', ['linear'], ['to-number', ['get', 'score_ndvi'], 0],
              0.00, '#7f1d1d', 0.20, '#dc2626', 0.35, '#fbbf24',
              0.50, '#86efac', 0.70, '#22c55e', 0.85, '#166534', 1.00, '#052e16',
            ],
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 0.6, 12, 0.85],
            'fill-color-transition': { duration: 500 },
          },
        })
      } catch (e) { console.warn('[Atlas] atlas-enriquecido:', e.message) }
    },
    'enriquecido-impermeabilizacion'() {
      try {
        if (map.value.getLayer('enriquecido-impermeabilizacion')) return
        if (!map.value.getSource('atlas-enriquecido')) {
          map.value.addSource('atlas-enriquecido', { type: 'geojson', data: '/data/atlas_enriquecido.geojson', promoteId: '_fid' })
        }
        map.value.addLayer({
          id: 'enriquecido-impermeabilizacion', type: 'fill', source: 'atlas-enriquecido',
          minzoom: 10, layout: { visibility: 'none' },
          paint: {
            'fill-color': [
              'interpolate', ['linear'], ['to-number', ['get', 'impermeabilizacion'], 0],
              0.00, '#f0f9ff', 0.20, '#bae6fd', 0.40, '#7dd3fc',
              0.60, '#0ea5e9', 0.80, '#0369a1', 1.00, '#0c4a6e',
            ],
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 0.6, 12, 0.85],
            'fill-color-transition': { duration: 500 },
          },
        })
      } catch (e) { console.warn('[Atlas] atlas-enriquecido:', e.message) }
    },
    'enriquecido-ambiental-v2'() {
      try {
        if (map.value.getLayer('enriquecido-ambiental-v2')) return
        if (!map.value.getSource('atlas-enriquecido')) {
          map.value.addSource('atlas-enriquecido', { type: 'geojson', data: '/data/atlas_enriquecido.geojson', promoteId: '_fid' })
        }
        map.value.addLayer({
          id: 'enriquecido-ambiental-v2', type: 'fill', source: 'atlas-enriquecido',
          minzoom: 10, layout: { visibility: 'none' },
          paint: {
            'fill-color': buildColorExpr('score_ambiental_v2'),
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 0.55, 12, 0.82],
            'fill-color-transition': { duration: 500 },
          },
        })
      } catch (e) { console.warn('[Atlas] atlas-enriquecido:', e.message) }
    },
    catastro() {
      try {
        if (map.value.getSource('catastro')) return
        map.value.addSource('catastro', { type: 'geojson', data: '/data/catastro_igac_uraba.geojson' })
        map.value.addLayer({
          id: 'catastro-fill', type: 'fill', source: 'catastro',
          minzoom: 10, layout: { visibility: 'none' },
          paint: {
            'fill-color': ['interpolate', ['linear'], ['to-number', ['get', 'num_predios'], 0],
              0, '#1e1b4b', 20, '#4338ca', 60, '#6366f1', 120, '#a5b4fc', 250, '#e0e7ff'],
            'fill-opacity': 0.75,
          },
        })
        map.value.addLayer({
          id: 'catastro-outline', type: 'line', source: 'catastro',
          minzoom: 11, layout: { visibility: 'none' },
          paint: { 'line-color': 'rgba(255,255,255,0.2)', 'line-width': 0.4 },
        })
      } catch (e) { console.warn('[Atlas] catastro:', e.message) }
    },
    'red-vial-invias'() {
      try {
        if (map.value.getSource('red-vial-invias')) return
        map.value.addSource('red-vial-invias', { type: 'geojson', data: '/data/red_vial_invias.geojson' })
        map.value.addLayer({
          id: 'red-vial-invias-line', type: 'line', source: 'red-vial-invias',
          layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['match', ['get', 'highway'],
              'primary', '#dc2626', 'secondary', '#f97316', 'tertiary', '#eab308', '#94a3b8'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 8,
              ['match', ['get', 'highway'], 'primary', 3, 'secondary', 2.2, 1.4],
              14,
              ['match', ['get', 'highway'], 'primary', 5, 'secondary', 4, 3]],
            'line-opacity': 0.9,
          },
        })
      } catch (e) { console.warn('[Atlas] red-vial-invias:', e.message) }
    },
    'sui-servicios'() {
      try {
        if (map.value.getSource('sui-servicios')) return
        map.value.addSource('sui-servicios', { type: 'geojson', data: '/data/sui_servicios.geojson' })
        map.value.addLayer({
          id: 'sui-servicios-fill', type: 'fill', source: 'sui-servicios',
          layout: { visibility: 'none' },
          paint: {
            'fill-color': ['interpolate', ['linear'], ['to-number', ['get', 'pct_acueducto'], 0],
              0, '#7f1d1d', 40, '#dc2626', 60, '#f59e0b', 80, '#a8ddb5', 100, '#1d91c0'],
            'fill-opacity': 0.8,
          },
        })
        map.value.addLayer({
          id: 'sui-servicios-outline', type: 'line', source: 'sui-servicios',
          layout: { visibility: 'none' },
          paint: { 'line-color': 'rgba(255,255,255,0.4)', 'line-width': 1.2 },
        })
      } catch (e) { console.warn('[Atlas] sui-servicios:', e.message) }
    },
    'terridata-full'() {
      try {
        if (map.value.getSource('terridata-full')) return
        map.value.addSource('terridata-full', { type: 'geojson', data: '/data/terridata_full.geojson' })
        map.value.addLayer({
          id: 'terridata-full-fill', type: 'fill', source: 'terridata-full',
          layout: { visibility: 'none' },
          paint: {
            'fill-color': ['interpolate', ['linear'], ['to-number', ['get', 'nbi_total'], 0],
              10, '#1a9850', 25, '#a6d96a', 40, '#fdae61', 55, '#f46d43', 70, '#d73027'],
            'fill-opacity': 0.8,
          },
        })
        map.value.addLayer({
          id: 'terridata-full-outline', type: 'line', source: 'terridata-full',
          layout: { visibility: 'none' },
          paint: { 'line-color': 'rgba(255,255,255,0.4)', 'line-width': 1.2 },
        })
      } catch (e) { console.warn('[Atlas] terridata-full:', e.message) }
    },
    'resguardos-ant'() {
      try {
        if (map.value.getSource('resguardos-ant')) return
        map.value.addSource('resguardos-ant', { type: 'geojson', data: '/data/resguardos_ant.geojson' })
        map.value.addLayer({
          id: 'resguardos-ant-fill', type: 'fill', source: 'resguardos-ant',
          layout: { visibility: 'none' },
          paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.35 },
        })
        map.value.addLayer({
          id: 'resguardos-ant-outline', type: 'line', source: 'resguardos-ant',
          layout: { visibility: 'none' },
          paint: { 'line-color': '#6d28d9', 'line-width': 1.5 },
        })
      } catch (e) { console.warn('[Atlas] resguardos-ant:', e.message) }
    },
    runap() {
      try {
        if (map.value.getSource('runap')) return
        map.value.addSource('runap', { type: 'geojson', data: '/data/runap_areas.geojson' })
        map.value.addLayer({
          id: 'runap-fill', type: 'fill', source: 'runap',
          layout: { visibility: 'none' },
          paint: { 'fill-color': '#166534', 'fill-opacity': 0.4 },
        })
        map.value.addLayer({
          id: 'runap-outline', type: 'line', source: 'runap',
          layout: { visibility: 'none' },
          paint: { 'line-color': '#15803d', 'line-width': 1.5, 'line-dasharray': [5, 2] },
        })
      } catch (e) { console.warn('[Atlas] runap:', e.message) }
    },
    // ── IRCA (calidad de agua, INS-SIVICAP) y seguridad (homicidios, SIEDCO/
    // MinDefensa) — municipios.geojson no trae estas propiedades: se hace el
    // join en runtime contra irca_municipios.json / seguridad_municipios.json.
    // El registro de addSource/addLayer se difiere hasta que ambos fetch()
    // resuelvan (fail-quiet: si el JSON no carga, la capa simplemente no se
    // agrega). Como el fetch es async, el guard "ya registrada" vive tanto al
    // entrar (evita doble fetch en toggles rápidos) como tras resolver (evita
    // doble addSource si toggleSatellite() reinvoca el registrador mientras el
    // primer fetch seguía en vuelo).
    irca() {
      if (map.value.getSource('irca-municipios')) return
      ;(async () => {
        try {
          const data = await fetch('/data/irca_municipios.json').then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.json()
          })
          if (!map.value || map.value.getSource('irca-municipios')) return
          ircaTooltipData = data

          const NIVEL_COLOR = {
            'Sin riesgo':              '#1a9850',
            'Riesgo bajo':             '#a6d96a',
            'Riesgo medio':            '#fdae61',
            'Riesgo alto':             '#f46d43',
            'Inviable sanitariamente': '#d73027',
          }
          const matchExpr = ['match', ['get', 'municipio']]
          let pares = 0
          Object.entries(data.municipios || {}).forEach(([nombre, anios]) => {
            const years = Object.keys(anios || {}).filter(y => anios[y]?.irca != null).sort()
            const last = years[years.length - 1]
            if (!last) return
            matchExpr.push(nombre.toUpperCase(), NIVEL_COLOR[anios[last].nivel] || '#888888')
            pares++
          })
          if (pares === 0) return  // sin datos utilizables — no registrar la capa
          matchExpr.push('rgba(80,80,80,0.25)')  // default: municipio sin dato

          map.value.addSource('irca-municipios', {
            type: 'geojson', data: '/data/municipios.geojson', promoteId: 'municipio',
          })
          map.value.addLayer({
            id: 'irca-fill', type: 'fill', source: 'irca-municipios',
            layout: { visibility: layerVisibility.irca ? 'visible' : 'none' },
            paint: { 'fill-color': matchExpr, 'fill-opacity': 0.72 },
          })
          map.value.addLayer({
            id: 'irca-outline', type: 'line', source: 'irca-municipios',
            layout: { visibility: layerVisibility.irca ? 'visible' : 'none' },
            paint: { 'line-color': 'rgba(255,255,255,0.4)', 'line-width': 1.2 },
          })
        } catch (e) { console.warn('[Atlas] irca:', e.message) }
      })()
    },
    seguridad() {
      if (map.value.getSource('seguridad-municipios')) return
      ;(async () => {
        try {
          const data = await fetch('/data/seguridad_municipios.json').then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.json()
          })
          if (!map.value || map.value.getSource('seguridad-municipios')) return
          seguridadTooltipData = data

          // Rampa secuencial discreta (ColorBrewer Reds 5 clases) sobre tasa x 100k
          const TASA_BREAKS = [
            { max: 10, color: '#fee5d9' },
            { max: 15, color: '#fcae91' },
            { max: 20, color: '#fb6a4a' },
            { max: 25, color: '#de2d26' },
            { max: Infinity, color: '#a50f15' },
          ]
          const colorForTasa = (t) => (TASA_BREAKS.find(b => t <= b.max) || TASA_BREAKS[TASA_BREAKS.length - 1]).color

          const ANIOS_PARCIALES = ['2025', '2026']
          const matchExpr = ['match', ['get', 'municipio']]
          let pares = 0
          Object.entries(data.municipios || {}).forEach(([nombre, anios]) => {
            const years = Object.keys(anios || {})
              .filter(y => !ANIOS_PARCIALES.includes(y) && anios[y]?.tasa_100k != null)
              .sort()
            const last = years[years.length - 1]
            if (!last) return
            matchExpr.push(nombre.toUpperCase(), colorForTasa(anios[last].tasa_100k))
            pares++
          })
          if (pares === 0) return
          matchExpr.push('rgba(80,80,80,0.25)')

          map.value.addSource('seguridad-municipios', {
            type: 'geojson', data: '/data/municipios.geojson', promoteId: 'municipio',
          })
          map.value.addLayer({
            id: 'seguridad-fill', type: 'fill', source: 'seguridad-municipios',
            layout: { visibility: layerVisibility.seguridad ? 'visible' : 'none' },
            paint: { 'fill-color': matchExpr, 'fill-opacity': 0.72 },
          })
          map.value.addLayer({
            id: 'seguridad-outline', type: 'line', source: 'seguridad-municipios',
            layout: { visibility: layerVisibility.seguridad ? 'visible' : 'none' },
            paint: { 'line-color': 'rgba(255,255,255,0.4)', 'line-width': 1.2 },
          })
        } catch (e) { console.warn('[Atlas] seguridad:', e.message) }
      })()
    },
  }


  // ─── Inicialización del mapa ────────────────────────────────────────────────
  async function initMap() {
    _maplibregl = (await import('maplibre-gl')).default

    // Registrar protocolo PMTiles para vector tiles locales
    const { Protocol } = await import('pmtiles')
    const protocol = new Protocol()
    _maplibregl.addProtocol('pmtiles', protocol.tile.bind(protocol))

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

    // Fallback de 8 segundos como garantía mínima (margen para móvil lento:
    // a 4s el overlay se cerraba antes de que tiles/manzanas terminaran de cargar)
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
  async function loadAtlasLayer() {
    // Source principal de manzanas — PMTiles (Z9-Z14, 2.5MB) con fallback GeoJSON.
    // Los fallos de PMTiles son ASÍNCRONOS (addSource no lanza ante un 404 o un
    // archivo corrupto: el error llega por el evento 'error' del mapa), así que el
    // try/catch nunca activaba el fallback. Comprobamos disponibilidad del archivo
    // antes de elegir el tipo de source para que el fallback sea alcanzable.
    // El content-type descarta el falso positivo de un host que responde 200 con
    // el index.html (SPA fallback) en vez del binario: si llega text/html, el
    // .pmtiles no existe realmente y vamos a GeoJSON.
    let usePmtiles = true
    try {
      const head = await fetch('/data/atlas.pmtiles', { method: 'HEAD' })
      const ct = head.headers.get('content-type') || ''
      usePmtiles = head.ok && !ct.includes('text/html')
    } catch {
      usePmtiles = false
    }
    if (usePmtiles) {
      map.value.addSource('atlas', {
        type:      'vector',
        url:       'pmtiles:///data/atlas.pmtiles',
        promoteId: '_fid',
        minzoom:   9,
        maxzoom:   14,
      })
    } else {
      console.warn('[Atlas] PMTiles no disponible — fallback a GeoJSON')
      map.value.addSource('atlas', { type: 'geojson', data: '/data/atlas.geojson', promoteId: '_fid' })
    }

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
      layout: { visibility: 'visible' },  // activado por defecto — toggle desde panel Capas
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
      id:           'manzanas-fill',
      type:         'fill',
      source:       'atlas',
      'source-layer': 'manzanas',
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
      id:             'manzanas-stroke',
      type:           'line',
      source:         'atlas',
      'source-layer': 'manzanas',
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
      id:             'manzanas-3d',
      type:           'fill-extrusion',
      source:         'atlas',
      'source-layer': 'manzanas',
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

    // Las capas OPCIONALES (equipamientos, ambientales, catastro, etc.) ya NO se
    // registran aquí: se agregan de forma perezosa (lazy) la primera vez que el
    // usuario las activa. Ver optionalLayerRegistrars + toggleLayer() más abajo.

    setupInteraction(_maplibregl)

    // Cargar stats pre-computados desde JSON (PMTiles no soporta querySourceFeatures
    // completo). Si el fetch falla, reintentamos y, como último recurso, recalculamos
    // desde el GeoJSON para no dejar todos los scores en '—' durante la sesión.
    async function loadStats() {
      const fetchJson = (url) => fetch(url).then(r => {
        if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`)
        return r.json()
      })
      // Normalizar claves: JSON usa MAYÚSCULAS, store usa "Apartadó" etc.
      const normalize = (statsJson) => {
        const upperIndex = {}
        Object.entries(statsJson).forEach(([k, v]) => { upperIndex[k.toUpperCase()] = v })
        const normalized = { Todos: statsJson.Todos }
        MUNICIPIOS?.forEach(m => {
          const hit = upperIndex[m.nombre.toUpperCase()]
          if (hit) normalized[m.nombre] = hit
        })
        // Fallback: si MUNICIPIOS no está expuesto, usar claves directamente
        return Object.keys(normalized).length > 1 ? normalized : statsJson
      }

      let baseLoaded = false
      try {
        store.setStats(normalize(await fetchJson('/data/atlas_stats.json')))
        baseLoaded = true
      } catch (e1) {
        console.warn('[Atlas] atlas_stats.json falló, reintentando:', e1.message)
        try {
          store.setStats(normalize(await fetchJson('/data/atlas_stats.json')))
          baseLoaded = true
        } catch (e2) {
          console.warn('[Atlas] recalculando stats desde GeoJSON:', e2.message)
          try {
            const geo = await fetchJson('/data/atlas.geojson')
            computeStatsFromFeatures(geo.features || [])  // hace store.setStats internamente
            baseLoaded = true
          } catch (e3) {
            console.error('[Atlas] no se pudieron cargar stats:', e3.message)
          }
        }
      }
      if (!baseLoaded) return  // sin base, v2 dejaría stats con solo dimensiones v2 (scores core ausentes)
      requestAnimationFrame(() => updateMunicipioFeatureStates())

      // Cargar stats v2 (NDVI, luminosidad, GHSL) SIEMPRE después de las base:
      // setStats reemplaza el objeto entero, así que si v2 llegara primero su merge
      // se perdería al sobrescribirse. Encadenarlo elimina esa carrera.
      try {
        store.setStatsV2(await fetchJson('/data/atlas_stats_v2.json'))
      } catch (e) {
        console.warn('[Atlas] stats_v2 load error:', e.message)
      }
    }
    loadStats()

    // Aplicar feature-state a municipios cuando ese source carga
    map.value.on('sourcedata', (e) => {
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

    if (optionalLayerRegistrars[id]) optionalLayerRegistrars[id]()

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

  // ─── Toggle modo de mapa: cicla 0→1→2→0 (Dark → Satélite → Calles → Dark) ────
  function toggleSatellite() {
    if (!map.value) return mapMode

    mapMode = (mapMode + 1) % MAP_STYLES.length

    // Capas opcionales activas ANTES de cambiar de estilo — setStyle() destruye
    // todas las sources/layers agregadas por loadAtlasLayer() (incluidas las
    // lazy ya registradas), así que hay que volver a registrarlas y mostrarlas
    // tras el reload. activeLayers es el Set reactivo que ya usa el panel de
    // capas para saber qué está encendido — se usa como fuente de verdad en vez
    // de re-derivar el estado desde layerVisibility.
    const activeBeforeReload = new Set(activeLayers.value)

    // setStyle destruye todas las sources y layers — recargar tras styledata
    map.value.once('styledata', () => {
      // Esperar a que el nuevo estilo esté completamente cargado
      const reload = async () => {
        if (!map.value.isStyleLoaded()) {
          setTimeout(reload, 100)
          return
        }
        try {
          // loadAtlasLayer es async (preflight del PMTiles): await para que un
          // rechazo caiga en este catch y no escape como unhandled rejection,
          // y para que la restauración de capas opcionales corra tras la recarga.
          await loadAtlasLayer()
          // Re-registrar (lazy) y volver a mostrar las capas opcionales que el
          // usuario ya había activado. 'veredas'/'municipios' son BASE: ya
          // vuelven visibles por defecto desde loadAtlasLayer, no se tocan aquí.
          activeBeforeReload.forEach((id) => {
            if (id === 'veredas' || id === 'municipios') return
            setTimeout(() => {
              try {
                if (optionalLayerRegistrars[id]) optionalLayerRegistrars[id]()
                ;(layerMap[id] || []).forEach(layerId => {
                  map.value.setLayoutProperty(layerId, 'visibility', 'visible')
                })
              } catch (e) { console.warn('[Atlas] toggleSatellite restore capa:', e.message) }
            }, 200)
          })
        } catch (e) {
          console.warn('[Atlas] toggleSatellite reload error:', e.message)
        }
      }
      setTimeout(reload, 300)
    })

    map.value.setStyle(MAP_STYLES[mapMode])
    return mapMode
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

    // La fuente 'atlas' es vector PMTiles → setFeatureState exige sourceLayer.
    // En el fallback GeoJSON no se especifica (lo ignoraría / lanzaría error).
    const src = map.value.getSource('atlas')?.type === 'vector'
      ? { source: 'atlas', sourceLayer: 'manzanas' }
      : { source: 'atlas' }

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
    setupIndicadoresInteraction(maplibregl)
  }

  // ─── Tooltips IRCA / seguridad (coropléticas municipales runtime-join) ─────
  function setupIndicadoresInteraction(maplibregl) {
    const tooltipInd = new maplibregl.Popup({
      closeButton:  false,
      closeOnClick: false,
      className:    'atlas-tooltip',
      maxWidth:     '260px',
      offset:       [0, -4],
    })

    const buscarMunicipio = (dataset, nombreUpper) => {
      const entries = Object.entries(dataset?.municipios || {})
      const hit = entries.find(([k]) => k.toUpperCase() === nombreUpper)
      return hit ? hit[1] : null
    }

    map.value.on('mousemove', 'irca-fill', (e) => {
      if (!e.features?.length) return
      map.value.getCanvas().style.cursor = 'pointer'
      const nombre = e.features[0].properties?.municipio || ''
      const anios  = buscarMunicipio(ircaTooltipData, nombre)
      const years  = Object.keys(anios || {}).filter(y => anios[y]?.irca != null).sort()
      const last   = years[years.length - 1]
      const d      = last ? anios[last] : null
      const html = `<div style="font-family:'Inter',sans-serif;font-size:12px;color:#E6EDF3;min-width:180px">
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;margin-bottom:4px">${nombre}</div>
        ${d
          ? `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8B949E">IRCA ${last}: <span style="color:#E6EDF3">${d.irca}</span> · ${d.nivel}</div>`
          : `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8B949E">Sin dato IRCA</div>`}
        <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:7px;color:#555;text-transform:uppercase;letter-spacing:.08em">INS — SIVICAP</div>
      </div>`
      tooltipInd.setLngLat(e.lngLat).setHTML(html).addTo(map.value)
    })
    map.value.on('mouseleave', 'irca-fill', () => {
      map.value.getCanvas().style.cursor = ''
      tooltipInd.remove()
    })

    map.value.on('mousemove', 'seguridad-fill', (e) => {
      if (!e.features?.length) return
      map.value.getCanvas().style.cursor = 'pointer'
      const nombre = e.features[0].properties?.municipio || ''
      const anios  = buscarMunicipio(seguridadTooltipData, nombre)
      const years  = Object.keys(anios || {}).filter(y => !['2025', '2026'].includes(y) && anios[y]?.tasa_100k != null).sort()
      const last   = years[years.length - 1]
      const d      = last ? anios[last] : null
      const html = `<div style="font-family:'Inter',sans-serif;font-size:12px;color:#E6EDF3;min-width:200px">
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;margin-bottom:4px">${nombre}</div>
        ${d
          ? `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8B949E">${last}: <span style="color:#E6EDF3">${d.homicidios} hechos</span> · tasa ${d.tasa_100k}/100k</div>`
          : `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8B949E">Sin dato</div>`}
        <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:7px;color:#555;text-transform:uppercase;letter-spacing:.08em">Hechos reportados · SIEDCO/MinDefensa</div>
      </div>`
      tooltipInd.setLngLat(e.lngLat).setHTML(html).addTo(map.value)
    })
    map.value.on('mouseleave', 'seguridad-fill', () => {
      map.value.getCanvas().style.cursor = ''
      tooltipInd.remove()
    })
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
      // Agregado regional 'Todos': promedio ponderado por nº de manzanas. La ruta
      // JSON lo trae precomputado; aquí lo reconstruimos para que statsTodos no
      // quede vacío en el fallback (paneles de promedio Urabá lo leen).
      const totalCount = Object.values(stats).reduce((s, v) => s + v.count, 0)
      const todos = { count: totalCount, avg: {} }
      dims.forEach(d => {
        todos.avg[d] = totalCount
          ? Object.values(stats).reduce((s, v) => s + (v.avg[d] ?? 0) * v.count, 0) / totalCount
          : 0
      })
      store.setStats({ Todos: todos, ...stats })
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

  // Indicadores v2 disponibles si el feature proviene de atlas_enriquecido
  const hasV2 = p.atlas_score_v2 != null
  const v2HTML = hasV2 ? `
    <div style="margin-top:8px;padding-top:6px;border-top:1px solid #1e2738">
      <div style="font-family:'JetBrains Mono',monospace;font-size:7px;text-transform:uppercase;letter-spacing:.18em;color:#06b6d4;margin-bottom:4px">Indicadores v2</div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:2px 10px">
        ${[['Atlas v2','atlas_score_v2','#06b6d4'],['Acces. v2','score_accesibilidad_v2','#38bdf8'],['NDVI','score_ndvi','#4ade80']].map(([l,k,c]) => `
        <span style="color:#8B949E;font-size:8px;font-family:'JetBrains Mono',monospace">${l}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${c}">${pct(p[k])}</span>`).join('')}
      </div>
    </div>` : ''

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
    ${v2HTML}
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
