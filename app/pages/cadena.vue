<template>
  <div class="cad-root">
    <header class="cad-header">
      <NuxtLink to="/" class="cad-back">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Volver al mapa
      </NuxtLink>
      <div class="cad-title-wrap">
        <h1 class="cad-title">Cadena de valor agro</h1>
        <span class="cad-subtitle">Producción → Precio → Exportación · Urabá</span>
      </div>
    </header>

    <main class="cad-main">
      <div v-if="pending" class="cad-state">Cargando datos…</div>
      <div v-else-if="error" class="cad-state cad-state--err">No se pudieron cargar los datos.</div>

      <template v-else>
        <!-- ── BLOQUE 1 · PRODUCCIÓN (EVA) ─────────────────────── -->
        <section class="cad-block">
          <div class="cad-block-head">
            <h2 class="cad-h2"><span class="cad-step">1</span> Producción municipal</h2>
            <div class="cad-selects">
              <select v-model="munSel" class="cad-select">
                <option v-for="m in munNombres" :key="m" :value="m">{{ m }}</option>
              </select>
              <select v-model="cultivoSel" class="cad-select">
                <option v-for="c in cultivosDisponibles" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
          <div v-if="serieEva.length" class="cad-chart-grid">
            <div class="cad-chart">
              <Bar :data="chartEva" :options="optsEva" />
            </div>
            <div class="cad-mini-table">
              <div v-for="r in serieEva" :key="r.anio" class="cad-mini-row cad-mini-row--4">
                <span class="cad-mini-y">{{ r.anio }}</span>
                <span>{{ fmt(r.produccion) }} t</span>
                <span>{{ fmt(r.area) }} ha</span>
                <span>{{ r.rendimiento.toFixed(1) }} t/ha</span>
              </div>
            </div>
          </div>
          <p v-else class="cad-empty">Sin registros EVA de {{ cultivoSel }} en {{ munSel }}.</p>
          <p class="cad-fuente">Fuente: {{ evaFuente }}</p>
        </section>

        <!-- ── BLOQUE 2 · PRECIO MAYORISTA DOMÉSTICO (SIPSA) ───── -->
        <section class="cad-block">
          <div class="cad-block-head">
            <h2 class="cad-h2"><span class="cad-step">2</span> Precio mayorista doméstico 2024</h2>
            <div class="cad-selects">
              <select v-model="productoSel" class="cad-select">
                <option v-for="p in productosSipsa" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>
          <p class="cad-nota">
            Nota metodológica: variedades <strong>bocadillo y criollo</strong>, de consumo
            doméstico/informal — no corresponden al banano Cavendish de exportación y por lo tanto
            <strong>no son comparables</strong> con el precio FOB del bloque 4.
          </p>
          <div class="cad-chart cad-chart--wide">
            <Line :data="chartSipsa" :options="optsSipsa" />
          </div>
          <p class="cad-fuente">Fuente: DANE — SIPSA, precios mayoristas mensuales (COP/kg).</p>
        </section>

        <!-- ── BLOQUE 3 · PRECIO INTERNACIONAL (fail-quiet) ────── -->
        <section v-if="intlOk" class="cad-block">
          <div class="cad-block-head">
            <h2 class="cad-h2"><span class="cad-step">3</span> Precio internacional</h2>
          </div>
          <div class="cad-chart cad-chart--wide">
            <Line :data="chartIntl" :options="optsIntl" />
          </div>
          <p class="cad-fuente">Fuente: {{ intlFuente }}</p>
        </section>

        <!-- ── BLOQUE 4 · EXPORTACIÓN FOB ──────────────────────── -->
        <section class="cad-block">
          <div class="cad-block-head">
            <h2 class="cad-h2"><span class="cad-step">4</span> Exportación de banano — Antioquia</h2>
            <div class="cad-selects">
              <select v-model="anioFobSel" class="cad-select">
                <option v-for="a in aniosFob" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
          </div>
          <p class="cad-nota">
            Puerto Antioquia inició operaciones en febrero de 2026 (Res. 20263040003075) — primer
            embarque de exportación con banano de Urabá con destino Europa la primera semana de
            operación (Infobae/El Tiempo, 2026).
          </p>
          <div class="cad-chart-grid">
            <div class="cad-chart">
              <Bar :data="chartFob" :options="optsFob" />
            </div>
            <div class="cad-mini-table">
              <div class="cad-mini-head">
                Top destinos {{ anioFobSel }} · US${{ fmt(Math.round(fobAnio.fob_usd / 1e6)) }} M · {{ fmt(fobAnio.ton) }} t
              </div>
              <div v-for="d in topDestinos" :key="d.pais" class="cad-mini-row">
                <span class="cad-mini-y">{{ d.pais }}</span>
                <span>US${{ fmt(Math.round(d.fob / 1e6)) }} M</span>
                <span>{{ d.pct }}%</span>
              </div>
            </div>
          </div>
          <div class="cad-fob-kg">
            <div class="cad-fob-kg-title">US$/kg FOB implícito (HS 0803) — fob_usd ÷ (ton × 1000)</div>
            <div class="cad-fob-kg-row">
              <span v-for="r in fobKgImplicito" :key="r.anio" class="cad-fob-kg-chip">
                <b>{{ r.anio }}</b> US${{ r.usd_kg != null ? r.usd_kg.toFixed(3) : '—' }}
              </span>
            </div>
          </div>
          <div class="cad-callout">
            <div class="cad-callout-title">Contexto — Augura 2025</div>
            <p class="cad-callout-text">
              Récord exportador: <strong>US$1.309 millones</strong> en 2025 (+21,6% interanual).
              Urabá concentra <strong>32.465 ha</strong> (82 millones de cajas), líder nacional
              sobre la zona Caribe. Riesgo 2026: <strong>~1.200 ha</strong> afectadas por
              inundaciones en los dos primeros meses del año; el gremio proyecta una caída cercana
              al <strong>5%</strong> en las exportaciones de 2026.
            </p>
            <p class="cad-fuente">Fuente: Augura vía Portafolio (2026).</p>
          </div>
          <p class="cad-fuente">Fuente: DANE — Exportaciones (partida HS 0803, Antioquia), vía Datos Abiertos Colombia.</p>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import {
  Chart, BarController, BarElement, LineController, LineElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line } from 'vue-chartjs'

Chart.register(BarController, BarElement, LineController, LineElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)

const TEAL = '#1B6B6D'
const AMBER = '#f59e0b'

// Carga client-side (mismo patrón y razón que comparar.vue).
const { data: evaRaw,   pending: p1, error: e1 } = await useFetch('/data/eva_produccion_serie.json', { server: false, lazy: true })
const { data: sipsaRaw, pending: p2, error: e2 } = await useFetch('/data/sipsa_precios.json', { server: false, lazy: true })
const { data: fobRaw,   pending: p3, error: e3 } = await useFetch('/data/expo_banano_fob.json', { server: false, lazy: true })
// Precio internacional: fail-quiet — si el archivo aún no existe (lo genera otro frente),
// el bloque 3 simplemente no se muestra (v-if). No entra en el `pending`/`error` globales
// para no bloquear el resto de la página.
const { data: intlRaw, error: e4 } = await useFetch('/data/banano_internacional.json', { server: false, lazy: true })

const pending = computed(() => p1.value || p2.value || p3.value)
const error   = computed(() => e1.value || e2.value || e3.value)

function fmt(n) { return (n ?? 0).toLocaleString('es-CO') }

// ── EVA ──────────────────────────────────────────────────────────
const evaFuente = computed(() => evaRaw.value?._meta?.fuente ?? 'DANE/MADR — EVA')
// data está indexado por '05045 - Apartadó' → mapear a nombre limpio.
const munIndex = computed(() => {
  const out = {}
  Object.values(evaRaw.value?.data ?? {}).forEach(m => { out[m.municipio] = m })
  return out
})
const munNombres = computed(() => Object.keys(munIndex.value).sort())
const munSel = ref(null)
const cultivoSel = ref('Banano')
watchEffect(() => {
  if (!munSel.value && munNombres.value.length) munSel.value = munNombres.value[0]
})
const cultivosDisponibles = computed(() => {
  const c = munIndex.value[munSel.value]?.cultivos ?? {}
  return Object.keys(c).sort()
})
watchEffect(() => {
  // Si el cultivo elegido no existe en el municipio, caer a Banano o al primero.
  const disp = cultivosDisponibles.value
  if (disp.length && !disp.includes(cultivoSel.value)) {
    cultivoSel.value = disp.includes('Banano') ? 'Banano' : disp[0]
  }
})

// ⚠️ Cada año de `series` puede ser objeto O array de desagregaciones.
const serieEva = computed(() => {
  const series = munIndex.value[munSel.value]?.cultivos?.[cultivoSel.value]?.series ?? {}
  return Object.keys(series).sort().map(anio => {
    const arr = Array.isArray(series[anio]) ? series[anio] : [series[anio]]
    const produccion = arr.reduce((t, d) => t + (+d.produccion_ton || 0), 0)
    const area = arr.reduce((t, d) => t + (+d.area_sembrada_ha || 0), 0)
    const cosechada = arr.reduce((t, d) => t + (+d.area_cosechada_ha || 0), 0)
    return { anio, produccion, area, rendimiento: cosechada ? produccion / cosechada : 0 }
  })
})

const chartEva = computed(() => ({
  labels: serieEva.value.map(r => r.anio),
  datasets: [{
    label: 'Producción (t)',
    data: serieEva.value.map(r => r.produccion),
    backgroundColor: TEAL + 'cc',
    borderRadius: 3,
  }],
}))
const optsEva = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('es-CO') } } },
}

// ── SIPSA ────────────────────────────────────────────────────────
const productosSipsa = computed(() => Object.keys(sipsaRaw.value?.datos ?? {}).sort())
const productoSel = ref('Banano Urabá')
watchEffect(() => {
  const disp = productosSipsa.value
  if (disp.length && !disp.includes(productoSel.value)) productoSel.value = disp[0]
})
const MESES = ['2024-01','2024-02','2024-03','2024-04','2024-05','2024-06',
               '2024-07','2024-08','2024-09','2024-10','2024-11','2024-12']
const PALETA = [TEAL, AMBER, '#a78bfa', '#60a5fa', '#34d399']
const chartSipsa = computed(() => {
  const mercados = sipsaRaw.value?.datos?.[productoSel.value] ?? {}
  return {
    labels: MESES.map(m => m.slice(5)),
    datasets: Object.entries(mercados).map(([mercado, serie], i) => ({
      label: mercado,
      data: MESES.map(m => serie[m] ?? null),
      borderColor: PALETA[i % PALETA.length],
      backgroundColor: 'transparent',
      tension: 0.3,
      spanGaps: true,
      pointRadius: 2,
    })),
  }
})
const optsSipsa = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
  scales: { y: { ticks: { callback: v => '$' + v.toLocaleString('es-CO') } } },
}

// ── FOB ──────────────────────────────────────────────────────────
const aniosFob = computed(() => Object.keys(fobRaw.value ?? {}).filter(k => k !== '_meta').sort())
const anioFobSel = ref('2024')
watchEffect(() => {
  const a = aniosFob.value
  if (a.length && !a.includes(anioFobSel.value)) anioFobSel.value = a[a.length - 1]
})
const fobAnio = computed(() => fobRaw.value?.[anioFobSel.value] ?? { ton: 0, fob_usd: 0, destinos: [] })
const topDestinos = computed(() =>
  (fobAnio.value.destinos ?? []).slice(0, 8).map(d => ({
    ...d,
    pct: fobAnio.value.fob_usd ? Math.round((d.fob / fobAnio.value.fob_usd) * 100) : 0,
  }))
)
const chartFob = computed(() => ({
  labels: aniosFob.value,
  datasets: [{
    label: 'FOB (millones USD)',
    data: aniosFob.value.map(a => Math.round((fobRaw.value?.[a]?.fob_usd ?? 0) / 1e6)),
    backgroundColor: aniosFob.value.map(a => a === anioFobSel.value ? TEAL : TEAL + '55'),
    borderRadius: 3,
  }],
}))
const optsFob = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { callback: v => 'US$' + v + 'M' } } },
}

// US$/kg FOB implícito = fob_usd / (ton * 1000), sobre los mismos datos ya cargados.
const fobKgImplicito = computed(() =>
  aniosFob.value.map(a => {
    const d = fobRaw.value?.[a]
    const ton = +(d?.ton ?? 0)
    const fob = +(d?.fob_usd ?? 0)
    return { anio: a, usd_kg: ton ? fob / (ton * 1000) : null }
  })
)

// ── PRECIO INTERNACIONAL (World Bank Pink Sheet) — fail-quiet ──────
// Schema esperado: { _meta, series: { "YYYY-MM": { europe_usd_kg, us_usd_kg } } }
const intlOk = computed(() =>
  !e4.value &&
  !!intlRaw.value?.series &&
  Object.keys(intlRaw.value.series).length > 0
)
const intlFuente = computed(() =>
  intlRaw.value?._meta?.fuente ?? 'World Bank — Commodity Markets (Pink Sheet)'
)
const intlMeses = computed(() => Object.keys(intlRaw.value?.series ?? {}).sort())
const chartIntl = computed(() => {
  const series = intlRaw.value?.series ?? {}
  const meses = intlMeses.value
  return {
    labels: meses,
    datasets: [
      {
        label: 'Europa (US$/kg)',
        data: meses.map(m => series[m]?.europe_usd_kg ?? null),
        borderColor: TEAL,
        backgroundColor: 'transparent',
        tension: 0.3,
        spanGaps: true,
        pointRadius: 1,
      },
      {
        label: 'EE.UU. (US$/kg)',
        data: meses.map(m => series[m]?.us_usd_kg ?? null),
        borderColor: AMBER,
        backgroundColor: 'transparent',
        tension: 0.3,
        spanGaps: true,
        pointRadius: 1,
      },
    ],
  }
})
const optsIntl = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
  scales: {
    x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
    y: { ticks: { callback: v => 'US$' + v } },
  },
}

useHead({ title: 'Cadena de valor agro · Atlas Urabá' })
</script>

<style scoped>
.cad-root { min-height: 100vh; background: #0d1211; color: #e7e5e0; }
.cad-header { display: flex; align-items: center; gap: 20px; padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.cad-back { display: inline-flex; align-items: center; gap: 6px; font-family: ui-monospace, monospace; font-size: 11px; color: #8a8a85; text-decoration: none; }
.cad-back:hover { color: #e7e5e0; }
.cad-title { font-size: 16px; font-weight: 700; }
.cad-subtitle { font-family: ui-monospace, monospace; font-size: 10px; color: #8a8a85; letter-spacing: 0.08em; }
.cad-main { max-width: 1060px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 22px; }
.cad-state { padding: 60px 0; text-align: center; font-family: ui-monospace, monospace; font-size: 12px; color: #8a8a85; }
.cad-state--err { color: #f46d43; }
.cad-block { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 18px 20px; }
.cad-block-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.cad-h2 { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }
.cad-step { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 999px; background: #1B6B6D; color: #fff; font-family: ui-monospace, monospace; font-size: 11px; }
.cad-selects { display: flex; gap: 8px; }
.cad-select { background: #16201e; color: #e7e5e0; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; font-size: 11px; padding: 5px 8px; }
.cad-chart-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: start; }
.cad-chart { height: 230px; position: relative; }
.cad-chart--wide { height: 260px; position: relative; }
.cad-mini-table { font-family: ui-monospace, monospace; font-size: 10.5px; display: flex; flex-direction: column; gap: 4px; }
.cad-mini-head { font-size: 10px; color: #8a8a85; letter-spacing: 0.06em; margin-bottom: 4px; }
.cad-mini-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 6px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.cad-mini-row--4 { grid-template-columns: repeat(4, 1fr); }
.cad-mini-row > .cad-mini-y { color: #8a8a85; }
.cad-empty { font-family: ui-monospace, monospace; font-size: 11px; color: #8a8a85; padding: 20px 0; }
.cad-fuente { margin-top: 10px; font-size: 9px; color: #6b6b66; }
.cad-nota { font-size: 11px; line-height: 1.5; color: #b8b6b0; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 6px; padding: 8px 10px; margin-bottom: 14px; }
.cad-nota strong { color: #e7e5e0; }
.cad-fob-kg { margin-top: 14px; }
.cad-fob-kg-title { font-size: 10px; color: #8a8a85; letter-spacing: 0.04em; margin-bottom: 6px; font-family: ui-monospace, monospace; }
.cad-fob-kg-row { display: flex; flex-wrap: wrap; gap: 8px; }
.cad-fob-kg-chip { font-family: ui-monospace, monospace; font-size: 10.5px; color: #e7e5e0; background: rgba(27,107,109,0.15); border: 1px solid rgba(27,107,109,0.4); border-radius: 999px; padding: 4px 10px; }
.cad-fob-kg-chip b { color: #4dd0d3; margin-right: 4px; }
.cad-callout { margin-top: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-left: 3px solid #1B6B6D; border-radius: 6px; padding: 10px 14px; }
.cad-callout-title { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; color: #4dd0d3; margin-bottom: 6px; }
.cad-callout-text { font-size: 11.5px; line-height: 1.55; color: #d6d4cf; }
.cad-callout-text strong { color: #e7e5e0; }
@media (max-width: 760px) { .cad-chart-grid { grid-template-columns: 1fr; } }
</style>
