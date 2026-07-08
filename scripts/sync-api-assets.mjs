// Sincroniza los datos que consume la API REST pública (FASE 4) desde la
// fuente de verdad public/data hacia server/assets/data, para que Nitro los
// empaquete como server assets dentro de la función serverless de Vercel.
//
// Mantener esta lista alineada con los archivos que lee server/utils/uraba.js
// y los handlers de server/api/uraba/**.
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'public', 'data')
const DEST = join(root, 'server', 'assets', 'data')

const FILES = [
  // Ola 2 (adopción v3.1): agregados municipales con score_seguridad
  // reconstruido — lo consumen ranking.get.js, municipios.get.js y
  // municipio/[nombre].get.js (ver docs/investigacion/2026-07-07/impacto-v31.md).
  'atlas_stats_v31.json',
  'gap_analysis.json',
  'atlas.geojson',
  'equidad_municipios.json',
  // Pipeline de datos nuevos (ola1/datos-nuevos): agregados municipales,
  // livianos, útiles para futuros endpoints (ej. enriquecer
  // /api/uraba/municipio/[nombre]). Ningún handler los consume todavía —
  // eso lo hace la fase que integra la UI.
  'poblacion_municipios.json',
  'seguridad_municipios.json',
  'irca_municipios.json',
  // Ola 2 (ola2/datos): agregados municipales nuevos, livianos, mismo criterio
  // que la ola anterior — ningún handler los consume todavía.
  'ruv_victimas.json',
  'saber11_colegios.json',
  'delitos_municipios.json',
  'educacion_men.json',
  'runt_municipios.json',
]

await fs.mkdir(DEST, { recursive: true })
for (const f of FILES) {
  await fs.copyFile(join(SRC, f), join(DEST, f))
  console.log(`[sync-api-assets] ${f}`)
}
console.log(`[sync-api-assets] ${FILES.length} archivos sincronizados → server/assets/data`)
