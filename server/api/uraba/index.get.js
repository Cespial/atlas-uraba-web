// GET /api/uraba — índice de la API pública.
import { FUENTE, setApiHeaders } from '../../utils/uraba'

export default defineEventHandler((event) => {
  setApiHeaders(event)
  return {
    nombre: 'Atlas Urabá — API pública',
    version: 'v3',
    descripcion:
      'API REST pública del Atlas de Bienestar Humano Territorial de Urabá (Antioquia, Colombia). ' +
      'Expone el Índice de Bienestar (atlas_score_v3) y sus 4 dimensiones —Accesibilidad, Ambiental, ' +
      'Socioeconómico y Seguridad— para 8 municipios y 7.028 manzanas censales.',
    cobertura: {
      municipios: 8,
      manzanas: 7028,
      dimensiones: ['accesibilidad', 'ambiental', 'socioeconomico', 'seguridad'],
    },
    formula: 'atlas_score_v3 = (0.40*accesibilidad + 0.25*ambiental + 0.25*socioeconomico + 0.20*seguridad) / 1.10',
    endpoints: [
      { metodo: 'GET', ruta: '/api/uraba', descripcion: 'Índice de la API (este documento).' },
      { metodo: 'GET', ruta: '/api/uraba/municipios', descripcion: 'Los 8 municipios con su atlas_score_v3 y las 4 dimensiones.' },
      { metodo: 'GET', ruta: '/api/uraba/municipio/{nombre}', descripcion: 'Detalle de un municipio: score, dimensiones, ranking, narrativa y top5. Nombre case/acentos-insensible.' },
      { metodo: 'GET', ruta: '/api/uraba/ranking', descripcion: 'Ranking de municipios ordenado por atlas_score_v3.' },
      { metodo: 'GET', ruta: '/api/uraba/manzana/{cod}', descripcion: 'Propiedades de una manzana por cod_manzana.' },
    ],
    fuente: FUENTE,
  }
})
