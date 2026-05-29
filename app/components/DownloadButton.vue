<template>
  <button
    class="dl-btn"
    :disabled="downloading"
    title="Descargar CSV de manzanas filtradas"
    @click="downloadCSV"
  >
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
    <span class="dl-label">{{ downloading ? 'Preparando…' : 'CSV' }}</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

const store       = useAtlasStore()
const downloading = ref(false)

const FIELDS = [
  'cod_manzana',
  'municipio',
  'atlas_score',
  'score_accesibilidad',
  'score_ambiental',
  'score_socioeconomico',
  'score_seguridad',
  'zona_atlas',
  'quintil',
]

async function downloadCSV() {
  if (downloading.value) return
  downloading.value = true

  try {
    // Fetch GeoJSON y filtrar en cliente para honrar filtros activos
    const res  = await fetch('/data/atlas.geojson')
    const json = await res.json()

    const mun     = store.municipioActivo
    const minScore = store.filterMin
    const maxScore = store.filterMax
    const zonas   = store.zonaFilter

    const features = json.features.filter(f => {
      const p = f.properties
      if (mun !== 'Todos' && p.municipio !== mun) return false
      const s = +(p.atlas_score ?? 0)
      if (s < minScore || s > maxScore) return false
      if (!zonas.includes(p.zona_atlas)) return false
      return true
    })

    // Construir CSV
    const header = FIELDS.join(',')
    const rows   = features.map(f => {
      const p = f.properties
      return FIELDS.map(k => {
        const v = p[k] ?? ''
        // Escapar comillas y envolver en comillas si contiene comas
        const str = String(v)
        return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str
      }).join(',')
    })

    const csv   = [header, ...rows].join('\n')
    const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    const label = mun === 'Todos' ? 'uraba' : mun.toLowerCase().replace(/ /g, '-')
    a.href     = url
    a.download = `atlas-uraba_${label}_${store.dimension}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('[DownloadButton]', e)
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.dl-btn {
  position: absolute;
  bottom: 48px;
  right: 316px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  background: var(--dk-panel, #161B22);
  border: 1px solid var(--dk-border, #30363D);
  border-radius: 8px;
  cursor: pointer;
  color: #8B949E;
  transition: all 0.15s ease;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

.dl-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.2);
  color: #E6EDF3;
}

.dl-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.dl-label {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* Mobile: ocultar label */
@media (max-width: 639px) {
  .dl-btn {
    bottom: calc(var(--sheet-peek, 80px) + 8px);
    right: 8px;
    padding: 7px;
  }
  .dl-label { display: none; }
}
</style>
