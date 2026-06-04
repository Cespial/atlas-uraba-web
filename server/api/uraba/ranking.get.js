// GET /api/uraba/ranking — ranking de municipios ordenado por atlas_score_v3.
import { FUENTE, readData, setApiHeaders } from '../../utils/uraba'

const r = (n) => (typeof n === 'number' ? Math.round(n * 10000) / 10000 : null)

export default defineEventHandler(async (event) => {
  setApiHeaders(event)
  const stats = await readData('atlas_stats_v3.json')

  // El stats trae el ranking oficial v3; lo enriquecemos con dimensiones.
  const base = stats.ranking_municipios_v3 || []
  const ranking = base.map((m, i) => {
    const d = stats.municipios?.[m.municipio]
    return {
      ranking: i + 1,
      municipio: m.municipio,
      atlas_score_v3: r(m.atlas_score_v3),
      dimensiones: d
        ? {
            accesibilidad: r(d.avg?.score_accesibilidad_v3),
            ambiental: r(d.avg?.score_ambiental_v3),
            socioeconomico: r(d.avg?.score_socioeconomico_v3),
            seguridad: r(d.avg?.score_seguridad),
          }
        : null,
    }
  })

  return {
    total: ranking.length,
    formula: stats._meta?.formula ?? null,
    ranking,
    fuente: FUENTE,
  }
})
