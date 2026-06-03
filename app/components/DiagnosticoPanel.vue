<template>
  <div class="diag-panel">

    <!-- ══════════════════════════════════════════
         VISTA "TODOS" — Ranking regional + distribución
    ══════════════════════════════════════════ -->
    <template v-if="store.municipioActivo === 'Todos'">

      <!-- ── Eyebrow ─────────────────────────────── -->
      <div class="diag-section">
        <div class="section-eyebrow">
          <span class="eyebrow-num">D1</span>
          <span class="eyebrow-dash">—</span>
          <span>Ranking regional</span>
        </div>
        <p class="diag-lead">
          8 municipios ordenados por Índice Atlas · Urabá 2025
        </p>

        <!-- Tabla ranking -->
        <div class="ranking-table">
          <div
            v-for="(row, i) in rankingCompleto"
            :key="row.nombre"
            class="rank-row"
            :class="{ 'rank-row--top': i === 0 }"
            @click="store.setMunicipio(row.nombre)"
          >
            <!-- Posición -->
            <span class="rank-pos" :class="rankPosClass(i)">{{ i + 1 }}</span>

            <!-- Nombre -->
            <span class="rank-nombre">{{ row.nombre }}</span>

            <!-- Barra -->
            <div class="rank-bar-wrap">
              <div
                class="rank-bar-fill"
                :style="{
                  width: row.score + '%',
                  background: scoreColor(row.score / 100)
                }"
              />
              <!-- Línea de promedio regional -->
              <div class="rank-avg-line" :style="{ left: urabaAvgPct + '%' }" />
            </div>

            <!-- Valor -->
            <span class="rank-val" :style="{ color: scoreColor(row.score / 100) }">
              {{ row.score }}
            </span>

            <!-- Badge nivel -->
            <span class="rank-badge" :style="scoreBadgeStyle(row.score / 100)">
              {{ scoreLabel(row.score / 100) }}
            </span>
          </div>
        </div>

        <!-- Nota promedio -->
        <div class="rank-note">
          <span class="rank-note-line" />
          <span class="rank-note-text">
            Promedio Urabá: <strong>{{ Math.round(urabaAvg) }}</strong>/100
          </span>
        </div>
      </div>

      <!-- ── Distribución por nivel ──────────────── -->
      <div class="diag-section">
        <div class="section-eyebrow">
          <span class="eyebrow-num">D2</span>
          <span class="eyebrow-dash">—</span>
          <span>Distribución de manzanas por bienestar</span>
        </div>

        <div v-if="loading" class="diag-loading">Cargando datos…</div>
        <template v-else>
          <!-- Barra de distribución apilada -->
          <div class="dist-bar-wrap">
            <div
              v-for="lvl in nivelesDistribucion"
              :key="lvl.key"
              class="dist-segment"
              :style="{ flex: lvl.count, background: lvl.color }"
              :title="`${lvl.label}: ${lvl.count} manzanas`"
            />
          </div>

          <!-- Leyenda de distribución -->
          <div class="dist-legend">
            <div
              v-for="lvl in nivelesDistribucion"
              :key="lvl.key"
              class="dist-legend-item"
            >
              <span class="dist-dot" :style="{ background: lvl.color }" />
              <span class="dist-label">{{ lvl.label }}</span>
              <span class="dist-count">{{ lvl.count.toLocaleString('es-CO') }}</span>
            </div>
          </div>

          <!-- Alerta intervención urgente -->
          <div v-if="manzanasUrgentes > 0" class="urgencia-card">
            <div class="urgencia-icon">!</div>
            <div class="urgencia-text">
              <span class="urgencia-num">{{ manzanasUrgentes.toLocaleString('es-CO') }}</span>
              <span class="urgencia-sub">manzanas en nivel Crítico o Bajo requieren intervención urgente</span>
            </div>
          </div>
        </template>
      </div>

    </template>

    <!-- ══════════════════════════════════════════
         VISTA MUNICIPIO — Diagnóstico completo
    ══════════════════════════════════════════ -->
    <template v-else>

      <!-- ── 1. SCORE HEADLINE ───────────────────── -->
      <div class="diag-section diag-section--hero">
        <div class="section-eyebrow">
          <span class="eyebrow-num">D1</span>
          <span class="eyebrow-dash">—</span>
          <span>Diagnóstico · {{ store.municipioActivo }}</span>
        </div>

        <div class="hero-score-row">
          <!-- Score grande -->
          <div class="hero-score-block">
            <span
              class="hero-score-num"
              :style="{ color: scoreColor(munScore / 100) }"
            >{{ munScore }}</span>
            <span class="hero-score-denom">/100</span>
          </div>

          <!-- Nivel + Ranking -->
          <div class="hero-meta-block">
            <span
              class="hero-nivel-badge"
              :style="scoreBadgeStyle(munScore / 100)"
            >{{ munNivel }}</span>
            <div class="hero-rank-badge">
              <span class="hero-rank-pos">#{{ munRanking }}</span>
              <span class="hero-rank-of">de 8</span>
            </div>
          </div>
        </div>

        <!-- Barra de progreso -->
        <div class="hero-track">
          <div
            class="hero-fill"
            :style="{
              width: munScore + '%',
              background: scoreColor(munScore / 100)
            }"
          />
          <!-- Marcador promedio Urabá -->
          <div
            class="hero-avg-marker"
            :style="{ left: Math.round(urabaAvg) + '%' }"
            :title="`Promedio Urabá: ${Math.round(urabaAvg)}`"
          >
            <span class="hero-avg-label">Urabá {{ Math.round(urabaAvg) }}</span>
          </div>
        </div>
      </div>

      <!-- ── 2. NARRATIVA ────────────────────────── -->
      <div class="diag-section" v-if="munData">
        <div class="section-eyebrow">
          <span class="eyebrow-num">D2</span>
          <span class="eyebrow-dash">—</span>
          <span>Contexto territorial</span>
        </div>
        <p class="narrativa-text">{{ munData.narrativa }}</p>
      </div>

      <!-- ── 3. RADAR — Barras horizontales ─────── -->
      <div class="diag-section">
        <div class="section-eyebrow">
          <span class="eyebrow-num">D3</span>
          <span class="eyebrow-dash">—</span>
          <span>Dimensiones vs promedio Urabá</span>
        </div>

        <div class="radar-list">
          <div
            v-for="dim in dimensionesDiag"
            :key="dim.key"
            class="radar-row"
          >
            <!-- Label -->
            <div class="radar-label-wrap">
              <span class="radar-dot" :style="{ background: dim.color }" />
              <span class="radar-label">{{ dim.label }}</span>
            </div>

            <!-- Track doble -->
            <div class="radar-track-wrap">
              <div class="radar-track">
                <!-- Barra municipio -->
                <div
                  class="radar-bar-mun"
                  :style="{
                    width: munDimScore(dim.key) + '%',
                    background: dim.color
                  }"
                />
                <!-- Marcador promedio Urabá -->
                <div
                  class="radar-avg-tick"
                  :style="{ left: urabaDimScore(dim.key) + '%' }"
                />
              </div>
              <!-- Scores -->
              <div class="radar-scores">
                <span class="radar-val-mun" :style="{ color: dim.color }">
                  {{ munDimScore(dim.key) }}
                </span>
                <span class="radar-sep">·</span>
                <span class="radar-val-avg">{{ urabaDimScore(dim.key) }} avg</span>

                <!-- Gap badge -->
                <span
                  v-if="munData"
                  class="radar-gap"
                  :class="gapClass(munData.gaps_vs_uraba?.[dim.key])"
                >
                  {{ formatGap(munData.gaps_vs_uraba?.[dim.key]) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 4. COMPARACIÓN benchmarks ──────────── -->
      <div class="diag-section" v-if="benchmarks">
        <div class="section-eyebrow">
          <span class="eyebrow-num">D4</span>
          <span class="eyebrow-dash">—</span>
          <span>Comparación referencial</span>
        </div>

        <table class="bench-table">
          <thead>
            <tr>
              <th class="bench-th bench-th--dim">Dimensión</th>
              <th class="bench-th">{{ abrevMun }}</th>
              <th class="bench-th">Urabá</th>
              <th class="bench-th">Antioquia</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="dim in dimensionesDiag"
              :key="dim.key"
              class="bench-tr"
            >
              <td class="bench-td bench-td--dim">
                <span class="bench-dot" :style="{ background: dim.color }" />
                {{ dim.labelShort }}
              </td>
              <td class="bench-td bench-td--val" :style="{ color: dim.color }">
                {{ munDimScore(dim.key) }}
              </td>
              <td class="bench-td bench-td--val bench-td--ref">
                {{ Math.round((benchmarks.referencias?.uraba_promedio?.[dim.key] ?? 0) * 100) }}
              </td>
              <td class="bench-td bench-td--val bench-td--ref">
                {{ Math.round((benchmarks.referencias?.antioquia_promedio?.[dim.key] ?? 0) * 100) }}
              </td>
            </tr>
            <!-- Fila total Atlas -->
            <tr class="bench-tr bench-tr--total">
              <td class="bench-td bench-td--dim bench-td--total">Atlas Score</td>
              <td class="bench-td bench-td--val bench-td--total" :style="{ color: scoreColor(munScore / 100) }">
                {{ munScore }}
              </td>
              <td class="bench-td bench-td--val bench-td--ref bench-td--total">
                {{ Math.round((benchmarks.referencias?.uraba_promedio?.atlas_score ?? 0) * 100) }}
              </td>
              <td class="bench-td bench-td--val bench-td--ref bench-td--total">
                {{ Math.round((benchmarks.referencias?.antioquia_promedio?.atlas_score ?? 0) * 100) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── 5. BRECHAS ─────────────────────────── -->
      <div class="diag-section" v-if="munData">
        <div class="section-eyebrow">
          <span class="eyebrow-num">D5</span>
          <span class="eyebrow-dash">—</span>
          <span>Fortaleza · Brecha prioritaria</span>
        </div>

        <div class="brechas-row">
          <!-- Fortaleza -->
          <div class="brecha-pill brecha-pill--pos">
            <span class="brecha-icon">▲</span>
            <div class="brecha-content">
              <span class="brecha-tipo">Fortaleza</span>
              <span class="brecha-dim">{{ dimLabel(munData.fortaleza) }}</span>
              <span class="brecha-score">{{ munDimScore(munData.fortaleza) }}/100</span>
            </div>
          </div>

          <!-- Debilidad -->
          <div class="brecha-pill brecha-pill--neg">
            <span class="brecha-icon">▼</span>
            <div class="brecha-content">
              <span class="brecha-tipo">Brecha</span>
              <span class="brecha-dim">{{ dimLabel(munData.debilidad) }}</span>
              <span class="brecha-score">{{ munDimScore(munData.debilidad) }}/100</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 6. TOP 5 MANZANAS PRIORITARIAS ─────── -->
      <div class="diag-section" v-if="topManzanas.length">
        <div class="section-eyebrow">
          <span class="eyebrow-num">D6</span>
          <span class="eyebrow-dash">—</span>
          <span>Top 5 manzanas prioritarias</span>
        </div>
        <p class="diag-sublead">Mayor déficit acumulado · intervención urgente</p>

        <div class="manzanas-list">
          <div
            v-for="(mz, i) in topManzanas"
            :key="mz.cod_manzana"
            class="manzana-row"
          >
            <!-- Número -->
            <span class="mz-num">{{ i + 1 }}</span>

            <!-- Contenido -->
            <div class="mz-info">
              <span class="mz-cod">{{ formatManzana(mz.cod_manzana) }}</span>
              <span class="mz-full-cod">{{ mz.cod_manzana }}</span>
            </div>

            <!-- Score -->
            <div class="mz-right">
              <span
                class="mz-score"
                :style="{ color: scoreColor(mz.atlas_score) }"
              >{{ Math.round(mz.atlas_score * 100) }}</span>
              <span
                class="mz-prioridad"
                :class="prioridadClass(mz.prioridad)"
              >{{ mz.prioridad }}</span>
            </div>
          </div>
        </div>

        <!-- Nota de prioridad -->
        <div class="manzanas-note">
          Score Atlas · 0 = peor bienestar · 100 = mejor bienestar
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="diag-loading">
        <div class="loading-spinner" />
        Cargando datos de diagnóstico…
      </div>

      <!-- Botón ficha municipal -->
      <div v-if="!loading && store.municipioActivo !== 'Todos'" class="diag-ficha-row">
        <button class="diag-ficha-btn" @click="$emit('open-ficha')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
            <line x1="3" y1="4" x2="9" y2="4" stroke="currentColor" stroke-width="1"/>
            <line x1="3" y1="6.5" x2="9" y2="6.5" stroke="currentColor" stroke-width="1"/>
            <line x1="3" y1="9" x2="6.5" y2="9" stroke="currentColor" stroke-width="1"/>
          </svg>
          Ver ficha municipal
        </button>
      </div>

    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAtlasStore, DIMENSIONES } from '~/stores/atlas'

const emit = defineEmits(['open-ficha'])
const store = useAtlasStore()

/* ─── Data refs ──────────────────────────────────── */
const gapAnalysis  = ref(null)
const benchmarks   = ref(null)
const topPrioridad = ref(null)
const loading      = ref(true)

/* ─── Dimensiones para el diagnóstico ───────────── */
const dimensionesDiag = [
  { key: 'score_accesibilidad',  label: 'Accesibilidad',  labelShort: 'Accesib.',  color: '#60a5fa' },
  { key: 'score_ambiental',      label: 'Ambiental',      labelShort: 'Ambiental', color: '#34d399' },
  { key: 'score_socioeconomico', label: 'Socioeconómico', labelShort: 'Socioec.',  color: '#a78bfa' },
  { key: 'score_seguridad',      label: 'Seguridad',      labelShort: 'Seguridad', color: '#fbbf24' },
]

/* ─── Fetch JSONs ────────────────────────────────── */
async function fetchData() {
  loading.value = true
  try {
    const [gapRes, benchRes, topRes] = await Promise.all([
      fetch('/data/gap_analysis.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/data/benchmarks.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/data/top_prioridad.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    gapAnalysis.value  = gapRes
    benchmarks.value   = benchRes
    topPrioridad.value = topRes
  } catch (e) {
    console.warn('[DiagnosticoPanel] Error cargando datos:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

/* ─── Score helpers ──────────────────────────────── */
function scoreColor(v) {
  const n = +v
  if (n >= 0.85) return 'var(--score-6, #1a9850)'
  if (n >= 0.70) return 'var(--score-5, #66bd63)'
  if (n >= 0.55) return 'var(--score-4, #a6d96a)'
  if (n >= 0.40) return 'var(--score-3, #fdae61)'
  if (n >= 0.20) return 'var(--score-2, #f46d43)'
  return 'var(--score-1, #d73027)'
}

function scoreLabel(v) {
  const n = +v
  if (n >= 0.85) return 'Excelente'
  if (n >= 0.70) return 'Alto'
  if (n >= 0.55) return 'Medio-alto'
  if (n >= 0.40) return 'Medio-bajo'
  if (n >= 0.20) return 'Bajo'
  return 'Crítico'
}

function scoreBadgeStyle(v) {
  const color = scoreColor(v)
  return {
    color,
    border: `1px solid ${color}44`,
    background: `${color}18`,
  }
}

/* ─── Datos del municipio activo ─────────────────── */
const munData = computed(() => {
  const m = store.municipioActivo
  return gapAnalysis.value?.[m] ?? null
})

const munScore = computed(() => {
  const m = store.municipioActivo
  if (m === 'Todos') return null
  // Primero desde gap_analysis (más preciso), luego desde store.stats
  return munData.value?.atlas_score
    ?? Math.round((store.stats[m]?.avg?.atlas_score ?? 0) * 100)
})

const munNivel = computed(() => {
  if (!munData.value) return scoreLabel(munScore.value / 100)
  const nivel = munData.value.nivel ?? ''
  return nivel.charAt(0).toUpperCase() + nivel.slice(1)
})

const abrevMun = computed(() => {
  const m = store.municipioActivo
  if (m.length <= 8) return m
  return m.split(' ')[0]
})

/* ─── Ranking de los 8 municipios ────────────────── */
const rankingCompleto = computed(() => {
  const municipios = [
    'Apartadó','Turbo','Chigorodó','Carepa',
    'Necoclí','Arboletes','San Pedro de Urabá','San Juan de Urabá'
  ]
  return municipios
    .map(nombre => {
      const score = gapAnalysis.value?.[nombre]?.atlas_score
        ?? Math.round((store.stats[nombre]?.avg?.atlas_score ?? 0) * 100)
      return { nombre, score }
    })
    .sort((a, b) => b.score - a.score)
})

const munRanking = computed(() => {
  const m = store.municipioActivo
  const idx = rankingCompleto.value.findIndex(r => r.nombre === m)
  return idx >= 0 ? idx + 1 : '—'
})

/* ─── Promedio Urabá ──────────────────────────────── */
const urabaAvg = computed(() => {
  return gapAnalysis.value
    ? rankingCompleto.value.reduce((s, r) => s + r.score, 0) / rankingCompleto.value.length
    : Math.round((store.stats['Todos']?.avg?.atlas_score ?? 0.62) * 100)
})

const urabaAvgPct = computed(() => Math.round(urabaAvg.value))

/* ─── Scores por dimensión ───────────────────────── */
function munDimScore(key) {
  const m = store.municipioActivo
  if (munData.value?.dimensiones?.[key] != null)
    return munData.value.dimensiones[key]
  return Math.round((store.stats[m]?.avg?.[key] ?? 0) * 100)
}

function urabaDimScore(key) {
  if (benchmarks.value?.referencias?.uraba_promedio?.[key] != null)
    return Math.round(benchmarks.value.referencias.uraba_promedio[key] * 100)
  // Fallback: promedio de store.stats
  const all = Object.values(store.stats).filter(v => v.avg?.[key] != null)
  if (!all.length) return 0
  const total = all.reduce((s, v) => s + v.count, 0)
  return Math.round(all.reduce((s, v) => s + (v.avg[key] ?? 0) * v.count, 0) / total * 100)
}

/* ─── Gap helpers ────────────────────────────────── */
function formatGap(val) {
  if (val == null) return ''
  return val >= 0 ? `+${val}` : `${val}`
}

function gapClass(val) {
  if (val == null) return ''
  if (val > 0) return 'radar-gap--pos'
  if (val < 0) return 'radar-gap--neg'
  return 'radar-gap--neu'
}

/* ─── Dimensión label helper ─────────────────────── */
function dimLabel(key) {
  return dimensionesDiag.find(d => d.key === key)?.label ?? key
}

/* ─── Top 5 manzanas ─────────────────────────────── */
const topManzanas = computed(() => {
  const m = store.municipioActivo
  return topPrioridad.value?.[m] ?? []
})

function formatManzana(cod) {
  // Mostrar los últimos 10 caracteres del código
  return '…' + cod.slice(-10)
}

function prioridadClass(p) {
  if (p === 'Crítica') return 'mz-prio--critica'
  if (p === 'Alta')    return 'mz-prio--alta'
  if (p === 'Media')   return 'mz-prio--media'
  return 'mz-prio--baja'
}

/* ─── Ranking helpers ────────────────────────────── */
function rankPosClass(i) {
  if (i === 0) return 'rank-pos--gold'
  if (i === 1) return 'rank-pos--silver'
  if (i === 2) return 'rank-pos--bronze'
  return ''
}

/* ─── Distribución de manzanas por nivel ─────────── */
const nivelesDistribucion = computed(() => {
  const stats = store.stats
  const niveles = [
    { key: 'critico',    label: 'Crítico',    color: '#d73027', min: 0,    max: 0.20 },
    { key: 'bajo',       label: 'Bajo',       color: '#f46d43', min: 0.20, max: 0.40 },
    { key: 'mediobajo',  label: 'Medio-bajo', color: '#fdae61', min: 0.40, max: 0.55 },
    { key: 'medioalto',  label: 'Medio-alto', color: '#a6d96a', min: 0.55, max: 0.70 },
    { key: 'alto',       label: 'Alto',       color: '#66bd63', min: 0.70, max: 0.85 },
    { key: 'excelente',  label: 'Excelente',  color: '#1a9850', min: 0.85, max: 1.01 },
  ]
  // Usar distribución desde store.stats si disponible
  // Como no tenemos histograma directo, estimamos usando atlas_stats avg + count
  // Para la vista global, usamos los conteos relativos
  const all = Object.entries(stats)
    .filter(([k]) => k !== 'Todos')
    .map(([, v]) => v)

  // Distribución estimada por percentiles de score
  return niveles.map(n => ({
    ...n,
    count: estimateCount(all, n.min, n.max),
  }))
})

function estimateCount(munStats, min, max) {
  // Estimación basada en la distribución gaussiana del score promedio por municipio
  // Se usa la media y el conteo para estimar cuántas manzanas caen en cada rango
  let total = 0
  munStats.forEach(s => {
    const avg = s.avg?.atlas_score ?? 0
    const sigma = 0.12 // desviación estándar estimada
    // Integral de Gauss entre min y max con media=avg, sigma=sigma
    const z1 = (min - avg) / sigma
    const z2 = (max - avg) / sigma
    const prob = phi(z2) - phi(z1)
    total += Math.round(prob * (s.count ?? 0))
  })
  return Math.max(total, 0)
}

function phi(x) {
  // Aproximación CDF de distribución normal estándar
  const a1 =  0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911
  const sign = x < 0 ? -1 : 1
  const t = 1.0 / (1.0 + p * Math.abs(x))
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2)
  return 0.5 * (1.0 + sign * y)
}

const manzanasUrgentes = computed(() => {
  const critico = nivelesDistribucion.value.find(n => n.key === 'critico')?.count ?? 0
  const bajo    = nivelesDistribucion.value.find(n => n.key === 'bajo')?.count ?? 0
  return critico + bajo
})
</script>

<style scoped>
/* ═════════════════════════════════════════════════════════
   DIAGNÓSTICO PANEL
   Sistema de diseño Tensor · dark institutional
   Paleta: --dk-* / Variables atlas · Acento: #1B6B6D
   ff-head: Space Grotesk · ff-mono: JetBrains Mono · ff-body: Inter
═════════════════════════════════════════════════════════ */

/* ─── Contenedor raíz ────────────────────────────── */
.diag-panel {
  display: flex;
  flex-direction: column;
  background: var(--white, #FFFFFF);
  min-height: 100%;

  /* Grid sutil heredado */
  background-image:
    linear-gradient(rgba(0,0,0,0.016) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.016) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* ─── Sección genérica ───────────────────────────── */
.diag-section {
  padding: 16px;
  border-bottom: 1px solid var(--cb, #E5E5E0);
  flex-shrink: 0;
}

.diag-section--hero {
  background: linear-gradient(180deg, rgba(27,107,109,0.06) 0%, transparent 100%);
}

/* ─── Eyebrow / label de sección ─────────────────── */
.section-eyebrow {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ca, #1B6B6D);
  margin-bottom: 10px;
  line-height: 1;
}

.eyebrow-num {
  color: var(--ca, #1B6B6D);
  opacity: 0.7;
}

.eyebrow-dash {
  color: var(--cb, #E5E5E0);
  margin: 0 1px;
}

/* ─── Lead text ──────────────────────────────────── */
.diag-lead {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.08em;
  color: var(--cm, #5F5F5B);
  margin: 0 0 12px 0;
  text-transform: uppercase;
}

.diag-sublead {
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--cm, #5F5F5B);
  opacity: 0.7;
  margin: 0 0 10px 0;
}

/* ─── Loading ────────────────────────────────────── */
.diag-loading {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--ff-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--cm, #5F5F5B);
  text-transform: uppercase;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--cb, #E5E5E0);
  border-top-color: var(--ca, #1B6B6D);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ════════════════════════════════════════════════════
   VISTA "TODOS" — Ranking
════════════════════════════════════════════════════ */

/* ─── Tabla de ranking ───────────────────────────── */
.ranking-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rank-row {
  display: grid;
  grid-template-columns: 18px 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 5px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rank-row:hover {
  background: rgba(0,0,0,0.04);
  border-color: var(--cb, #E5E5E0);
}

.rank-row--top {
  background: rgba(27,107,109,0.06);
  border-color: rgba(27,107,109,0.2);
}

.rank-pos {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  color: var(--cm, #5F5F5B);
  text-align: center;
  line-height: 1;
}

.rank-pos--gold   { color: #f59e0b; }
.rank-pos--silver { color: #9ca3af; }
.rank-pos--bronze { color: #b45309; }

.rank-nombre {
  font-family: var(--ff-body);
  font-size: 11px;
  font-weight: 400;
  color: var(--c1, #1A1A1A);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-bar-wrap {
  position: relative;
  width: 70px;
  height: 4px;
  background: var(--cb, #E5E5E0);
  border-radius: 2px;
  overflow: visible;
}

.rank-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.rank-avg-line {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 1.5px;
  background: var(--cm, #5F5F5B);
  opacity: 0.4;
  transform: translateX(-50%);
}

.rank-val {
  font-family: var(--ff-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  min-width: 22px;
  text-align: right;
}

.rank-badge {
  font-family: var(--ff-mono);
  font-size: 7px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
  display: none; /* Oculto en grid pequeño, visible en hover */
}

.rank-row:hover .rank-badge {
  display: inline;
}

/* Nota promedio */
.rank-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
}

.rank-note-line {
  flex: 1;
  height: 1px;
  background: var(--cb, #E5E5E0);
}

.rank-note-text {
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--cm, #5F5F5B);
  white-space: nowrap;
}

.rank-note-text strong {
  color: var(--c1, #1A1A1A);
  font-weight: 600;
}

/* ─── Distribución de manzanas ───────────────────── */
.dist-bar-wrap {
  display: flex;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 12px;
  gap: 1px;
}

.dist-segment {
  border-radius: 1px;
  transition: flex 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.dist-legend {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 14px;
}

.dist-legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
}

.dist-dot {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  flex-shrink: 0;
}

.dist-label {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.05em;
  color: var(--cm, #5F5F5B);
  flex: 1;
}

.dist-count {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  color: var(--c1, #1A1A1A);
}

/* ─── Alerta urgencia ────────────────────────────── */
.urgencia-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(215, 48, 39, 0.07);
  border: 1px solid rgba(215, 48, 39, 0.25);
  border-radius: 6px;
  margin-top: 4px;
}

.urgencia-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(215, 48, 39, 0.15);
  border: 1px solid rgba(215, 48, 39, 0.4);
  color: #d73027;
  font-family: var(--ff-mono);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.urgencia-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.urgencia-num {
  font-family: var(--ff-head);
  font-size: 16px;
  font-weight: 700;
  color: #d73027;
  letter-spacing: -0.3px;
  line-height: 1;
}

.urgencia-sub {
  font-family: var(--ff-body);
  font-size: 10px;
  font-weight: 400;
  color: var(--cm, #5F5F5B);
  line-height: 1.4;
}

/* ════════════════════════════════════════════════════
   VISTA MUNICIPIO
════════════════════════════════════════════════════ */

/* ─── Hero score ─────────────────────────────────── */
.hero-score-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 12px;
}

.hero-score-block {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.hero-score-num {
  font-family: var(--ff-head);
  font-size: 44px;
  font-weight: 700;
  letter-spacing: -1.5px;
  line-height: 1;
  transition: color 0.4s ease;
}

.hero-score-denom {
  font-family: var(--ff-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--cm, #5F5F5B);
  margin-bottom: 4px;
}

.hero-meta-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding-bottom: 4px;
}

.hero-nivel-badge {
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 3px;
  transition: all 0.4s ease;
}

.hero-rank-badge {
  display: flex;
  align-items: baseline;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 3px;
  background: rgba(0,0,0,0.05);
  border: 1px solid var(--cb, #E5E5E0);
}

.hero-rank-pos {
  font-family: var(--ff-head);
  font-size: 12px;
  font-weight: 700;
  color: var(--ca, #1B6B6D);
  letter-spacing: -0.3px;
}

.hero-rank-of {
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.08em;
  color: var(--cm, #5F5F5B);
}

/* Barra hero */
.hero-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: var(--cb, #E5E5E0);
  border-radius: 2px;
  overflow: visible;
}

.hero-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.7s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease;
}

.hero-avg-marker {
  position: absolute;
  top: -12px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-avg-marker::after {
  content: '';
  display: block;
  width: 1.5px;
  height: 18px;
  background: var(--cm, #5F5F5B);
  opacity: 0.4;
  margin-top: 1px;
}

.hero-avg-label {
  font-family: var(--ff-mono);
  font-size: 7px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--cm, #5F5F5B);
  white-space: nowrap;
  background: var(--white, #fff);
  padding: 0 2px;
  line-height: 1;
}

/* ─── Narrativa ──────────────────────────────────── */
.narrativa-text {
  font-family: var(--ff-body);
  font-size: 11.5px;
  font-weight: 400;
  line-height: 1.65;
  color: var(--cm, #5F5F5B);
  margin: 0;
}

/* ─── Radar de dimensiones ───────────────────────── */
.radar-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.radar-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.radar-label-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.radar-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.radar-label {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cm, #5F5F5B);
}

.radar-track-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.radar-track {
  position: relative;
  width: 100%;
  height: 5px;
  background: var(--cb, #E5E5E0);
  border-radius: 3px;
  overflow: visible;
}

.radar-bar-mun {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.radar-avg-tick {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  background: var(--cm, #5F5F5B);
  opacity: 0.35;
  border-radius: 1px;
  transform: translateX(-50%);
}

.radar-scores {
  display: flex;
  align-items: center;
  gap: 4px;
}

.radar-val-mun {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.radar-sep {
  font-family: var(--ff-mono);
  font-size: 9px;
  color: var(--cb, #E5E5E0);
}

.radar-val-avg {
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 400;
  color: var(--cm, #5F5F5B);
  letter-spacing: 0.04em;
}

/* Gap badge */
.radar-gap {
  margin-left: auto;
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 1px 5px;
  border-radius: 3px;
}

.radar-gap--pos {
  color: #1a9850;
  background: rgba(26, 152, 80, 0.12);
  border: 1px solid rgba(26, 152, 80, 0.25);
}

.radar-gap--neg {
  color: #d73027;
  background: rgba(215, 48, 39, 0.10);
  border: 1px solid rgba(215, 48, 39, 0.22);
}

.radar-gap--neu {
  color: var(--cm, #5F5F5B);
  background: rgba(0,0,0,0.05);
  border: 1px solid var(--cb, #E5E5E0);
}

/* ─── Tabla comparativa benchmarks ───────────────── */
.bench-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--ff-mono);
}

.bench-th {
  font-size: 7.5px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--cm, #5F5F5B);
  padding: 0 0 7px 0;
  text-align: right;
  border-bottom: 1px solid var(--cb, #E5E5E0);
}

.bench-th--dim {
  text-align: left;
  padding-right: 8px;
}

.bench-tr {
  border-bottom: 1px solid rgba(229, 229, 224, 0.6);
}

.bench-tr--total {
  border-bottom: none;
  border-top: 1px solid var(--cb, #E5E5E0);
  margin-top: 4px;
}

.bench-td {
  padding: 6px 0;
  font-size: 10px;
  font-weight: 400;
  color: var(--cm, #5F5F5B);
  text-align: right;
  vertical-align: middle;
}

.bench-td--dim {
  text-align: left;
  display: flex;
  align-items: center;
  gap: 5px;
  padding-right: 8px;
  font-size: 9px;
  letter-spacing: 0.04em;
}

.bench-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bench-td--val {
  font-weight: 600;
  letter-spacing: 0.03em;
}

.bench-td--ref {
  font-weight: 400;
  opacity: 0.75;
}

.bench-td--total {
  font-weight: 700;
  color: var(--c1, #1A1A1A);
  font-size: 11px;
}

/* ─── Brechas pills ──────────────────────────────── */
.brechas-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.brecha-pill {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 11px;
  border-radius: 7px;
  border: 1px solid;
}

.brecha-pill--pos {
  background: rgba(26, 152, 80, 0.07);
  border-color: rgba(26, 152, 80, 0.25);
}

.brecha-pill--neg {
  background: rgba(215, 48, 39, 0.07);
  border-color: rgba(215, 48, 39, 0.22);
}

.brecha-icon {
  font-size: 9px;
  line-height: 1;
  margin-top: 2px;
  flex-shrink: 0;
}

.brecha-pill--pos .brecha-icon { color: #1a9850; }
.brecha-pill--neg .brecha-icon { color: #d73027; }

.brecha-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brecha-tipo {
  font-family: var(--ff-mono);
  font-size: 7.5px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.6;
}

.brecha-pill--pos .brecha-tipo { color: #1a9850; }
.brecha-pill--neg .brecha-tipo { color: #d73027; }

.brecha-dim {
  font-family: var(--ff-body);
  font-size: 10.5px;
  font-weight: 500;
  color: var(--c1, #1A1A1A);
  line-height: 1.3;
}

.brecha-score {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.brecha-pill--pos .brecha-score { color: #1a9850; }
.brecha-pill--neg .brecha-score { color: #d73027; }

/* ─── Top 5 manzanas ─────────────────────────────── */
.manzanas-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 10px;
}

.manzana-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border-radius: 5px;
  border: 1px solid var(--cb, #E5E5E0);
  background: rgba(0,0,0,0.02);
  transition: background 0.15s ease;
}

.manzana-row:hover {
  background: rgba(0,0,0,0.05);
}

.mz-num {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 700;
  color: var(--ca, #1B6B6D);
  width: 12px;
  text-align: center;
  flex-shrink: 0;
}

.mz-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.mz-cod {
  font-family: var(--ff-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--c1, #1A1A1A);
}

.mz-full-cod {
  font-family: var(--ff-mono);
  font-size: 7.5px;
  font-weight: 400;
  letter-spacing: 0.03em;
  color: var(--cm, #5F5F5B);
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mz-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.mz-score {
  font-family: var(--ff-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.2px;
  line-height: 1;
}

.mz-prioridad {
  font-family: var(--ff-mono);
  font-size: 7px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 1px 4px;
  border-radius: 2px;
}

.mz-prio--critica {
  color: #d73027;
  background: rgba(215, 48, 39, 0.1);
  border: 1px solid rgba(215, 48, 39, 0.25);
}

.mz-prio--alta {
  color: #f46d43;
  background: rgba(244, 109, 67, 0.1);
  border: 1px solid rgba(244, 109, 67, 0.25);
}

.mz-prio--media {
  color: #fdae61;
  background: rgba(253, 174, 97, 0.1);
  border: 1px solid rgba(253, 174, 97, 0.25);
}

.mz-prio--baja {
  color: var(--cm, #5F5F5B);
  background: rgba(0,0,0,0.05);
  border: 1px solid var(--cb, #E5E5E0);
}

.manzanas-note {
  font-family: var(--ff-mono);
  font-size: 7.5px;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--cm, #5F5F5B);
  opacity: 0.65;
  text-transform: uppercase;
}

.diag-ficha-row {
  padding: 16px 0 8px;
  border-top: 1px solid var(--cb, #E5E5E0);
  margin-top: 12px;
}

.diag-ficha-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(27,107,109,0.4);
  background: rgba(27,107,109,0.06);
  cursor: pointer;
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ca, #1B6B6D);
  transition: all 0.15s;
}

.diag-ficha-btn:hover {
  background: var(--ca, #1B6B6D);
  color: #fff;
  border-color: var(--ca, #1B6B6D);
}
</style>
