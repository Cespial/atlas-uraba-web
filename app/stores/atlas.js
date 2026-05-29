import { defineStore } from 'pinia'

export const DIMENSIONES = [
  { key: 'atlas_score',         label: 'Índice Atlas',      color: '#4ade80' },
  { key: 'score_accesibilidad', label: 'Accesibilidad',     color: '#60a5fa' },
  { key: 'score_socioeconomico',label: 'Socioeconómico',    color: '#a78bfa' },
  { key: 'score_ambiental',     label: 'Ambiental',         color: '#34d399' },
  { key: 'score_seguridad',     label: 'Seguridad',         color: '#f59e0b' },
]

export const MUNICIPIOS = [
  { nombre: 'Todos',              lat: 7.90, lng: -76.65, zoom: 9  },
  { nombre: 'Apartadó',          lat: 7.885, lng: -76.627, zoom: 13 },
  { nombre: 'Turbo',             lat: 8.098, lng: -76.731, zoom: 13 },
  { nombre: 'Chigorodó',         lat: 7.666, lng: -76.685, zoom: 13 },
  { nombre: 'Carepa',            lat: 7.755, lng: -76.654, zoom: 13 },
  { nombre: 'Necoclí',           lat: 8.447, lng: -76.783, zoom: 13 },
  { nombre: 'Arboletes',         lat: 8.872, lng: -76.428, zoom: 13 },
  { nombre: 'San Pedro de Urabá',lat: 8.283, lng: -76.409, zoom: 13 },
  { nombre: 'San Juan de Urabá', lat: 8.766, lng: -76.532, zoom: 13 },
]

// Escala rojo → amarillo → verde (igual que matrizbht.cl)
export const COLOR_SCALE = [
  'interpolate', ['linear'], ['get', '__score'],
  0.0, '#d73027',
  0.2, '#f46d43',
  0.4, '#fdae61',
  0.5, '#fee08b',
  0.6, '#d9ef8b',
  0.8, '#a6d96a',
  1.0, '#1a9850',
]

export const useAtlasStore = defineStore('atlas', {
  state: () => ({
    dimension:          'atlas_score',
    municipioActivo:    'Todos',
    manzanaSeleccionada: null,
    cargando:           true,
    stats:              {},        // stats por municipio
  }),

  getters: {
    dimensionActual: (s) => DIMENSIONES.find(d => d.key === s.dimension),
    municipioConfig: (s) => MUNICIPIOS.find(m => m.nombre === s.municipioActivo),
  },

  actions: {
    setDimension(key) { this.dimension = key },
    setMunicipio(nombre) { this.municipioActivo = nombre },
    selectManzana(props) { this.manzanaSeleccionada = props },
    clearManzana() { this.manzanaSeleccionada = null },
    setStats(stats) { this.stats = stats },
    setLoaded() { this.cargando = false },
  },
})
