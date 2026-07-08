// GET /api/uraba/ranking — ranking de municipios ordenado por atlas_score_v3.
// Ola 2 (adopción v3.1): lee atlas_stats_v31.json (score_seguridad reconstruido,
// ver docs/investigacion/2026-07-07/impacto-v31.md). El campo de respuesta se
// mantiene `atlas_score_v3` por compatibilidad del contrato público — su valor
// ya refleja la metodología v3.1 (ver `formula` en la respuesta).
import { FUENTE, readData, setApiHeaders } from '../../utils/uraba'

const r = (n) => (typeof n === 'number' ? Math.round(n * 10000) / 10000 : null)

export default defineEventHandler(async (event) => {
  setApiHeaders(event)
  const stats = await readData('atlas_stats_v31.json')

  // El stats trae el ranking oficial v3.1; lo enriquecemos con dimensiones.
  const base = stats.ranking_municipios_v31 || []
  const ranking = base.map((m, i) => {
    const d = stats.municipios?.[m.municipio]
    return {
      ranking: i + 1,
      municipio: m.municipio,
      atlas_score_v3: r(m.atlas_score_v31),
      dimensiones: d
        ? {
            accesibilidad: r(d.avg?.score_accesibilidad_v3),
            ambiental: r(d.avg?.score_ambiental_v3),
            socioeconomico: r(d.avg?.score_socioeconomico_v3),
            seguridad: r(d.avg?.score_seguridad_v31),
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
