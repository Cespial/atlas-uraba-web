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

const FILES = ['atlas_stats_v3.json', 'gap_analysis.json', 'atlas.geojson', 'equidad_municipios.json']

await fs.mkdir(DEST, { recursive: true })
for (const f of FILES) {
  await fs.copyFile(join(SRC, f), join(DEST, f))
  console.log(`[sync-api-assets] ${f}`)
}
console.log(`[sync-api-assets] ${FILES.length} archivos sincronizados → server/assets/data`)
