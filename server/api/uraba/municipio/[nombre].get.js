// GET /api/uraba/municipio/[nombre] — detalle de un municipio.
// Combina atlas_stats_v3.json (score + dimensiones + ranking) con
// gap_analysis.json (narrativa, fortaleza, debilidad, gaps) y construye un
// top5 de manzanas con mayor atlas_score_v3 desde atlas.geojson.
// El nombre es case/acentos-insensible.
import { FUENTE, readData, normalize, notFound, setApiHeaders } from '../../../utils/uraba'

const r = (n) => (typeof n === 'number' ? Math.round(n * 10000) / 10000 : null)

export default defineEventHandler(async (event) => {
  setApiHeaders(event)
  const slug = normalize(getRouterParam(event, 'nombre'))

  const [stats, gaps, atlas] = await Promise.all([
    readData('atlas_stats_v3.json'),
    readData('gap_analysis.json'),
    readData('atlas.geojson'),
  ])

  // Resuelve el nombre canónico contra las claves de stats (case/acentos-insensible).
  const canonico = Object.keys(stats.municipios || {}).find((k) => normalize(k) === slug)
  if (!canonico) {
    throw notFound(`Municipio no encontrado: "${getRouterParam(event, 'nombre')}". Consulta /api/uraba/municipios para ver los disponibles.`)
  }

  const d = stats.municipios[canonico]
  const g = gaps[canonico] || {}

  // Ranking oficial v3.
  const ranking =
    (stats.ranking_municipios_v3 || []).findIndex((m) => m.municipio === canonico) + 1 || null

  // top5: manzanas del municipio con mayor atlas_score_v3.
  const top5 = (atlas.features || [])
    .filter((f) => f.properties?.municipio === canonico)
    .map((f) => f.properties)
    .sort((a, b) => (b.atlas_score_v3 ?? 0) - (a.atlas_score_v3 ?? 0))
    .slice(0, 5)
    .map((p) => ({
      cod_manzana: p.cod_manzana,
      atlas_score_v3: r(p.atlas_score_v3),
      quintil: p.quintil_v3 ?? p.quintil ?? null,
      zona_atlas: p.zona_atlas ?? null,
      dimensiones: {
        accesibilidad: r(p.score_accesibilidad_v3),
        ambiental: r(p.score_ambiental_v3),
        socioeconomico: r(p.score_socioeconomico_v3),
        seguridad: r(p.score_seguridad),
      },
    }))

  return {
    municipio: canonico,
    ranking,
    total_municipios: Object.keys(stats.municipios || {}).length,
    atlas_score_v3: r(d.avg?.atlas_score_v3),
    atlas_score_100: g.atlas_score ?? null,
    nivel: g.nivel ?? null,
    manzanas: d.count ?? null,
    dimensiones: {
      accesibilidad: r(d.avg?.score_accesibilidad_v3),
      ambiental: r(d.avg?.score_ambiental_v3),
      socioeconomico: r(d.avg?.score_socioeconomico_v3),
      seguridad: r(d.avg?.score_seguridad),
    },
    dimensiones_100: g.dimensiones ?? null,
    gaps_vs_uraba: g.gaps_vs_uraba ?? null,
    fortaleza: g.fortaleza ?? null,
    debilidad: g.debilidad ?? null,
    narrativa: g.narrativa ?? null,
    indicadores_v2: g.indicadores_v2 ?? null,
    top5_manzanas: top5,
    fuente: FUENTE,
  }
})
