<template>
  <div class="sim-root">
    <!-- ═══════════ HEADER ═══════════ -->
    <header class="sim-header">
      <NuxtLink to="/" class="sim-back">
        <span class="arrow">←</span>
        <span class="back-label">Volver al mapa</span>
      </NuxtLink>
      <div class="sim-title">
        <h1>Simulador de inversión</h1>
        <p class="sim-sub">¿Qué pasa con el bienestar si pongo un equipamiento aquí?</p>
      </div>
      <button class="sim-panel-toggle" :aria-expanded="panelAbierto" @click="panelAbierto = !panelAbierto">
        {{ panelAbierto ? 'Ocultar' : 'Panel' }}
      </button>
    </header>

    <!-- ═══════════ MAPA ═══════════ -->
    <ClientOnly>
      <div ref="mapEl" class="sim-map" :class="{ 'modo-colocar': !!tipoActivo }" />
      <template #fallback>
        <div class="sim-map sim-map--loading" />
      </template>
    </ClientOnly>

    <!-- hint de clic -->
    <Transition name="fade">
      <div v-if="tipoActivo && !punto && cargado" class="sim-hint">
        <span class="dot" :style="{ background: tipoConfig?.color }" />
        Haz clic en el mapa para colocar un <strong>{{ tipoConfig?.label }}</strong> hipotético
      </div>
    </Transition>

    <!-- loader -->
    <Transition name="fade">
      <div v-if="!cargado" class="sim-loader">
        <div class="spinner" />
        <p>Cargando 7.028 manzanas…</p>
      </div>
    </Transition>

    <!-- ═══════════ PANEL ═══════════ -->
    <Transition name="slide-up">
      <aside v-show="panelAbierto" class="sim-panel">
        <div class="panel-grip" @click="panelAbierto = false" />

        <!-- Paso 1: tipo -->
        <section class="panel-block">
          <span class="step">1</span>
          <h2>Tipo de equipamiento</h2>
          <div class="tipo-grid">
            <button
              v-for="t in TIPOS_EQUIPAMIENTO"
              :key="t.key"
              class="tipo-btn"
              :class="{ activo: tipoActivo === t.key }"
              :style="tipoActivo === t.key ? { borderColor: t.color, boxShadow: `0 0 0 1px ${t.color}` } : {}"
              @click="elegirTipo(t.key)"
            >
              <span class="tipo-ico" :style="{ background: t.color }">
                <svg v-if="t.icon === 'salud'" viewBox="0 0 24 24" width="16" height="16"><path fill="#fff" d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/></svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16"><path fill="#fff" d="M12 3 1 8l11 5 9-4.09V17h2V8z M5 13.18V17l7 3 7-3v-3.82l-7 3.09z"/></svg>
              </span>
              <span class="tipo-txt">
                <strong>{{ t.label }}</strong>
                <small>{{ t.descripcion }}</small>
              </span>
            </button>
          </div>
        </section>

        <!-- Paso 2: punto -->
        <section class="panel-block">
          <span class="step" :class="{ done: !!punto }">2</span>
          <h2>Ubicación hipotética</h2>
          <p v-if="!punto" class="hint-txt">
            {{ tipoActivo ? 'Haz clic en el mapa para colocar el punto.' : 'Primero elige un tipo de equipamiento.' }}
          </p>
          <div v-else class="punto-info">
            <code>{{ punto.lat.toFixed(4) }}, {{ punto.lng.toFixed(4) }}</code>
            <button class="link-btn" @click="resetPunto">Mover punto</button>
          </div>
        </section>

        <!-- Paso 3: resultados -->
        <section v-if="resultado" class="panel-block resultados">
          <span class="step done">3</span>
          <h2>Impacto estimado</h2>

          <div class="kpi-row">
            <div class="kpi">
              <span class="kpi-val">{{ resultado.resumen.beneficiadas }}</span>
              <span class="kpi-lbl">manzanas<br>beneficiadas</span>
            </div>
            <div class="kpi">
              <span class="kpi-val">+{{ (resultado.resumen.mejoraPromedio * 100).toFixed(1) }}</span>
              <span class="kpi-lbl">pts promedio<br>accesibilidad</span>
            </div>
            <div class="kpi">
              <span class="kpi-val">+{{ (resultado.resumen.mejoraMaxima * 100).toFixed(1) }}</span>
              <span class="kpi-lbl">pts mejora<br>máxima</span>
            </div>
          </div>

          <!-- barra de distribución de deltas -->
          <div v-if="resultado.resumen.beneficiadas" class="delta-bar">
            <div class="delta-bar-track">
              <div
                class="delta-bar-fill"
                :style="{ width: Math.min(100, resultado.resumen.mejoraPromedio * 300) + '%' }"
              />
            </div>
            <small class="delta-bar-cap">Radio de influencia: {{ resultado.resumen.radioKm }} km · velocidad efectiva ~22 km/h</small>
          </div>

          <p v-if="!resultado.resumen.beneficiadas" class="empty-res">
            Ninguna manzana mejora aquí: el equipamiento más cercano ya queda
            igual o más cerca. Prueba una ubicación con menos cobertura actual
            (zonas rojas/naranjas del mapa).
          </p>
        </section>

        <!-- Disclaimer -->
        <footer class="panel-disclaimer">
          <strong>Estimación what-if simplificada.</strong>
          No sustituye un estudio técnico. Usa distancia en línea recta convertida
          a tiempo de viaje y una curva minutos→accesibilidad derivada de las
          isocronas OSRM reales. Equipamientos base: REPS (salud) y SIMAT (educación).
        </footer>
      </aside>
    </Transition>

    <!-- Leyenda flotante -->
    <div class="sim-legend" :class="{ shifted: panelAbierto }">
      <span class="leg-title">Accesibilidad</span>
      <div class="leg-scale">
        <span style="background:#d73027" /><span style="background:#f46d43" /><span style="background:#fdae61" />
        <span style="background:#a8ddb5" /><span style="background:#41b6c4" /><span style="background:#1B6B6D" />
      </div>
      <div class="leg-ends"><small>Baja</small><small>Alta</small></div>
      <div v-if="resultado && resultado.resumen.beneficiadas" class="leg-halo">
        <span class="halo-chip" /> manzanas mejoradas
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSimulador, TIPOS_EQUIPAMIENTO } from '~/composables/useSimulador'

const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark'

// Misma rampa de color teal Tensor que useAtlasMap
// Acepta un nombre de propiedad (string) o una expresión MapLibre completa.
// Si recibe string lo envuelve en ['get', ...]; si recibe expresión la usa tal cual.
function colorExpr(field) {
  const input = typeof field === 'string'
    ? ['to-number', ['get', field], 0]
    : ['to-number', field, 0]
  return [
    'interpolate', ['linear'],
    input,
    0.0, '#d73027', 0.2, '#f46d43', 0.4, '#fdae61',
    0.55, '#a8ddb5', 0.7, '#41b6c4', 0.85, '#1d91c0', 1.0, '#1B6B6D',
  ]
}

const { cargando, atlasGeo, cargarDatos, simular } = useSimulador()

const mapEl = ref(null)
const cargado = ref(false)
const panelAbierto = ref(true)
const tipoActivo = ref(null)
const punto = ref(null)
const resultado = ref(null)

let map = null
let maplibregl = null
let marker = null

const tipoConfig = computed(() => TIPOS_EQUIPAMIENTO.find((t) => t.key === tipoActivo.value))

function elegirTipo(key) {
  tipoActivo.value = tipoActivo.value === key ? null : key
  // recalcular si ya hay punto colocado
  if (punto.value && tipoActivo.value) recalcular()
}

function resetPunto() {
  punto.value = null
  resultado.value = null
  if (marker) { marker.remove(); marker = null }
  limpiarHalo()
}

async function initMap() {
  maplibregl = (await import('maplibre-gl')).default

  map = new maplibregl.Map({
    container: mapEl.value,
    style: STYLE_DARK,
    center: [-76.65, 7.9],
    zoom: 9,
    minZoom: 5,
    maxZoom: 17,
    attributionControl: false,
  })
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right')

  await cargarDatos()

  map.on('load', () => {
    if (!atlasGeo.value) return
    map.addSource('atlas-sim', { type: 'geojson', data: atlasGeo.value, promoteId: '_fid' })

    map.addLayer({
      id: 'sim-fill',
      type: 'fill',
      source: 'atlas-sim',
      minzoom: 9,
      paint: {
        'fill-color': colorExpr('score_accesibilidad'),
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.35, 11, 0.6, 12, 0.8],
        'fill-color-transition': { duration: 400 },
      },
    })
    map.addLayer({
      id: 'sim-stroke',
      type: 'line',
      source: 'atlas-sim',
      minzoom: 11,
      paint: { 'line-color': 'rgba(255,255,255,0.12)', 'line-width': 0.4 },
    })

    // Halo de manzanas mejoradas (feature-state delta)
    map.addLayer({
      id: 'sim-halo',
      type: 'line',
      source: 'atlas-sim',
      minzoom: 9,
      paint: {
        'line-color': '#7CFCD0',
        // 'zoom' SÓLO es válido como expresión más externa de interpolate/step.
        // El gate por feature-state (delta>0 ? valor : 0) va DENTRO de cada
        // stop de zoom, no envolviendo al interpolate.
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          9, ['case', ['>', ['coalesce', ['feature-state', 'delta'], 0], 0], 1.2, 0],
          13, ['case', ['>', ['coalesce', ['feature-state', 'delta'], 0], 0], 2.6, 0],
        ],
        'line-opacity': [
          'case',
          ['>', ['coalesce', ['feature-state', 'delta'], 0], 0], 0.95, 0,
        ],
      },
    })
    // Re-tinte de manzanas mejoradas sobre el fill base
    map.addLayer({
      id: 'sim-mejora-fill',
      type: 'fill',
      source: 'atlas-sim',
      minzoom: 9,
      paint: {
        'fill-color': colorExpr(['+', ['to-number', ['get', 'score_accesibilidad'], 0], ['coalesce', ['feature-state', 'deltaScore'], 0]]),
        // idem: interpolate(zoom) al nivel superior, gate por feature-state en cada stop.
        'fill-opacity': [
          'interpolate', ['linear'], ['zoom'],
          9, ['case', ['>', ['coalesce', ['feature-state', 'delta'], 0], 0], 0.55, 0],
          12, ['case', ['>', ['coalesce', ['feature-state', 'delta'], 0], 0], 0.9, 0],
        ],
      },
    })

    cargado.value = true
  })

  map.on('click', onMapClick)
}

function onMapClick(e) {
  if (!tipoActivo.value) {
    panelAbierto.value = true
    return
  }
  punto.value = { lng: e.lngLat.lng, lat: e.lngLat.lat }

  if (marker) marker.remove()
  const el = document.createElement('div')
  el.className = 'sim-marker'
  el.style.setProperty('--c', tipoConfig.value?.color || '#1B6B6D')
  marker = new maplibregl.Marker({ element: el, anchor: 'center' })
    .setLngLat([punto.value.lng, punto.value.lat])
    .addTo(map)

  recalcular()
}

let prevIds = []
function limpiarHalo() {
  if (!map) return
  for (const id of prevIds) {
    map.setFeatureState({ source: 'atlas-sim', id }, { delta: 0, deltaScore: 0 })
  }
  prevIds = []
}

function recalcular() {
  if (!punto.value || !tipoActivo.value) return
  const res = simular(punto.value, tipoActivo.value)
  resultado.value = res
  limpiarHalo()
  if (!res) return
  for (const a of res.afectadas) {
    map.setFeatureState(
      { source: 'atlas-sim', id: a.id },
      { delta: a.delta, deltaScore: a.delta }
    )
    prevIds.push(a.id)
  }
}

onMounted(() => { initMap() })
onBeforeUnmount(() => { if (map) map.remove() })
</script>

<style scoped>
.sim-root {
  position: fixed;
  inset: 0;
  background: #0D1117;
  font-family: 'Inter', system-ui, sans-serif;
  color: #1A1A1A;
  overflow: hidden;
}

/* ─── Header ─── */
.sim-header {
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  background: rgba(13, 17, 23, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.sim-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #fff;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  padding: 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  transition: all 0.18s;
  white-space: nowrap;
}
.sim-back:hover { background: rgba(27, 107, 109, 0.25); border-color: #1B6B6D; }
.sim-back .arrow { font-size: 15px; }
.sim-title h1 {
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  line-height: 1.1;
}
.sim-sub {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.55);
  margin: 2px 0 0;
}
.sim-panel-toggle {
  margin-left: auto;
  display: none;
  background: #1B6B6D;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* ─── Mapa ─── */
.sim-map { position: absolute; inset: 0; z-index: 1; }
.sim-map--loading { background: #0D1117; }
.sim-map.modo-colocar :deep(.maplibregl-canvas) { cursor: crosshair; }

/* ─── Hint ─── */
.sim-hint {
  position: absolute;
  top: 74px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(13, 17, 23, 0.92);
  color: #fff;
  font-size: 12.5px;
  padding: 9px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.sim-hint .dot { width: 9px; height: 9px; border-radius: 50%; }
.sim-hint strong { color: #7CFCD0; }

/* ─── Loader ─── */
.sim-loader {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #0D1117;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}
.spinner {
  width: 38px; height: 38px;
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-top-color: #1B6B6D;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Panel ─── */
.sim-panel {
  position: absolute;
  top: 64px;
  left: 18px;
  bottom: 18px;
  width: 360px;
  z-index: 20;
  background: #FFFFFF;
  border: 1px solid #E5E5E0;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  padding: 20px 20px 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.panel-grip { display: none; }

.panel-block { position: relative; padding: 4px 0 18px 34px; border-bottom: 1px solid #F0F0EC; }
.panel-block:last-of-type { border-bottom: none; }
.step {
  position: absolute;
  left: 0; top: 2px;
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  background: #1A1A1A;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  border-radius: 50%;
}
.step.done { background: #1B6B6D; }
.panel-block h2 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #1A1A1A;
}

/* tipos */
.tipo-grid { display: flex; flex-direction: column; gap: 9px; }
.tipo-btn {
  display: flex; align-items: center; gap: 12px;
  background: #FAFAF8;
  border: 1px solid #E5E5E0;
  border-radius: 11px;
  padding: 11px 13px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.tipo-btn:hover { background: #F2F2EE; }
.tipo-btn.activo { background: #fff; }
.tipo-ico {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.tipo-txt { display: flex; flex-direction: column; }
.tipo-txt strong { font-size: 13.5px; color: #1A1A1A; }
.tipo-txt small { font-size: 11px; color: #8A8A82; margin-top: 1px; }

.hint-txt { font-size: 12.5px; color: #8A8A82; margin: 0; line-height: 1.4; }
.punto-info { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.punto-info code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: #F0F0EC;
  padding: 5px 9px;
  border-radius: 6px;
  color: #1A1A1A;
}
.link-btn {
  background: none; border: none;
  color: #1B6B6D;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

/* resultados */
.kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.kpi {
  background: #F7FBFB;
  border: 1px solid #DDEDED;
  border-radius: 11px;
  padding: 12px 6px;
  text-align: center;
}
.kpi-val {
  display: block;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #1B6B6D;
  line-height: 1;
}
.kpi-lbl { display: block; font-size: 10px; color: #6E6E66; margin-top: 6px; line-height: 1.25; }

.delta-bar { margin-top: 4px; }
.delta-bar-track { height: 7px; background: #ECECE7; border-radius: 4px; overflow: hidden; }
.delta-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #41b6c4, #1B6B6D);
  border-radius: 4px;
  transition: width 0.4s ease;
}
.delta-bar-cap { display: block; font-size: 10.5px; color: #8A8A82; margin-top: 7px; }
.empty-res { font-size: 12.5px; color: #8A6A2A; background: #FDF6E3; border: 1px solid #F0E2B6; border-radius: 10px; padding: 11px 12px; margin: 4px 0 0; line-height: 1.45; }

.panel-disclaimer {
  margin-top: auto;
  padding: 14px 0 18px;
  font-size: 10.5px;
  line-height: 1.5;
  color: #8A8A82;
}
.panel-disclaimer strong { color: #1A1A1A; }

/* ─── Leyenda ─── */
.sim-legend {
  position: absolute;
  bottom: 26px;
  right: 18px;
  z-index: 15;
  background: rgba(13, 17, 23, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 11px;
  padding: 11px 13px;
  color: #fff;
  transition: transform 0.3s;
}
.leg-title { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.8; }
.leg-scale { display: flex; margin: 7px 0 4px; border-radius: 4px; overflow: hidden; width: 150px; }
.leg-scale span { flex: 1; height: 9px; }
.leg-ends { display: flex; justify-content: space-between; }
.leg-ends small { font-size: 9.5px; opacity: 0.6; }
.leg-halo { display: flex; align-items: center; gap: 6px; font-size: 10.5px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); }
.halo-chip { width: 14px; height: 9px; border-radius: 3px; border: 2px solid #7CFCD0; display: inline-block; }

/* marker */
:deep(.sim-marker) {
  width: 20px; height: 20px;
  border-radius: 50% 50% 50% 0;
  background: var(--c);
  border: 2.5px solid #fff;
  transform: rotate(-45deg);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 35%, transparent), 0 3px 8px rgba(0,0,0,0.4);
}

/* transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s, opacity 0.3s; }

/* ─── Responsive (mobile bottom sheet) ─── */
@media (max-width: 720px) {
  .sim-panel-toggle { display: inline-block; }
  .sim-title h1 { font-size: 15px; }
  .sim-sub { display: none; }
  .back-label { display: none; }
  .sim-back { padding: 8px 10px; }

  .sim-panel {
    top: auto;
    left: 0; right: 0; bottom: 0;
    width: auto;
    max-height: 68vh;
    border-radius: 18px 18px 0 0;
    padding-top: 8px;
  }
  .panel-grip {
    display: block;
    width: 42px; height: 4px;
    background: #D5D5CE;
    border-radius: 999px;
    margin: 4px auto 12px;
    cursor: pointer;
  }
  .sim-legend.shifted { transform: translateY(-68vh); opacity: 0.92; }
  .sim-hint { top: auto; bottom: 12px; font-size: 11.5px; width: max-content; max-width: 90vw; }
  .slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
}
</style>
