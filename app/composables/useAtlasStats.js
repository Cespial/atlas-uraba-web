import { ref, computed, watch } from 'vue'
import { useAtlasStore, DIMENSIONES } from '~/stores/atlas'
import { jenks } from 'simple-statistics'

export function useAtlasStats(featuresRef) {
  const store = useAtlasStore()
  const stats = ref({})
  const jenksBreaks = ref({})

  function computeStats(features) {
    if (!features?.length) return

    const byMun = {}
    features.forEach(f => {
      const p = f.properties || f
      const m = p.municipio || 'Desconocido'
      if (!byMun[m]) byMun[m] = { count: 0, scores: {} }
      byMun[m].count++
      DIMENSIONES.forEach(d => {
        if (!byMun[m].scores[d.key]) byMun[m].scores[d.key] = []
        byMun[m].scores[d.key].push(+(p[d.key] ?? 0))
      })
    })

    const result = {}
    Object.entries(byMun).forEach(([mun, data]) => {
      result[mun] = { count: data.count, avg: {}, min: {}, max: {}, p25: {}, p75: {} }
      DIMENSIONES.forEach(d => {
        const vals = data.scores[d.key].sort((a,b) => a-b)
        result[mun].avg[d.key] = vals.reduce((s,v) => s+v, 0) / vals.length
        result[mun].min[d.key] = vals[0]
        result[mun].max[d.key] = vals[vals.length-1]
        result[mun].p25[d.key] = vals[Math.floor(vals.length * 0.25)]
        result[mun].p75[d.key] = vals[Math.floor(vals.length * 0.75)]
      })
    })
    stats.value = result
    store.setStats(result)

    // Jenks breaks para dimensión activa
    const allScores = features.map(f => +(f.properties?.atlas_score ?? f.atlas_score ?? 0))
    try {
      jenksBreaks.value = jenks(allScores, 6)
    } catch {
      jenksBreaks.value = [0, 0.2, 0.4, 0.55, 0.7, 0.85, 1.0]
    }
  }

  // Histograma de distribución para municipio activo
  const histogram = computed(() => {
    const breaks = jenksBreaks.value.length ? jenksBreaks.value : [0, 0.2, 0.4, 0.55, 0.7, 0.85, 1.0]
    const colors = ['#d73027','#f46d43','#fdae61','#a6d96a','#66bd63','#1a9850']
    const labels = ['Crítico','Bajo','Medio-bajo','Medio-alto','Alto','Excelente']
    const total = Object.values(stats.value).reduce((s, v) => s + v.count, 0) || 1
    return breaks.slice(0, -1).map((min, i) => ({
      label: labels[i],
      color: colors[i],
      min: Math.round(min * 100),
      max: Math.round(breaks[i+1] * 100),
      count: 0, // se llena en HistogramPanel
      pct: 0,
    }))
  })

  return { stats, jenksBreaks, histogram, computeStats }
}
