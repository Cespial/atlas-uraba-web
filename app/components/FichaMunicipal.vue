<template>
  <!-- ═══════════════════════════════════════════════════════════════
       FICHA MUNICIPAL — Atlas Urabá · Tensor 2025
       Overlay modal sobre el mapa. Light mode, estilo policy brief.
  ═══════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="ficha-fade">
      <div v-if="visible" class="ficha-backdrop" @click.self="$emit('close')">
        <div class="ficha-card" role="dialog" aria-modal="true" :aria-label="`Ficha municipal · ${municipioNombre}`">

          <!-- ── ACCIONES (ocultas en print) ─────────────────────── -->
          <div class="ficha-actions no-print">
            <NuxtLink v-if="briefUrl" :to="briefUrl" class="action-btn" title="Policy brief A4">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 2h6l3 3v9H4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
                <path d="M10 2v3h3M6.5 9h4M6.5 11.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              Brief PDF
            </NuxtLink>
            <NuxtLink v-if="briefUrl" to="/cadena" class="action-btn" title="Cadena de valor agro">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 13h12M3 13V8m3.3 5V5.5m3.4 7.5V7m3.3 6V3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              Cadena agro
            </NuxtLink>
            <button class="action-btn" @click="imprimir" title="Imprimir ficha">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 5V2h8v3M4 11H2V7h12v4h-2M4 11v3h8v-3M4 11h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Imprimir
            </button>
            <button class="action-btn" @click="compartir" title="Copiar enlace">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="12" cy="3" r="1.6" stroke="currentColor" stroke-width="1.3"/>
                <circle cx="12" cy="13" r="1.6" stroke="currentColor" stroke-width="1.3"/>
                <circle cx="4" cy="8" r="1.6" stroke="currentColor" stroke-width="1.3"/>
                <path d="M10.5 3.9L5.5 7.1M5.5 8.9l5 3.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              <span>{{ compartidoMsg || 'Compartir' }}</span>
            </button>
            <button class="action-btn action-btn--close" @click="$emit('close')" title="Cerrar">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- ════════════════════════════════════════════════════
               BLOQUE A — Encabezado institucional
          ════════════════════════════════════════════════════ -->
          <header class="ficha-header">
            <div class="header-eyebrow">
              <!-- Logo Tensor como SVG inline -->
              <div class="header-brand">
                <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo">
                  <rect x="7" y="7" width="22" height="22" rx="2.5"
                    stroke="#1B6B6D" stroke-width="1.8" stroke-opacity="0.9"
                    transform="rotate(45 18 18)" />
                  <rect x="12" y="12" width="12" height="12" rx="1.5"
                    fill="#1B6B6D" fill-opacity="0.9"
                    transform="rotate(45 18 18)" />
                </svg>
                <span class="brand-text">ATLAS URABÁ · TENSOR {{ anoActual }}</span>
              </div>
              <span class="header-fecha">Actualizado {{ fechaFormateada }}</span>
            </div>
          </header>

          <!-- ════════════════════════════════════════════════════
               BLOQUE B — Identidad del municipio
          ════════════════════════════════════════════════════ -->
          <section class="ficha-identity">
            <h1 class="identity-nombre">{{ municipioNombre }}</h1>
            <p class="identity-lugar">Antioquia, Colombia · Región Urabá</p>
          </section>

          <!-- ════════════════════════════════════════════════════
               BLOQUE C — Score principal + IBT bar
          ════════════════════════════════════════════════════ -->
          <section class="ficha-score-row">

            <!-- Score numérico -->
            <div class="score-kpi-block">
              <div class="score-big">
                <span class="score-number" :style="{ color: scoreColor(scorePpal / 100) }">
                  {{ scorePpal }}
                </span>
                <span class="score-denom">/100</span>
              </div>
              <div class="score-nivel" :style="nivelStyle">{{ nivelLabel }}</div>
            </div>

            <!-- IBT bar + ranking -->
            <div class="score-bar-block">
              <div class="score-bar-label">ÍNDICE DE BIENESTAR TERRITORIAL</div>
              <div class="score-track">
                <div
                  class="score-fill"
                  :style="{ width: scorePpal + '%', background: scoreColor(scorePpal / 100) }"
                />
                <div class="score-fill-bg" />
              </div>
              <div class="score-bar-meta">
                <span class="score-pct">{{ scorePpal }}%</span>
                <span class="score-ranking">
                  Posición: <strong>{{ ranking }}°</strong> de 8 municipios
                </span>
              </div>
            </div>

          </section>

          <!-- ════════════════════════════════════════════════════
               BLOQUE D — Dimensiones con barras comparativas
          ════════════════════════════════════════════════════ -->
          <section class="ficha-dimensiones">
            <div class="dim-header">
              <span class="dim-col-label">DIMENSIONES</span>
              <span class="dim-col-mun">MUNICIPIO</span>
              <span class="dim-col-barra"></span>
              <span class="dim-col-gap">vs. Urabá</span>
            </div>

            <div
              v-for="dim in dimensionesViz"
              :key="dim.key"
              class="dim-row"
            >
              <span class="dim-nombre">{{ dim.label }}</span>
              <span class="dim-score" :style="{ color: scoreColor(dim.value / 100) }">
                {{ dim.value }}
              </span>
              <div class="dim-bar-wrap">
                <div
                  class="dim-bar"
                  :style="{
                    width: dim.value + '%',
                    background: scoreColor(dim.value / 100),
                  }"
                />
              </div>
              <span
                class="dim-gap"
                :class="dim.gap >= 0 ? 'dim-gap--pos' : 'dim-gap--neg'"
              >
                {{ dim.gap >= 0 ? '+' : '' }}{{ dim.gap }}
              </span>
            </div>
          </section>

          <!-- ════════════════════════════════════════════════════
               BLOQUE D2 — Equidad interna (desigualdad entre manzanas)
          ════════════════════════════════════════════════════ -->
          <section v-if="equidadEntry" class="ficha-equidad">
            <div class="equidad-header">EQUIDAD INTERNA · desigualdad entre manzanas</div>
            <div class="equidad-grid">
              <div class="equidad-item">
                <span class="equidad-val">{{ equidadEntry.gini.toFixed(2) }}</span>
                <span class="equidad-label">Gini del score v3</span>
              </div>
              <div class="equidad-item">
                <span class="equidad-val">{{ Math.round(equidadEntry.brecha_p90_p10 * 100) }}</span>
                <span class="equidad-label">Brecha p90−p10 (pts)</span>
              </div>
              <div class="equidad-item">
                <span class="equidad-val">{{ equidadEntry.manzanas_criticas }}</span>
                <span class="equidad-label">Manzanas críticas ({{ Math.round(equidadEntry.pct_criticas * 100) }}%)</span>
              </div>
            </div>
            <p class="equidad-nota">
              Crítica = manzana bajo el p25 regional de Urabá.
              Fuente: cálculo propio sobre CNPV 2018 + satélite GEE + isócronas OSRM.
            </p>
          </section>

          <!-- ════════════════════════════════════════════════════
               BLOQUE E — Diagnóstico narrativo
          ════════════════════════════════════════════════════ -->
          <section v-if="narrativa" class="ficha-diagnostico">
            <div class="diagnostico-label">DIAGNÓSTICO</div>
            <p class="diagnostico-texto">{{ narrativa }}</p>

            <div v-if="fortaleza || debilidad" class="diag-badges">
              <span v-if="fortaleza" class="diag-badge diag-badge--green">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5.5l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Fortaleza: {{ dimLabel(fortaleza) }}
              </span>
              <span v-if="debilidad" class="diag-badge diag-badge--amber">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 3v2.5M5 7h.01" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
                Prioridad: {{ dimLabel(debilidad) }}
              </span>
            </div>
          </section>

          <!-- ════════════════════════════════════════════════════
               BLOQUE F — Pie: manzanas + fuentes
          ════════════════════════════════════════════════════ -->
          <footer class="ficha-footer">
            <div class="footer-manzanas">
              <span class="footer-num">{{ manzanasTotal.toLocaleString('es-CO') }}</span>
              <span class="footer-num-label">MANZANAS<br/>URABÁ</span>
            </div>
            <div class="footer-divider" />
            <div class="footer-detalle">
              <div class="footer-mun-manzanas">
                <strong>{{ manzanasMun.toLocaleString('es-CO') }}</strong> manzanas analizadas en {{ municipioNombre }}
              </div>
              <div class="footer-fuentes">
                FUENTES: CNPV 2018 · REPS MinSalud · SIMAT MEN · OSM Colombia · MGN DANE 2024
              </div>
            </div>
          </footer>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAtlasStore, DIMENSIONES, MUNICIPIOS } from '~/stores/atlas'
import { useScoreScale } from '~/composables/useScoreScale'
import { useEquidad } from '~/composables/useEquidad'
import { slugFor } from '~/utils/briefSlugs'

// ─── Props & Emits ────────────────────────────────────────────────────────────
const props = defineProps({
  visible: { type: Boolean, default: false },
})
defineEmits(['close'])

// ─── Store ────────────────────────────────────────────────────────────────────
const store = useAtlasStore()

// ─── Datos externos ───────────────────────────────────────────────────────────
const gapData        = ref(null)   // gap_analysis.json
const benchmarksData = ref(null)   // benchmarks.json

const cargandoDatos = ref(false)

async function cargarDatos() {
  if (gapData.value && benchmarksData.value) return
  cargandoDatos.value = true
  try {
    const [gapRes, benchRes] = await Promise.all([
      fetch('/data/gap_analysis.json'),
      fetch('/data/benchmarks.json'),
    ])
    gapData.value        = await gapRes.json()
    benchmarksData.value = await benchRes.json()
  } catch (e) {
    console.error('[FichaMunicipal] Error cargando datos:', e)
  } finally {
    cargandoDatos.value = false
  }
}

onMounted(cargarDatos)

// Cargar datos también cuando se abre la ficha (por si se monta tarde)
watch(() => props.visible, (v) => { if (v) cargarDatos() })

// ─── Equidad interna (Task equidad intra-municipal) ──────────────────────────
const { equidad } = useEquidad()
const equidadEntry = computed(() => {
  if (store.municipioActivo === 'Todos') return null
  return equidad.value?.municipios?.[store.municipioActivo] ?? null
})

// ─── Brief URL ────────────────────────────────────────────────────────────
const briefUrl = computed(() => {
  const s = slugFor(store.municipioActivo)
  return s ? `/brief/${s}` : null
})

// ─── Municipio activo ────────────────────────────────────────────────────────
const municipioNombre = computed(() =>
  store.municipioActivo === 'Todos' ? 'Urabá (Región)' : store.municipioActivo
)

// ─── Score principal: desde gap_analysis o desde store.stats ─────────────────
const gapEntry = computed(() => {
  const nombre = store.municipioActivo
  if (!gapData.value || nombre === 'Todos') return null
  return gapData.value[nombre] ?? null
})

const scorePpal = computed(() => {
  if (gapEntry.value) return gapEntry.value.atlas_score
  const s = store.stats[store.municipioActivo]
  if (s?.avg?.atlas_score) return Math.round(s.avg.atlas_score * 100)
  // fallback región
  const all = Object.values(store.stats)
  if (!all.length) return 0
  const total = all.reduce((acc, v) => acc + v.count, 0) || 1
  return Math.round(all.reduce((acc, v) => acc + (v.avg?.atlas_score ?? 0) * v.count, 0) / total * 100)
})

const nivelLabel = computed(() => {
  if (gapEntry.value?.nivel) {
    const n = gapEntry.value.nivel
    return n.charAt(0).toUpperCase() + n.slice(1)
  }
  return scoreLabel(scorePpal.value / 100)
})

// ─── Ranking ─────────────────────────────────────────────────────────────────
const ranking = computed(() => {
  const nombre = store.municipioActivo
  if (nombre === 'Todos') return '—'
  const scores = MUNICIPIOS
    .filter(m => m.nombre !== 'Todos')
    .map(m => {
      const gap = gapData.value?.[m.nombre]?.atlas_score
      if (gap != null) return { nombre: m.nombre, score: gap }
      const st  = store.stats[m.nombre]?.avg?.atlas_score
      return { nombre: m.nombre, score: st != null ? Math.round(st * 100) : 0 }
    })
    .sort((a, b) => b.score - a.score)
  const pos = scores.findIndex(s => s.nombre === nombre) + 1
  return pos || '—'
})

// ─── Promedio regional Urabá (para gaps) ─────────────────────────────────────
const urabaPromedio = computed(() => {
  // Desde benchmarks
  if (benchmarksData.value?.referencias?.uraba_promedio) {
    const u = benchmarksData.value.referencias.uraba_promedio
    return {
      score_accesibilidad:  Math.round((u.score_accesibilidad ?? 0) * 100),
      score_ambiental:      Math.round((u.score_ambiental ?? 0) * 100),
      score_socioeconomico: Math.round((u.score_socioeconomico ?? 0) * 100),
      score_seguridad:      Math.round((u.score_seguridad ?? 0) * 100),
    }
  }
  // Fallback: promedio ponderado del store
  const all = Object.values(store.stats)
  if (!all.length) return { score_accesibilidad: 0, score_ambiental: 0, score_socioeconomico: 0, score_seguridad: 0 }
  const total = all.reduce((s, v) => s + v.count, 0) || 1
  return {
    score_accesibilidad:  Math.round(all.reduce((s,v) => s + (v.avg?.score_accesibilidad ?? 0)*v.count, 0)/total * 100),
    score_ambiental:      Math.round(all.reduce((s,v) => s + (v.avg?.score_ambiental ?? 0)*v.count, 0)/total * 100),
    score_socioeconomico: Math.round(all.reduce((s,v) => s + (v.avg?.score_socioeconomico ?? 0)*v.count, 0)/total * 100),
    score_seguridad:      Math.round(all.reduce((s,v) => s + (v.avg?.score_seguridad ?? 0)*v.count, 0)/total * 100),
  }
})

// ─── Dimensiones para visualización ──────────────────────────────────────────
const DIMS_VIZ = [
  { key: 'score_accesibilidad',  label: 'Accesibilidad'   },
  { key: 'score_ambiental',      label: 'Ambiental'       },
  { key: 'score_socioeconomico', label: 'Socioeconómico'  },
  { key: 'score_seguridad',      label: 'Seguridad'       },
]

const dimensionesViz = computed(() => {
  return DIMS_VIZ.map(d => {
    let value, gap

    if (gapEntry.value) {
      value = gapEntry.value.dimensiones?.[d.key] ?? 0
      gap   = gapEntry.value.gaps_vs_uraba?.[d.key] ?? 0
    } else {
      const st = store.stats[store.municipioActivo]?.avg?.[d.key]
      value    = st != null ? Math.round(st * 100) : 0
      gap      = value - (urabaPromedio.value[d.key] ?? 0)
    }

    return { ...d, value, gap }
  })
})

// ─── Narrativa ────────────────────────────────────────────────────────────────
const narrativa  = computed(() => gapEntry.value?.narrativa ?? null)
const fortaleza  = computed(() => gapEntry.value?.fortaleza ?? null)
const debilidad  = computed(() => gapEntry.value?.debilidad ?? null)

function dimLabel(key) {
  return DIMS_VIZ.find(d => d.key === key)?.label ?? key
}

// ─── Manzanas ─────────────────────────────────────────────────────────────────
const manzanasTotal = computed(() =>
  Object.values(store.stats).reduce((s, v) => s + v.count, 0) || 7028
)

const manzanasMun = computed(() => {
  const nombre = store.municipioActivo
  if (nombre === 'Todos') return manzanasTotal.value
  return store.stats[nombre]?.count ?? 0
})

// ─── Fecha ────────────────────────────────────────────────────────────────────
const anoActual = new Date().getFullYear()
const fechaFormateada = computed(() => {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date())
})

// ─── Colores ─────────────────────────────────────────────────────────────────
// Escala compartida (paleta verde de paneles) — ver composables/useScoreScale.js
const { scoreColor, scoreLabel } = useScoreScale()

const nivelStyle = computed(() => {
  const color = scoreColor(scorePpal.value / 100)
  return {
    color,
    background: color + '18',
    border: `1px solid ${color}40`,
  }
})

// ─── Acciones ─────────────────────────────────────────────────────────────────
function imprimir() {
  window.print()
}

const compartidoMsg = ref('')
async function compartir() {
  try {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    compartidoMsg.value = '¡Copiado!'
    setTimeout(() => { compartidoMsg.value = '' }, 2200)
  } catch {
    compartidoMsg.value = 'Error'
    setTimeout(() => { compartidoMsg.value = '' }, 1800)
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   FICHA MUNICIPAL — Tensor Design System, Light mode
   Paleta: fondo blanco · texto #1A1A1A · acento #1B6B6D
   Tipografía: Space Grotesk (head) · Inter (body) · JetBrains Mono (mono)
   Variables del design system: --ff-head, --ff-body, --ff-mono
═══════════════════════════════════════════════════════════════ */

/* ── Backdrop ────────────────────────────────────────────────── */
.ficha-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(10, 12, 18, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}

/* ── Card ────────────────────────────────────────────────────── */
.ficha-card {
  position: relative;
  width: 100%;
  max-width: 680px;
  background: #FFFFFF;
  border-radius: 14px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.07),
    0 4px 6px -2px rgba(0, 0, 0, 0.05),
    0 20px 48px -8px rgba(0, 0, 0, 0.22);
  overflow: hidden;

  /* Sutil grid de fondo — estilo blueprint */
  background-image:
    linear-gradient(rgba(27,107,109,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(27,107,109,0.025) 1px, transparent 1px);
  background-size: 32px 32px;
}

/* ── Acciones flotantes ──────────────────────────────────────── */
.ficha-actions {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border-radius: 7px;
  border: 1px solid #E5E5E0;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  cursor: pointer;
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #5F5F5B;
  transition: all 0.15s ease;
}

.action-btn:hover {
  color: #1A1A1A;
  border-color: #C8C8C2;
  background: #FFFFFF;
}

.action-btn--close {
  padding: 6px;
  color: #999;
}

.action-btn--close:hover {
  color: #d73027;
  border-color: #f4bdc0;
  background: #fff5f5;
}

/* ── Header institucional ────────────────────────────────────── */
.ficha-header {
  padding: 18px 22px 14px;
  border-bottom: 1px solid #E5E5E0;
  background: linear-gradient(180deg, rgba(27,107,109,0.04) 0%, transparent 100%);
}

.header-eyebrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-logo {
  flex-shrink: 0;
}

.brand-text {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #1B6B6D;
}

.header-fecha {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9E9E98;
}

/* ── Identidad municipio ─────────────────────────────────────── */
.ficha-identity {
  padding: 18px 22px 12px;
  border-bottom: 1px solid #E5E5E0;
}

.identity-nombre {
  font-family: var(--ff-head, 'Space Grotesk', sans-serif);
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.64px;
  color: #1A1A1A;
  margin: 0 0 3px 0;
  line-height: 1.1;
}

.identity-lugar {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #9E9E98;
  margin: 0;
}

/* ── Score principal ─────────────────────────────────────────── */
.ficha-score-row {
  display: grid;
  grid-template-columns: 148px 1fr;
  border-bottom: 1px solid #E5E5E0;
}

.score-kpi-block {
  padding: 20px 20px 20px 22px;
  border-right: 1px solid #E5E5E0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.score-big {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.score-number {
  font-family: var(--ff-head, 'Space Grotesk', sans-serif);
  font-size: 52px;
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1;
  transition: color 0.4s ease;
}

.score-denom {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9E9E98;
  margin-bottom: 4px;
}

.score-nivel {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 4px;
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  width: fit-content;
}

.score-bar-block {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.score-bar-label {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #9E9E98;
}

.score-track {
  position: relative;
  width: 100%;
  height: 8px;
  background: #EEEEEA;
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  position: absolute;
  inset: 0;
  right: auto;
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.score-fill-bg {
  position: absolute;
  inset: 0;
  background: transparent;
}

.score-bar-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.score-pct {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #5F5F5B;
}

.score-ranking {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: #9E9E98;
}

.score-ranking strong {
  color: #1B6B6D;
  font-weight: 600;
}

/* ── Dimensiones ─────────────────────────────────────────────── */
.ficha-dimensiones {
  padding: 16px 22px 14px;
  border-bottom: 1px solid #E5E5E0;
}

.dim-header {
  display: grid;
  grid-template-columns: 120px 44px 1fr 56px;
  gap: 0 10px;
  margin-bottom: 8px;
  align-items: center;
}

.dim-col-label,
.dim-col-mun,
.dim-col-gap {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 7.5px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #C0C0BA;
}

.dim-col-mun { text-align: right; }
.dim-col-gap { text-align: right; }

.dim-row {
  display: grid;
  grid-template-columns: 120px 44px 1fr 56px;
  gap: 0 10px;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid #F0F0EC;
}

.dim-row:last-child { border-bottom: none; }

.dim-nombre {
  font-family: var(--ff-body, 'Inter', sans-serif);
  font-size: 11px;
  font-weight: 500;
  color: #3A3A36;
  white-space: nowrap;
}

.dim-score {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: right;
  transition: color 0.3s ease;
}

.dim-bar-wrap {
  height: 6px;
  background: #EEEEEA;
  border-radius: 3px;
  overflow: hidden;
}

.dim-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.dim-gap {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: right;
}

.dim-gap--pos { color: #16a34a; }
.dim-gap--neg { color: #dc2626; }

/* ── Equidad interna ─────────────────────────────────────────── */
.ficha-equidad { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.08); }
.equidad-header { font-family: ui-monospace, monospace; font-size: 8px; letter-spacing: 0.15em; color: #8a8a85; margin-bottom: 8px; }
.equidad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.equidad-item { display: flex; flex-direction: column; gap: 2px; }
.equidad-val { font-size: 20px; font-weight: 700; color: #1B6B6D; font-variant-numeric: tabular-nums; }
.equidad-label { font-size: 9.5px; color: #5F5F5B; }
.equidad-nota { margin-top: 8px; font-size: 8.5px; color: #8a8a85; }

/* ── Diagnóstico ─────────────────────────────────────────────── */
.ficha-diagnostico {
  padding: 16px 22px 14px;
  border-bottom: 1px solid #E5E5E0;
}

.diagnostico-label {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 7.5px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #1B6B6D;
  margin-bottom: 8px;
}

.diagnostico-texto {
  font-family: var(--ff-body, 'Inter', sans-serif);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.65;
  color: #3A3A36;
  margin: 0 0 10px 0;
}

.diag-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.diag-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 4px;
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.diag-badge--green {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.diag-badge--amber {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

/* ── Footer con manzanas y fuentes ───────────────────────────── */
.ficha-footer {
  display: grid;
  grid-template-columns: 116px auto 1fr;
  align-items: center;
  padding: 14px 22px;
  background: #FAFAF8;
  border-top: 1px solid #E5E5E0;
  gap: 16px;
}

.footer-manzanas {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.footer-num {
  font-family: var(--ff-head, 'Space Grotesk', sans-serif);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.52px;
  color: #1A1A1A;
  line-height: 1;
}

.footer-num-label {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #9E9E98;
  line-height: 1.5;
}

.footer-divider {
  width: 1px;
  height: 36px;
  background: #E5E5E0;
  flex-shrink: 0;
}

.footer-detalle {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.footer-mun-manzanas {
  font-family: var(--ff-body, 'Inter', sans-serif);
  font-size: 11px;
  color: #5F5F5B;
  line-height: 1.4;
}

.footer-mun-manzanas strong {
  color: #1A1A1A;
  font-weight: 600;
}

.footer-fuentes {
  font-family: var(--ff-mono, 'JetBrains Mono', monospace);
  font-size: 7.5px;
  font-weight: 400;
  letter-spacing: 0.08em;
  color: #B0B0AA;
  text-transform: uppercase;
}

/* ── Transición entrada/salida ───────────────────────────────── */
.ficha-fade-enter-active {
  transition: opacity 0.25s ease, transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.ficha-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.ficha-fade-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(12px);
}

.ficha-fade-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(6px);
}

/* ═══════════════════════════════════════════════════════════════
   @media print — Tarjeta imprimible
   Oculta todo el UI salvo la ficha-card
═══════════════════════════════════════════════════════════════ */
@media print {
  /* Ocultar UI exterior en print desde el body */
  :global(.atlas-root > *:not(.ficha-backdrop)) {
    display: none !important;
  }

  .ficha-backdrop {
    position: static !important;
    background: none !important;
    backdrop-filter: none !important;
    padding: 0 !important;
    display: block !important;
  }

  .ficha-card {
    box-shadow: none !important;
    border-radius: 0 !important;
    border: 1px solid #D0D0CA;
    max-width: 100% !important;
    background-image: none !important;
    page-break-inside: avoid;
  }

  .no-print {
    display: none !important;
  }

  .identity-nombre {
    font-size: 26px !important;
  }

  .score-number {
    font-size: 44px !important;
  }

  .ficha-footer {
    background: #FFF !important;
  }
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 520px) {
  .ficha-backdrop {
    padding: 0;
    align-items: flex-end;
  }

  .ficha-card {
    border-radius: 16px 16px 0 0;
    max-height: 90vh;
    overflow-y: auto;
  }

  .identity-nombre {
    font-size: 24px;
  }

  .score-number {
    font-size: 42px;
  }

  .ficha-score-row {
    grid-template-columns: 120px 1fr;
  }

  .dim-header,
  .dim-row {
    grid-template-columns: 90px 38px 1fr 48px;
    gap: 0 6px;
  }

  .dim-nombre {
    font-size: 10px;
  }

  .ficha-footer {
    grid-template-columns: 100px auto 1fr;
    gap: 12px;
  }

  .footer-num {
    font-size: 22px;
  }
}
</style>
