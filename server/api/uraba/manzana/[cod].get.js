// GET /api/uraba/manzana/[cod] — propiedades de una manzana por cod_manzana.
// Busca en atlas.geojson. Construye un índice cod_manzana -> properties en
// memoria la primera vez para no recorrer 7.028 features en cada request.
import { FUENTE, readData, notFound, setApiHeaders } from '../../../utils/uraba'

const r = (n) => (typeof n === 'number' ? Math.round(n * 10000) / 10000 : null)

// Índice cacheado a nivel de módulo.
let _index = null

async function getIndex() {
  if (_index) return _index
  const atlas = await readData('atlas.geojson')
  _index = new Map()
  for (const f of atlas.features || []) {
    const cod = f.properties?.cod_manzana
    if (cod != null) _index.set(String(cod), f.properties)
  }
  return _index
}

export default defineEventHandler(async (event) => {
  setApiHeaders(event)
  const cod = String(getRouterParam(event, 'cod') || '').trim()
  const index = await getIndex()
  const p = index.get(cod)

  if (!p) {
    throw notFound(`Manzana no encontrada: "${cod}".`)
  }

  return {
    cod_manzana: p.cod_manzana,
    municipio: p.municipio ?? null,
    atlas_score_v3: r(p.atlas_score_v3 ?? p.atlas_score),
    quintil: p.quintil_v3 ?? p.quintil ?? null,
    zona_atlas: p.zona_atlas ?? null,
    moran_i: r(p.moran_i),
    dimensiones: {
      accesibilidad: r(p.score_accesibilidad_v3 ?? p.score_accesibilidad),
      ambiental: r(p.score_ambiental_v3 ?? p.score_ambiental),
      socioeconomico: r(p.score_socioeconomico_v3 ?? p.score_socioeconomico),
      seguridad: r(p.score_seguridad),
    },
    propiedades: p,
    fuente: FUENTE,
  }
})
