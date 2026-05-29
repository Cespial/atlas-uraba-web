import { ref, watch } from 'vue'
import { useAtlasStore, COLOR_SCALE } from '~/stores/atlas'

export function useAtlasMap(mapRef) {
  const store = useAtlasStore()
  const map = ref(null)

  async function initMap() {
    const maplibregl = (await import('maplibre-gl')).default

    map.value = new maplibregl.Map({
      container: mapRef.value,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap · © CARTO',
          },
        },
        layers: [{ id: 'background', type: 'raster', source: 'carto-dark' }],
      },
      center: [-76.65, 7.9],
      zoom: 9,
      minZoom: 8,
      maxZoom: 17,
    })

    map.value.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.value.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')

    map.value.on('load', async () => {
      await loadAtlasLayer()
      store.setLoaded()
    })

    // Tooltip
    const tooltip = new maplibregl.Popup({
      closeButton: false, closeOnClick: false,
      className: 'atlas-tooltip',
      maxWidth: '260px',
    })

    map.value.on('mousemove', 'manzanas-fill', (e) => {
      map.value.getCanvas().style.cursor = 'pointer'
      const p = e.features[0].properties
      tooltip.setLngLat(e.lngLat).setHTML(tooltipHTML(p)).addTo(map.value)
    })
    map.value.on('mouseleave', 'manzanas-fill', () => {
      map.value.getCanvas().style.cursor = ''
      tooltip.remove()
    })
    map.value.on('click', 'manzanas-fill', (e) => {
      store.selectManzana(e.features[0].properties)
    })
  }

  async function loadAtlasLayer() {
    const res  = await fetch('/data/atlas.geojson')
    const data = await res.json()

    // Calcular stats por municipio
    const stats = {}
    data.features.forEach(f => {
      const p = f.properties
      const m = p.municipio || 'Desconocido'
      if (!stats[m]) stats[m] = { count: 0, sum: {}, min: {}, max: {} }
      const s = stats[m]
      s.count++
      ;['atlas_score','score_accesibilidad','score_ambiental',
        'score_socioeconomico','score_seguridad'].forEach(k => {
        const v = p[k] ?? 0
        s.sum[k] = (s.sum[k] || 0) + v
        s.min[k] = Math.min(s.min[k] ?? 1, v)
        s.max[k] = Math.max(s.max[k] ?? 0, v)
      })
    })
    Object.keys(stats).forEach(m => {
      const s = stats[m]
      Object.keys(s.sum).forEach(k => { s.avg = s.avg || {}; s.avg[k] = s.sum[k] / s.count })
    })
    store.setStats(stats)

    map.value.addSource('atlas', { type: 'geojson', data, generateId: true })

    // Capa fill con el score activo
    map.value.addLayer({
      id: 'manzanas-fill',
      type: 'fill',
      source: 'atlas',
      paint: {
        'fill-color': buildColorExpr(store.dimension),
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.7, 14, 0.85],
      },
    })

    // Borde fino
    map.value.addLayer({
      id: 'manzanas-stroke',
      type: 'line',
      source: 'atlas',
      paint: {
        'line-color': '#00000033',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.1, 15, 0.5],
      },
    })
  }

  function buildColorExpr(dim) {
    return COLOR_SCALE.map((item, i) => {
      if (i === 1) return ['get', dim]
      return item
    })
  }

  function updateColor(dim) {
    if (!map.value) return
    map.value.setPaintProperty('manzanas-fill', 'fill-color', buildColorExpr(dim))
  }

  function flyTo(lat, lng, zoom) {
    map.value?.flyTo({ center: [lng, lat], zoom, duration: 1200 })
  }

  function filterMunicipio(nombre) {
    if (!map.value) return
    if (nombre === 'Todos') {
      map.value.setFilter('manzanas-fill', null)
      map.value.setFilter('manzanas-stroke', null)
    } else {
      const f = ['==', ['get', 'municipio'], nombre]
      map.value.setFilter('manzanas-fill', f)
      map.value.setFilter('manzanas-stroke', f)
    }
  }

  // Reaccionar a cambios del store
  watch(() => store.dimension, updateColor)
  watch(() => store.municipioActivo, (nombre) => {
    const cfg = store.municipioConfig
    if (cfg) flyTo(cfg.lat, cfg.lng, cfg.zoom)
    filterMunicipio(nombre)
  })

  return { map, initMap }
}

function tooltipHTML(p) {
  const score = (v) => v != null ? (v * 100).toFixed(0) : 'N/D'
  const bar = (v) => {
    const pct = Math.round((v ?? 0) * 100)
    const color = pct >= 70 ? '#4ade80' : pct >= 40 ? '#fbbf24' : '#f87171'
    return `<div style="background:#1e1e3a;border-radius:3px;height:4px;margin-top:2px">
      <div style="width:${pct}%;height:4px;background:${color};border-radius:3px"></div></div>`
  }
  return `
    <div style="font-family:Inter,sans-serif;font-size:12px;color:#e2e8f0;min-width:200px">
      <div style="font-weight:600;font-size:13px;margin-bottom:6px;color:#4ade80">
        ${p.municipio || ''}
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#94a3b8">Atlas Score</span>
        <span style="font-weight:700;font-size:15px">${score(p.atlas_score)}/100</span>
      </div>
      ${bar(p.atlas_score)}
      <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:11px">
        <span style="color:#94a3b8">Accesib.</span><span>${score(p.score_accesibilidad)}</span>
        <span style="color:#94a3b8">Ambiental</span><span>${score(p.score_ambiental)}</span>
        <span style="color:#94a3b8">Socioecon.</span><span>${score(p.score_socioeconomico)}</span>
        <span style="color:#94a3b8">Seguridad</span><span>${score(p.score_seguridad)}</span>
      </div>
      <div style="margin-top:6px;font-size:10px;color:#64748b">
        Zona: ${p.zona_atlas || '—'} · ${p.quintil || '—'}
      </div>
    </div>`
}
