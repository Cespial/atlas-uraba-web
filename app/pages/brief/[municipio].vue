<template>
  <div class="brief-wrap">
    <!-- Barra de acciones — NO se imprime -->
    <div class="brief-bar no-print">
      <NuxtLink to="/" class="bb-back">← Atlas</NuxtLink>
      <span class="bb-title">Policy brief · {{ nombre }}</span>
      <button class="bb-print" @click="descargarPdf">Descargar PDF</button>
    </div>

    <div v-if="pending" class="brief-state no-print">Cargando datos…</div>

    <!-- ══════════ HOJA A4 ══════════ -->
    <article v-else class="brief-a4">
      <!-- 1 · Encabezado -->
      <header class="b-head">
        <div class="b-brand">
          <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
            <rect x="7" y="7" width="22" height="22" rx="2.5" stroke="#1B6B6D" stroke-width="1.8" transform="rotate(45 18 18)"/>
            <rect x="12" y="12" width="12" height="12" rx="1.5" fill="#1B6B6D" transform="rotate(45 18 18)"/>
          </svg>
          <span>ATLAS URABÁ · TENSOR</span>
        </div>
        <span class="b-fecha">Generado {{ hoy }} · uraba.tensor.lat</span>
      </header>

      <h1 class="b-mun">{{ nombre }}</h1>
      <p class="b-sub">Policy brief territorial · Antioquia, región Urabá · 1 página</p>

      <!-- 2 · Score + dimensiones vs benchmarks -->
      <section class="b-scores">
        <div class="b-score-big">
          <span class="b-score-n">{{ score }}</span>
          <span class="b-score-d">/100 · Índice v3</span>
          <span class="b-nivel">{{ nivel }}</span>
        </div>
        <table class="b-dims">
          <thead>
            <tr><th>Dimensión</th><th>{{ nombre }}</th><th>Urabá</th><th>Antioquia</th><th>Colombia</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in dims" :key="d.label">
              <td>{{ d.label }}</td>
              <td class="b-strong" :style="{ color: d.color }">{{ d.mun }}</td>
              <td>{{ d.uraba }}</td>
              <td>{{ d.antioquia }}</td>
              <td>{{ d.colombia }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 3 · Narrativa de gaps -->
      <section v-if="narrativa" class="b-block">
        <h2 class="b-h2">Diagnóstico</h2>
        <p class="b-texto">{{ narrativa }}</p>
      </section>

      <!-- 4 · Equidad interna -->
      <section v-if="eq" class="b-block">
        <h2 class="b-h2">Equidad interna</h2>
        <p class="b-texto">
          Gini del score entre manzanas: <strong>{{ eq.gini.toFixed(2) }}</strong> ·
          brecha p90−p10: <strong>{{ Math.round(eq.brecha_p90_p10 * 100) }} pts</strong> ·
          <strong>{{ eq.manzanas_criticas }}</strong> manzanas críticas
          ({{ Math.round(eq.pct_criticas * 100) }}% de {{ eq.n_manzanas.toLocaleString('es-CO') }}),
          bajo el p25 regional de Urabá.
        </p>
      </section>

      <!-- 5 · Top-5 manzanas prioritarias -->
      <section v-if="top5.length" class="b-block">
        <h2 class="b-h2">Manzanas prioritarias de inversión</h2>
        <table class="b-top5">
          <thead><tr><th>#</th><th>Código DANE manzana</th><th>Prioridad</th><th>Score</th></tr></thead>
          <tbody>
            <tr v-for="(m, i) in top5" :key="m.cod_manzana">
              <td>{{ i + 1 }}</td>
              <td class="b-mono">{{ m.cod_manzana }}</td>
              <td>{{ m.prioridad }} ({{ m.prioridad_pct }}%)</td>
              <td>{{ Math.round(m.atlas_score * 100) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 6 · Agro (condicional) + 7 · satélite -->
      <section class="b-block b-cols">
        <div v-if="agro">
          <h2 class="b-h2">Economía agro ({{ agro.anio }})</h2>
          <p class="b-texto">
            Banano: <strong>{{ agro.produccion.toLocaleString('es-CO') }} t</strong> en
            {{ agro.area.toLocaleString('es-CO') }} ha sembradas
            ({{ agro.rendimiento.toFixed(1) }} t/ha). Detalle en uraba.tensor.lat/cadena.
          </p>
        </div>
        <div v-if="satelite">
          <h2 class="b-h2">Señales satelitales</h2>
          <p class="b-texto">
            Temp. superficial media <strong>{{ satelite.lst }} °C</strong> (Landsat) ·
            radiancia nocturna <strong>{{ satelite.viirs }}</strong> nW/cm²·sr (VIIRS).
          </p>
        </div>
      </section>

      <!-- 8 · Fuentes -->
      <footer class="b-fuentes">
        <strong>Fuentes:</strong> DANE CNPV 2018 · DANE/MADR EVA · DANE SIPSA · DANE-DIAN exportaciones ·
        isócronas OSRM · Sentinel-2/Landsat 9/VIIRS (Google Earth Engine) · REPS · SIMAT ·
        cálculos propios Atlas Urabá v3. Índice de equidad: cálculo propio (Gini sobre atlas_score_v3).
        Documento generado automáticamente — verificar cifras críticas antes de uso oficial.
      </footer>
    </article>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEquidad } from '~/composables/useEquidad'
import { useScoreScale } from '~/composables/useScoreScale'
import { MUNICIPIO_SLUGS } from '~/utils/briefSlugs'

const { scoreLabel } = useScoreScale()

const route = useRoute()
const nombre = MUNICIPIO_SLUGS[route.params.municipio]
if (!nombre) {
  throw createError({ statusCode: 404, statusMessage: 'Municipio no encontrado' })
}

const { data: statsRaw, pending: p1 } = await useFetch('/data/atlas_stats_v3.json', { server: false, lazy: true })
const { data: gapRaw,   pending: p2 } = await useFetch('/data/gap_analysis.json', { server: false, lazy: true })
const { data: benchRaw, pending: p3 } = await useFetch('/data/benchmarks.json', { server: false, lazy: true })
const { data: topRaw,   pending: p4 } = await useFetch('/data/top_prioridad.json', { server: false, lazy: true })
const { data: evaRaw,   pending: p5 } = await useFetch('/data/eva_produccion_serie.json', { server: false, lazy: true })
const { equidad } = useEquidad()

const pending = computed(() => p1.value || p2.value || p3.value || p4.value || p5.value)

const hoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

const pct = v => Math.round((v ?? 0) * 100)
const avg = computed(() => statsRaw.value?.municipios?.[nombre]?.avg ?? {})
const gap = computed(() => gapRaw.value?.[nombre] ?? {})

const score = computed(() => Math.round((avg.value.atlas_score_v3 ?? 0) * 100))
const nivel = computed(() => (avg.value.atlas_score_v3 != null ? scoreLabel(avg.value.atlas_score_v3) : ''))

// Promedio regional v3: media ponderada por conteo de manzanas de cada municipio.
const regionalScoreV3 = computed(() => {
  const munis = statsRaw.value?.municipios ?? {}
  let totalCount = 0
  let weightedSum = 0
  for (const m of Object.values(munis)) {
    const c = m?.count ?? 0
    const s = m?.avg?.atlas_score_v3 ?? 0
    totalCount += c
    weightedSum += c * s
  }
  return totalCount ? Math.round((weightedSum / totalCount) * 100) : null
})

// Dimensiones v3 municipio vs benchmarks (todo llevado a 0–100).
const DIMS = [
  { label: 'Accesibilidad',  v3: 'score_accesibilidad_v3',  bench: 'score_accesibilidad' },
  { label: 'Ambiental',      v3: 'score_ambiental_v3',      bench: 'score_ambiental' },
  { label: 'Socioeconómico', v3: 'score_socioeconomico_v3', bench: 'score_socioeconomico' },
  { label: 'Seguridad',      v3: 'score_seguridad',         bench: 'score_seguridad' },
]
const dims = computed(() => {
  const refs = benchRaw.value?.referencias ?? {}
  return DIMS.map(d => {
    const mun = pct(avg.value[d.v3])
    const uraba = pct(refs.uraba_promedio?.[d.bench])
    return {
      label: d.label,
      mun,
      uraba,
      antioquia: pct(refs.antioquia_promedio?.[d.bench]),
      colombia: pct(refs.colombia_promedio?.[d.bench]),
      color: mun >= uraba ? '#1a9850' : '#d73027',
    }
  })
})

// Narrativa determinística v3: coherente con score, nivel y tabla de dimensiones de arriba.
const narrativa = computed(() => {
  const R = regionalScoreV3.value
  if (avg.value.atlas_score_v3 == null || R == null || !dims.value.length) return ''
  const s = score.value
  const diff = Math.abs(s - R)
  const direccion = s >= R ? 'por encima' : 'por debajo'
  const dimMax = dims.value.reduce((a, b) => (b.mun > a.mun ? b : a))
  const dimMin = dims.value.reduce((a, b) => (b.mun < a.mun ? b : a))
  return `${nombre} registra un Índice de Bienestar v3 de ${s}/100 (${nivel.value.toLowerCase()}), ${diff} puntos ${direccion} del promedio regional (${R}/100). Su dimensión más fuerte es ${dimMax.label} (${dimMax.mun}/100); la brecha prioritaria es ${dimMin.label} (${dimMin.mun}/100).`
})

const eq = computed(() => equidad.value?.municipios?.[nombre] ?? null)
const top5 = computed(() => (topRaw.value?.[nombre] ?? []).slice(0, 5))

// Agro: banano del municipio, último año con datos. Omitir si no hay.
const agro = computed(() => {
  const m = Object.values(evaRaw.value?.data ?? {}).find(x => x.municipio === nombre)
  const series = m?.cultivos?.Banano?.series
  if (!series) return null
  const anios = Object.keys(series).sort()
  if (!anios.length) return null
  const ult = anios[anios.length - 1]
  const arr = Array.isArray(series[ult]) ? series[ult] : [series[ult]]
  const produccion = arr.reduce((t, d) => t + (+d.produccion_ton || 0), 0)
  const area = arr.reduce((t, d) => t + (+d.area_sembrada_ha || 0), 0)
  const cosechada = arr.reduce((t, d) => t + (+d.area_cosechada_ha || 0), 0)
  if (!produccion) return null
  return { anio: ult, produccion, area, rendimiento: cosechada ? produccion / cosechada : 0 }
})

const satelite = computed(() => {
  const a = avg.value
  if (a.lst_c == null && a.viirs_rad == null) return null
  return {
    lst: a.lst_c != null ? (Math.round(a.lst_c * 10) / 10).toLocaleString('es-CO') : '—',
    viirs: a.viirs_rad != null ? (Math.round(a.viirs_rad * 10) / 10).toLocaleString('es-CO') : '—',
  }
})

function descargarPdf() { window.print() }

useHead({ title: `Brief · ${nombre} · Atlas Urabá` })
</script>

<style scoped>
/* Pantalla: hoja centrada sobre fondo neutro. */
.brief-wrap { min-height: 100vh; background: #e8e8e4; padding-bottom: 40px; }
.brief-bar { display: flex; align-items: center; gap: 16px; padding: 12px 24px; background: #0d1211; color: #e7e5e0; }
.bb-back { color: #8a8a85; text-decoration: none; font-size: 12px; }
.bb-back:hover { color: #e7e5e0; }
.bb-title { flex: 1; font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: 0.08em; }
.bb-print { background: #1B6B6D; color: #fff; border: 0; border-radius: 6px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
.bb-print:hover { filter: brightness(1.1); }
.brief-state { padding: 60px; text-align: center; font-family: ui-monospace, monospace; color: #5F5F5B; }

/* Hoja A4: 210mm de ancho, alto libre en pantalla (una página al imprimir). */
.brief-a4 { width: 210mm; min-height: 280mm; margin: 24px auto 0; background: #fff; color: #1c1c1a;
  padding: 14mm 16mm; box-shadow: 0 2px 24px rgba(0,0,0,0.18); box-sizing: border-box;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; font-size: 10.5px; line-height: 1.45; }
.b-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.b-brand { display: flex; align-items: center; gap: 7px; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: 0.14em; color: #1B6B6D; font-weight: 700; }
.b-fecha { font-size: 8.5px; color: #8a8a85; }
.b-mun { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; margin: 2px 0 0; }
.b-sub { font-size: 10px; color: #5F5F5B; margin: 2px 0 12px; }
.b-scores { display: grid; grid-template-columns: 130px 1fr; gap: 18px; align-items: center; padding: 10px 0 12px; border-top: 2px solid #1B6B6D; border-bottom: 1px solid #e2e2de; }
.b-score-big { display: flex; flex-direction: column; }
.b-score-n { font-size: 44px; font-weight: 700; color: #1B6B6D; line-height: 1; }
.b-score-d { font-size: 9px; color: #8a8a85; }
.b-nivel { margin-top: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #5F5F5B; }
.b-dims { width: 100%; border-collapse: collapse; font-size: 10px; }
.b-dims th { text-align: right; font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a8a85; padding: 3px 6px; }
.b-dims th:first-child, .b-dims td:first-child { text-align: left; }
.b-dims td { text-align: right; padding: 3px 6px; border-top: 1px solid #f0f0ec; }
.b-strong { font-weight: 700; }
.b-block { margin-top: 11px; }
.b-h2 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: #1B6B6D; margin-bottom: 4px; font-weight: 700; }
.b-texto { margin: 0; }
.b-top5 { width: 100%; border-collapse: collapse; font-size: 9.5px; }
.b-top5 th { text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a8a85; padding: 2px 6px; }
.b-top5 td { padding: 2.5px 6px; border-top: 1px solid #f0f0ec; }
.b-mono { font-family: ui-monospace, monospace; font-size: 8.5px; }
.b-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.b-fuentes { margin-top: 14px; padding-top: 8px; border-top: 1px solid #e2e2de; font-size: 7.8px; color: #8a8a85; line-height: 1.5; }

/* Impresión: solo la hoja, exactamente una página A4. */
@media print {
  .no-print { display: none !important; }
  .brief-wrap { background: #fff; padding: 0; }
  .brief-a4 { width: auto; min-height: 0; margin: 0; box-shadow: none; padding: 0; }
  @page { size: A4; margin: 12mm; }
}
</style>
