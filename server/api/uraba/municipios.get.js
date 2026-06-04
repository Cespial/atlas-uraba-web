// GET /api/uraba/municipios — los 8 municipios con atlas_score_v3 y las 4 dimensiones.
import { FUENTE, readData, setApiHeaders } from '../../utils/uraba'

// Redondea a 4 decimales conservando null/undefined.
const r = (n) => (typeof n === 'number' ? Math.round(n * 10000) / 10000 : null)

export default defineEventHandler(async (event) => {
  setApiHeaders(event)
  const stats = await readData('atlas_stats_v3.json')

  // Mapa nombre -> posición en el ranking oficial v3.
  const rankIndex = {}
  ;(stats.ranking_municipios_v3 || []).forEach((m, i) => {
    rankIndex[m.municipio] = i + 1
  })

  const municipios = Object.entries(stats.municipios || {})
    .map(([nombre, d]) => ({
      municipio: nombre,
      atlas_score_v3: r(d.avg?.atlas_score_v3),
      ranking: rankIndex[nombre] ?? null,
      manzanas: d.count ?? null,
      dimensiones: {
        accesibilidad: r(d.avg?.score_accesibilidad_v3),
        ambiental: r(d.avg?.score_ambiental_v3),
        socioeconomico: r(d.avg?.score_socioeconomico_v3),
        seguridad: r(d.avg?.score_seguridad),
      },
    }))
    .sort((a, b) => (b.atlas_score_v3 ?? 0) - (a.atlas_score_v3 ?? 0))

  return {
    total: municipios.length,
    municipios,
    fuente: FUENTE,
  }
})
