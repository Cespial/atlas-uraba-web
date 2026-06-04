// Utilidades compartidas para la API pública Atlas Urabá.
// Lee los JSON/GeoJSON desde public/data en runtime y los cachea en memoria
// para no releer el filesystem en cada request.

export const FUENTE =
  'Atlas Urabá · Tensor (tensor.lat). Insumos: DANE CNPV 2018 (manzanas y socioeconómico), ' +
  'Google Earth Engine / GEE (NDVI Sentinel-2, LST Landsat 8/9, VIIRS) y OSRM (isócronas de routing real por carretera).'

// Cache en memoria (persiste entre requests dentro del mismo proceso de servidor).
const _cache = new Map()

// Lee y parsea un archivo JSON/GeoJSON empaquetado como server asset
// (server/assets/data → storage 'assets:data'), con cache en memoria.
// Funciona tanto en dev como dentro de la función serverless de Vercel,
// porque el asset viaja en el bundle (no depende del filesystem/cwd).
export async function readData(file) {
  if (_cache.has(file)) return _cache.get(file)
  // Los server assets se montan en el storage 'assets' con la clave
  // 'server:<baseName>:<archivo>' (baseName 'data' por nuestra config Nitro).
  const storage = useStorage('assets')
  const raw = await storage.getItem(`server:data:${file}`)
  if (raw == null) {
    throw new Error(`Atlas data asset no encontrado: ${file}`)
  }
  // getItem puede devolver el objeto ya parseado (JSON) o el texto crudo.
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  _cache.set(file, parsed)
  return parsed
}

// Normaliza un nombre de municipio: minúsculas, sin acentos, trim.
// Permite búsqueda case/acentos-insensible.
export function normalize(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// Aplica headers CORS abiertos + Content-Type JSON a la respuesta.
export function setApiHeaders(event) {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  })
}

// Lanza un 404 con cuerpo JSON limpio.
export function notFound(message) {
  return createError({
    statusCode: 404,
    statusMessage: 'Not Found',
    data: { error: 'not_found', mensaje: message, fuente: FUENTE },
  })
}
