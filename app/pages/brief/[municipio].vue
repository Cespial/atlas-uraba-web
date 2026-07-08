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
      <p v-if="esPdet !== null" class="b-badge" :class="esPdet ? 'b-badge--pdet' : 'b-badge--nopdet'">
        {{ esPdet ? 'Municipio PDET — Decreto 893/2017' : 'No pertenece a la subregión PDET Urabá (Decreto 893/2017)' }}
      </p>

      <!-- 2 · Score + dimensiones vs benchmarks -->
      <section class="b-scores">
        <div class="b-score-big">
          <span class="b-score-n">{{ score }}</span>
          <span class="b-score-d">/100 · Índice v3.1</span>
          <span class="b-nivel">{{ nivel }}</span>
        </div>
        <table class="b-dims">
          <thead>
            <tr><th>Dimensión</th><th>{{ nombre }}</th><th>Urabá</th><th>Antioquia</th><th>Colombia</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in dims" :key="d.label">
              <td>{{ d.label }}<span v-if="d.label === 'Seguridad' && notaSeguridadV31" class="b-nota-seg"> {{ notaSeguridadV31 }}</span></td>
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

      <!-- 6 · Agro (condicional) + 7 · señales (satélite + IRCA + seguridad) -->
      <section class="b-block b-cols">
        <div v-if="agro">
          <h2 class="b-h2">Economía agro ({{ agro.anio }})</h2>
          <p class="b-texto">
            Banano: <strong>{{ agro.produccion.toLocaleString('es-CO') }} t</strong> en
            {{ agro.area.toLocaleString('es-CO') }} ha sembradas
            ({{ agro.rendimiento.toFixed(1) }} t/ha). Detalle en uraba.tensor.lat/cadena.
          </p>
          <p class="b-badge b-badge--foc">Urabá: zona libre de Foc R4T (Res. ICA 095026/2021)</p>
        </div>
        <div v-if="satelite || irca || seguridad">
          <h2 class="b-h2">Señales</h2>
          <p v-if="satelite" class="b-texto b-texto-compacta">
            Temp. superficial media <strong>{{ satelite.lst }} °C</strong> (Landsat) ·
            radiancia nocturna <strong>{{ satelite.viirs }}</strong> nW/cm²·sr (VIIRS).
          </p>
          <p v-if="irca" class="b-texto b-texto-compacta">
            Calidad de agua (IRCA {{ irca.anio }}): <strong>{{ irca.valor }}</strong> — {{ irca.nivel }}.
            <template v-if="irca.tendencia">{{ irca.tendencia }}</template>
            Fuente: INS — SIVICAP.
          </p>
          <p v-if="seguridad" class="b-texto b-texto-compacta">
            Homicidios {{ seguridad.anio }}: <strong>{{ seguridad.homicidios }}</strong>
            ({{ seguridad.tasa }} por 100k hab.) — hechos reportados a autoridad (SIEDCO/MinDefensa).
            Fuente: MinDefensa — SIEDCO.
          </p>
        </div>
      </section>

      <!-- 8 · Perfiles similares (patrón DataMéxico) -->
      <p v-if="perfilesSimilaresTexto" class="b-similares">{{ perfilesSimilaresTexto }}</p>

      <!-- 9 · Fuentes -->
      <footer class="b-fuentes">
        <strong>Fuentes:</strong> DANE CNPV 2018 · DANE/MADR EVA · DANE SIPSA · DANE-DIAN exportaciones ·
        isócronas OSRM · Sentinel-2/Landsat 9/VIIRS (Google Earth Engine) · REPS · SIMAT · INS-SIVICAP (IRCA) ·
        MinDefensa-SIEDCO (homicidios) · ICA (estatus fitosanitario) · DNP (PDET, Decreto 893/2017) ·
        cálculos propios Atlas Urabá v3.1 (mapa de manzanas aún en v3). Índice de equidad: cálculo propio
        (Gini sobre atlas_score_v3, capa de manzana).
        Documento generado automáticamente — verificar cifras críticas antes de uso oficial.
      </footer>
    </article>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useScoreScale } from '~/composables/useScoreScale'
import { useMunicipioResumen, useMunicipiosSimilares } from '~/composables/useMunicipioResumen'
import { MUNICIPIO_SLUGS } from '~/utils/briefSlugs'

const { scoreLabel } = useScoreScale()

const route = useRoute()
const nombre = MUNICIPIO_SLUGS[route.params.municipio]
if (!nombre) {
  throw createError({ statusCode: 404, statusMessage: 'Municipio no encontrado' })
}

// Datos del municipio (composable compartido con FichaMunicipal.vue). El
// brief usa la fuente v3.1 (statsV3Avg/dimsV3, Ola 2 adopción) — ver nota al
// inicio de useMunicipioResumen.js sobre por qué NO se unifica con gap_analysis (v1).
const {
  statsV3Avg: avg, regionalScoreV3, dimsV3: dims, aniosSeguridadV31,
  equidadEntry: eq, top5, agro, satelite, esPdet, irca, seguridad,
  gapLoaded, benchLoaded, statsV3Loaded, topLoaded, evaLoaded,
} = useMunicipioResumen(() => nombre)

// Salvedad compacta (Ola 2, adopción v3.1): municipios con <3 años SIEDCO en
// el promedio de seguridad (hoy Arboletes y San Juan de Urabá — falta 2023).
// Ver docs/investigacion/2026-07-07/impacto-v31.md.
const ANIOS_ESPERADOS = ['2022', '2023', '2024']
const notaSeguridadV31 = computed(() => {
  const anios = aniosSeguridadV31.value
  if (!anios.length || anios.length >= 3) return ''
  const faltantes = ANIOS_ESPERADOS.filter(a => !anios.includes(a))
  return `(promedio ${anios.join('/')} — ${faltantes.join('/')} sin reporte SIEDCO)`
})

const { similares } = useMunicipiosSimilares(() => nombre)

// Mismo gate de "Cargando…" que antes: espera a los 5 fetches que
// determinan el contenido principal del brief (v3.1, gap, benchmarks, top,
// eva). Los complementarios (PDET, IRCA, seguridad) son fail-quiet y no
// bloquean el render.
const pending = computed(() =>
  !gapLoaded.value || !benchLoaded.value || !statsV3Loaded.value || !topLoaded.value || !evaLoaded.value
)

const hoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

const score = computed(() => Math.round((avg.value?.atlas_score_v3 ?? 0) * 100))
const nivel = computed(() => (avg.value?.atlas_score_v3 != null ? scoreLabel(avg.value.atlas_score_v3) : ''))

// Narrativa determinística v3.1: coherente con score, nivel y tabla de dimensiones de arriba.
const narrativa = computed(() => {
  const R = regionalScoreV3.value
  if (avg.value?.atlas_score_v3 == null || R == null || !dims.value.length) return ''
  const s = score.value
  const diff = Math.abs(s - R)
  const direccion = s >= R ? 'por encima' : 'por debajo'
  const dimMax = dims.value.reduce((a, b) => (b.mun > a.mun ? b : a))
  const dimMin = dims.value.reduce((a, b) => (b.mun < a.mun ? b : a))
  return `${nombre} registra un Índice de Bienestar v3.1 de ${s}/100 (${nivel.value.toLowerCase()}), ${diff} puntos ${direccion} del promedio regional (${R}/100). Su dimensión más fuerte es ${dimMax.label} (${dimMax.mun}/100); la brecha prioritaria es ${dimMin.label} (${dimMin.mun}/100).`
})

// Perfiles similares (patrón DataMéxico): 2 municipios más cercanos por
// distancia euclidiana sobre las 4 dimensiones normalizadas del índice v3.1.
const perfilesSimilaresTexto = computed(() => {
  if (similares.value.length < 2) return ''
  const [a, b] = similares.value
  return `Perfil territorial similar a ${a.nombre} y ${b.nombre} (distancia sobre las 4 dimensiones del índice v3.1).`
})

function descargarPdf() { window.print() }

useHead({
  title: `Brief · ${nombre} · Atlas Urabá`,
  meta: [
    { property: 'og:title', content: `Policy brief · ${nombre} — Atlas Urabá` },
    {
      property: 'og:description',
      content: `Diagnóstico territorial de ${nombre} (Urabá, Antioquia): índice de bienestar v3.1, equidad interna, seguridad, calidad de agua y economía agro. Atlas Urabá · Tensor.`,
    },
  ],
})
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
.b-sub { font-size: 10px; color: #5F5F5B; margin: 2px 0 6px; }
.b-badge { display: inline-block; margin: 0 0 8px; padding: 2px 8px; border-radius: 3px;
  font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.b-badge--pdet { background: #e6f2ec; color: #1a7a4c; }
.b-badge--nopdet { background: #f0f0ec; color: #5F5F5B; }
.b-badge--foc { background: #eaf3f3; color: #1B6B6D; margin-top: 4px; }
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
.b-nota-seg { display: block; font-size: 7.5px; font-weight: 400; font-style: italic; color: #8a8a85; line-height: 1.2; }
.b-block { margin-top: 11px; }
.b-h2 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: #1B6B6D; margin-bottom: 4px; font-weight: 700; }
.b-texto { margin: 0; }
.b-texto-compacta { margin: 3px 0 0; font-size: 9.5px; }
.b-top5 { width: 100%; border-collapse: collapse; font-size: 9.5px; }
.b-top5 th { text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a8a85; padding: 2px 6px; }
.b-top5 td { padding: 2.5px 6px; border-top: 1px solid #f0f0ec; }
.b-mono { font-family: ui-monospace, monospace; font-size: 8.5px; }
.b-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.b-similares { margin: 11px 0 0; font-size: 9.5px; font-style: italic; color: #5F5F5B; }
.b-fuentes { margin-top: 14px; padding-top: 8px; border-top: 1px solid #e2e2de; font-size: 9px; color: #6b6b66; line-height: 1.5; }

/* Impresión: solo la hoja, exactamente una página A4. */
@media print {
  .no-print { display: none !important; }
  .brief-wrap { background: #fff; padding: 0; }
  .brief-a4 { width: auto; min-height: 0; margin: 0; box-shadow: none; padding: 0; }
  @page { size: A4; margin: 12mm; }
}
</style>
