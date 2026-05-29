import { defineStore } from 'pinia'

export const DIMENSIONES = [
  { key: 'atlas_score',          label: 'Índice Atlas',   color: '#1B6B6D' },
  { key: 'score_accesibilidad',  label: 'Accesibilidad',  color: '#60a5fa' },
  { key: 'score_socioeconomico', label: 'Socioeconómico', color: '#a78bfa' },
  { key: 'score_ambiental',      label: 'Ambiental',      color: '#34d399' },
  { key: 'score_seguridad',      label: 'Seguridad',      color: '#fbbf24' },
]

export const MUNICIPIOS = [
  { nombre: 'Todos',              lat: 7.90,  lng: -76.65,  zoom: 9  },
  { nombre: 'Apartadó',          lat: 7.885, lng: -76.627, zoom: 13 },
  { nombre: 'Turbo',             lat: 8.098, lng: -76.731, zoom: 13 },
  { nombre: 'Chigorodó',         lat: 7.666, lng: -76.685, zoom: 13 },
  { nombre: 'Carepa',            lat: 7.755, lng: -76.654, zoom: 13 },
  { nombre: 'Necoclí',           lat: 8.447, lng: -76.783, zoom: 13 },
  { nombre: 'Arboletes',         lat: 8.872, lng: -76.428, zoom: 13 },
  { nombre: 'San Pedro de Urabá',lat: 8.283, lng: -76.409, zoom: 13 },
  { nombre: 'San Juan de Urabá', lat: 8.766, lng: -76.532, zoom: 13 },
]

export const COLOR_EXPR_TEMPLATE = [
  'interpolate', ['linear'], ['to-number', ['get', '__FIELD__'], 0],
  0.0, '#d73027', 0.2, '#f46d43', 0.4, '#fdae61',
  0.55,'#a6d96a', 0.7, '#66bd63', 1.0, '#1a9850',
]

export const useAtlasStore = defineStore('atlas', {
  state: () => ({
    dimension:           'atlas_score',
    municipioActivo:     'Todos',
    manzanaSeleccionada: null,
    cargando:            true,
    error:               null,
    stats:               {},
    filterMin:           0,
    filterMax:           1,
    zonaFilter:          ['HH','LL','HL','LH','NS'],
  }),

  getters: {
    dimensionActual: (s) => DIMENSIONES.find(d => d.key === s.dimension) ?? DIMENSIONES[0],
    municipioConfig: (s) => MUNICIPIOS.find(m => m.nombre === s.municipioActivo),
    hasFilters: (s) => s.filterMin > 0 || s.filterMax < 1 || s.zonaFilter.length < 5,
    regionScore: (s) => {
      const vals = Object.values(s.stats)
      if (!vals.length) return 0
      const total = vals.reduce((acc, v) => acc + v.count, 0) || 1
      return vals.reduce((acc, v) => acc + (v.avg?.atlas_score ?? 0) * v.count, 0) / total
    },
  },

  actions: {
    setDimension(key)  { this.dimension = key },
    setMunicipio(n)    { this.municipioActivo = n },
    selectManzana(p)   { this.manzanaSeleccionada = p },
    clearManzana()     { this.manzanaSeleccionada = null },
    setStats(s)        { this.stats = s },
    setLoaded()        { this.cargando = false },
    setError(msg)      { this.error = msg; this.cargando = false },
    setFilterMin(v)    { this.filterMin = Math.min(+v, this.filterMax) },
    setFilterMax(v)    { this.filterMax = Math.max(+v, this.filterMin) },
    toggleZonaFilter(key) {
      if (this.zonaFilter.includes(key)) {
        this.zonaFilter = this.zonaFilter.filter(z => z !== key)
      } else {
        this.zonaFilter.push(key)
      }
    },
    resetFilters() {
      this.filterMin = 0
      this.filterMax = 1
      this.zonaFilter = ['HH','LL','HL','LH','NS']
    },
  },

  persist: {
    pick: ['dimension','municipioActivo'],
  },
})
