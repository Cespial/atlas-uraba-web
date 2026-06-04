// Utilidades compartidas para la API pública Atlas Urabá.
// Lee los JSON/GeoJSON desde public/data en runtime y los cachea en memoria
// para no releer el filesystem en cada request.

import { promises as fs } from 'node:fs'
import { join } from 'node:path'

export const FUENTE =
  'Atlas Urabá · Tensor (tensor.lat). Insumos: DANE CNPV 2018 (manzanas y socioeconómico), ' +
  'Google Earth Engine / GEE (NDVI Sentinel-2, LST Landsat 8/9, VIIRS) y OSRM (isócronas de routing real por carretera).'

// Cache en memoria (persiste entre requests dentro del mismo proceso de servidor).
const _cache = new Map()

// Resuelve la ruta a public/data tanto en dev como en build.
function dataPath(file) {
  return join(process.cwd(), 'public', 'data', file)
}

// Lee y parsea un archivo JSON/GeoJSON de public/data, con cache en memoria.
export async function readData(file) {
  if (_cache.has(file)) return _cache.get(file)
  const raw = await fs.readFile(dataPath(file), 'utf-8')
  const parsed = JSON.parse(raw)
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
