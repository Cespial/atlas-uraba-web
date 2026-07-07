<template>
  <div class="cmp-root">
    <!-- Header propio -->
    <header class="cmp-header">
      <NuxtLink to="/" class="cmp-back">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Volver al mapa
      </NuxtLink>
      <div class="cmp-title-wrap">
        <h1 class="cmp-title">Comparador de municipios</h1>
        <span class="cmp-subtitle">Índice de Bienestar Territorial · v3</span>
      </div>
      <div class="cmp-badge">
        <span class="badge-dot" />
        8 municipios
      </div>
    </header>

    <main class="cmp-main">
      <!-- Selectores -->
      <div class="cmp-selectors">
        <div class="sel-group sel-a">
          <label class="sel-label">Municipio A</label>
          <select v-model="munA" class="sel-input">
            <option v-for="m in nombres" :key="`a-${m}`" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="sel-vs">vs</div>
        <div class="sel-group sel-b">
          <label class="sel-label">Municipio B</label>
          <select v-model="munB" class="sel-input">
            <option v-for="m in nombres" :key="`b-${m}`" :value="m">{{ m }}</option>
          </select>
        </div>
        <button class="sel-swap" @click="swap" aria-label="Intercambiar A y B" title="Intercambiar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 5h8l-2-2M12 11H4l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div v-if="pending" class="cmp-state">Cargando datos…</div>
      <div v-else-if="error" class="cmp-state cmp-state--err">No se pudieron cargar los datos.</div>

      <template v-else>
        <!-- Grid de comparación: A | DELTA | B -->
        <div class="cmp-grid">
          <!-- Columna A -->
          <section class="cmp-col">
            <MunicipioCard :data="dataA" side="a" :rank="rankA" />
            <NuxtLink :to="`/brief/${slugFor(munA)}`" class="cmp-brief-link">Policy brief A4 →</NuxtLink>
          </section>

          <!-- Columna DELTA -->
          <section class="cmp-delta">
            <h3 class="delta-h">Diferencia A − B</h3>
            <div
              v-for="d in deltas"
              :key="d.key"
              class="delta-row"
              :class="{ 'delta-row--max': d.key === maxGapKey }"
            >
              <span class="delta-dim">{{ d.short }}</span>
              <div class="delta-val" :style="{ color: d.color }">
                <svg v-if="d.diff !== 0" width="12" height="12" viewBox="0 0 12 12" :style="{ transform: d.diff > 0 ? 'none' : 'rotate(180deg)' }">
                  <path d="M6 2.5 9.5 8h-7z" :fill="d.color" />
                </svg>
                <span v-else class="delta-eq">=</span>
                {{ d.diff > 0 ? '+' : '' }}{{ d.diff }}
              </div>
              <span v-if="d.key === maxGapKey" class="delta-tag">Mayor brecha</span>
            </div>

            <div class="delta-total">
              <span class="delta-dim">Índice v3</span>
              <div class="delta-val" :style="{ color: deltaTotal.color }">
                <svg v-if="deltaTotal.diff !== 0" width="12" height="12" viewBox="0 0 12 12" :style="{ transform: deltaTotal.diff > 0 ? 'none' : 'rotate(180deg)' }">
                  <path d="M6 2.5 9.5 8h-7z" :fill="deltaTotal.color" />
                </svg>
                <span v-else class="delta-eq">=</span>
                {{ deltaTotal.diff > 0 ? '+' : '' }}{{ deltaTotal.diff }}
              </div>
            </div>

            <p class="delta-note">
              <strong :style="{ color: leaderColor }">{{ leaderName }}</strong>
              lidera el índice por {{ Math.abs(deltaTotal.diff) }} puntos.
              La mayor brecha está en <strong>{{ maxGapLabel }}</strong>.
            </p>
          </section>

          <!-- Columna B -->
          <section class="cmp-col">
            <MunicipioCard :data="dataB" side="b" :rank="rankB" />
            <NuxtLink :to="`/brief/${slugFor(munB)}`" class="cmp-brief-link">Policy brief A4 →</NuxtLink>
          </section>
        </div>

        <!-- Mini-mapas -->
        <div class="cmp-maps">
          <div class="map-block">
            <span class="map-label" :style="{ color: COLOR_A }">{{ munA }}</span>
            <CompararMiniMapa :municipio="munA" />
          </div>
          <div class="map-block">
            <span class="map-label" :style="{ color: COLOR_B }">{{ munB }}</span>
            <CompararMiniMapa :municipio="munB" />
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, h } from 'vue'
import CompararRadar from '~/components/comparar/CompararRadar.vue'
import CompararMiniMapa from '~/components/comparar/CompararMiniMapa.vue'
import { slugFor } from '~/utils/briefSlugs'

const COLOR_A = '#1B6B6D'
const COLOR_B = '#a78bfa'

// ── Carga de datos ───────────────────────────────────────────────
// server:false → la carga ocurre en el cliente, donde las rutas relativas
// /data/*.json resuelven contra el origin del navegador. Evita el fallo de
// resolución de URL relativa en SSR (función serverless) que dejaba la página
// en estado de error. Estas vistas son interactivas, no SEO-críticas.
const { data: statsRaw, pending: p1, error: e1 } = await useFetch('/data/atlas_stats_v3.json', { server: false, lazy: true })
const { data: gapRaw,   pending: p2, error: e2 } = await useFetch('/data/gap_analysis.json', { server: false, lazy: true })
const { data: isoRaw,   pending: p3, error: e3 } = await useFetch('/data/isocronas_municipio.json', { server: false, lazy: true })

const pending = computed(() => p1.value || p2.value || p3.value)
const error   = computed(() => e1.value || e2.value || e3.value)

// Ranking ordenado del JSON v3
const ranking = computed(() => statsRaw.value?.ranking_municipios_v3 ?? [])
const nombres = computed(() => ranking.value.map(r => r.municipio))

// Selección por defecto: #1 y #8 del ranking
const munA = ref(null)
const munB = ref(null)
watchEffect(() => {
  if (!munA.value && ranking.value.length) {
    munA.value = ranking.value[0]?.municipio
    munB.value = ranking.value[ranking.value.length - 1]?.municipio
  }
})

function swap() {
  const t = munA.value
  munA.value = munB.value
  munB.value = t
}

// ── Dimensiones para radar/barras ───────────────────────────────
const DIMS = [
  { key: 'score_accesibilidad_v3', gapKey: 'score_accesibilidad', short: 'Acces.',   label: 'Accesibilidad' },
  { key: 'score_ambiental_v3',     gapKey: 'score_ambiental',     short: 'Ambien.',  label: 'Ambiental' },
  { key: 'score_socioeconomico_v3',gapKey: 'score_socioeconomico',short: 'Socioec.', label: 'Socioeconómico' },
  { key: 'score_seguridad',        gapKey: 'score_seguridad',     short: 'Segur.',   label: 'Seguridad' },
]

function pct(v) { return Math.round((v ?? 0) * 100) }

function buildData(nombre) {
  if (!nombre) return null
  const stat = statsRaw.value?.municipios?.[nombre]?.avg ?? {}
  const gap  = gapRaw.value?.[nombre] ?? {}
  const iso  = isoRaw.value?.municipios?.[nombre] ?? {}
  const dims = DIMS.map(d => ({
    key: d.gapKey,
    short: d.short,
    label: d.label,
    value: pct(stat[d.key]),
  }))
  return {
    nombre,
    score: pct(stat.atlas_score_v3),
    nivel: gap.nivel ?? '',
    narrativa: gap.narrativa ?? '',
    dims,
    indicadores: {
      ndvi:   pct(stat.score_ndvi),
      calor:  pct(stat.score_calor),
      lst_c:  stat.lst_c != null ? Math.round(stat.lst_c * 10) / 10 : null,
      min_ips: iso.min_ips ?? null,
      min_cabecera: iso.min_cabecera ?? null,
      min_colegio: iso.min_colegio ?? null,
    },
  }
}

const dataA = computed(() => buildData(munA.value))
const dataB = computed(() => buildData(munB.value))

const rankA = computed(() => nombres.value.indexOf(munA.value) + 1)
const rankB = computed(() => nombres.value.indexOf(munB.value) + 1)

// ── Deltas por dimensión ─────────────────────────────────────────
function colorFor(diff) {
  if (diff > 0) return '#1a9850'   // A mejor → verde
  if (diff < 0) return '#d73027'   // B mejor → rojo
  return '#5F5F5B'
}

const deltas = computed(() => {
  if (!dataA.value || !dataB.value) return []
  return DIMS.map((d, i) => {
    const diff = dataA.value.dims[i].value - dataB.value.dims[i].value
    return { key: d.gapKey, short: d.label, diff, color: colorFor(diff) }
  })
})

const maxGapKey = computed(() => {
  if (!deltas.value.length) return null
  return deltas.value.reduce((a, b) => Math.abs(b.diff) > Math.abs(a.diff) ? b : a).key
})
const maxGapLabel = computed(() =>
  DIMS.find(d => d.gapKey === maxGapKey.value)?.label ?? '—'
)

const deltaTotal = computed(() => {
  const diff = (dataA.value?.score ?? 0) - (dataB.value?.score ?? 0)
  return { diff, color: colorFor(diff) }
})

const leaderName = computed(() => deltaTotal.value.diff >= 0 ? munA.value : munB.value)
const leaderColor = computed(() => deltaTotal.value.diff >= 0 ? COLOR_A : COLOR_B)

// ── Sub-componente tarjeta de municipio (render local) ───────────
const scoreColor = (s) => {
  if (s >= 85) return '#1B6B6D'
  if (s >= 70) return '#1d91c0'
  if (s >= 55) return '#41b6c4'
  if (s >= 40) return '#a8ddb5'
  if (s >= 20) return '#fdae61'
  return '#f46d43'
}

const MunicipioCard = {
  props: { data: Object, side: String, rank: Number },
  setup(props) {
    return () => {
      const d = props.data
      if (!d) return h('div', { class: 'mun-card' })
      const accent = props.side === 'a' ? COLOR_A : COLOR_B
      return h('div', { class: ['mun-card', `mun-card--${props.side}`] }, [
        h('div', { class: 'mun-head' }, [
          h('span', { class: 'mun-rank', style: { borderColor: accent, color: accent } }, `#${props.rank}`),
          h('div', { class: 'mun-name-wrap' }, [
            h('h2', { class: 'mun-name' }, d.nombre),
            d.nivel ? h('span', { class: 'mun-nivel' }, d.nivel) : null,
          ]),
        ]),
        h('div', { class: 'mun-score-wrap' }, [
          h('span', { class: 'mun-score', style: { color: scoreColor(d.score) } }, String(d.score)),
          h('span', { class: 'mun-score-unit' }, '/100'),
        ]),
        h(CompararRadar, { dims: d.dims, color: accent, label: d.nombre }),
        h('div', { class: 'mun-bars' }, d.dims.map(dim =>
          h('div', { class: 'mun-bar-row', key: dim.key }, [
            h('span', { class: 'bar-label' }, dim.label),
            h('div', { class: 'bar-track' }, [
              h('div', { class: 'bar-fill', style: { width: `${dim.value}%`, background: accent } }),
            ]),
            h('span', { class: 'bar-val' }, String(dim.value)),
          ])
        )),
        h('div', { class: 'mun-indic' }, [
          indicItem('NDVI (veg.)', d.indicadores.ndvi, '/100'),
          indicItem('Confort térmico', d.indicadores.calor, '/100'),
          d.indicadores.lst_c != null ? indicItem('Temp. superficie', d.indicadores.lst_c, ' °C') : null,
          d.indicadores.min_ips != null ? indicItem('Min. a IPS', d.indicadores.min_ips, ' min') : null,
          d.indicadores.min_colegio != null ? indicItem('Min. a colegio', d.indicadores.min_colegio, ' min') : null,
          d.indicadores.min_cabecera != null ? indicItem('Min. a cabecera', d.indicadores.min_cabecera, ' min') : null,
        ].filter(Boolean)),
        d.narrativa ? h('p', { class: 'mun-narrativa' }, d.narrativa) : null,
      ])
    }
  },
}

function indicItem(label, value, unit) {
  return h('div', { class: 'indic-item', key: label }, [
    h('span', { class: 'indic-label' }, label),
    h('span', { class: 'indic-value' }, [String(value), h('span', { class: 'indic-unit' }, unit)]),
  ])
}

useHead({ title: 'Comparador de municipios — Atlas Urabá' })
</script>

<style scoped>
.cmp-root {
  min-height: 100vh;
  background: var(--cbg, #F2F1EE);
  color: var(--c1, #1A1A1A);
  font-family: var(--ff-body, sans-serif);
}

/* Header */
.cmp-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 56px;
  padding: 0 18px;
  background: #FFFFFF;
  border-bottom: 1px solid var(--cb, #E5E5E0);
}
.cmp-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--ff-mono, monospace);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ca, #1B6B6D);
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid var(--cb, #E5E5E0);
  transition: background 0.15s;
}
.cmp-back:hover { background: var(--cal, #E8F4F4); }
.cmp-title-wrap { display: flex; flex-direction: column; line-height: 1.1; }
.cmp-title {
  font-family: var(--ff-head, sans-serif);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.3px;
  margin: 0;
}
.cmp-subtitle {
  font-family: var(--ff-mono, monospace);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cm, #5F5F5B);
}
.cmp-badge {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 6px;
  background: var(--cbg, #F2F1EE);
  border: 1px solid var(--cb, #E5E5E0);
  font-family: var(--ff-mono, monospace);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
}
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ca, #1B6B6D); }

/* Main */
.cmp-main {
  max-width: 1240px;
  margin: 0 auto;
  padding: 22px 18px 60px;
}

/* Selectores */
.cmp-selectors {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.sel-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 160px; }
.sel-label {
  font-family: var(--ff-mono, monospace);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cm, #5F5F5B);
}
.sel-a .sel-label { color: var(--ca, #1B6B6D); }
.sel-b .sel-label { color: #a78bfa; }
.sel-input {
  appearance: none;
  -webkit-appearance: none;
  background: #FFFFFF url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5 6 8l3-3.5' stroke='%235F5F5B' stroke-width='1.2' fill='none' stroke-linecap='round'/></svg>") no-repeat right 12px center;
  border: 1px solid var(--cb, #E5E5E0);
  border-radius: 9px;
  padding: 11px 34px 11px 13px;
  font-family: var(--ff-head, sans-serif);
  font-size: 15px;
  font-weight: 600;
  color: var(--c1, #1A1A1A);
  cursor: pointer;
}
.sel-input:focus { outline: 2px solid var(--ca, #1B6B6D); outline-offset: 1px; }
.sel-vs {
  font-family: var(--ff-mono, monospace);
  font-size: 11px;
  color: var(--cm, #5F5F5B);
  padding-bottom: 12px;
  text-transform: uppercase;
}
.sel-swap {
  width: 40px; height: 40px;
  border-radius: 9px;
  border: 1px solid var(--cb, #E5E5E0);
  background: #FFFFFF;
  color: var(--ca, #1B6B6D);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.sel-swap:hover { background: var(--cal, #E8F4F4); }

/* Estados */
.cmp-state {
  padding: 60px 0;
  text-align: center;
  font-family: var(--ff-mono, monospace);
  font-size: 12px;
  color: var(--cm, #5F5F5B);
}
.cmp-state--err { color: #d73027; }

/* Grid */
.cmp-grid {
  display: grid;
  grid-template-columns: 1fr minmax(180px, 0.7fr) 1fr;
  gap: 16px;
  align-items: start;
}

/* Tarjeta municipio */
.cmp-col :deep(.mun-card) {
  background: #FFFFFF;
  border: 1px solid var(--cb, #E5E5E0);
  border-radius: 14px;
  padding: 18px;
}
.cmp-col :deep(.mun-card--a) { border-top: 3px solid #1B6B6D; }
.cmp-col :deep(.mun-card--b) { border-top: 3px solid #a78bfa; }
.cmp-col :deep(.mun-head) { display: flex; align-items: center; gap: 11px; margin-bottom: 14px; }
.cmp-col :deep(.mun-rank) {
  font-family: var(--ff-mono, monospace);
  font-size: 12px;
  font-weight: 700;
  border: 1.5px solid;
  border-radius: 7px;
  padding: 4px 8px;
  flex-shrink: 0;
}
.cmp-col :deep(.mun-name-wrap) { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cmp-col :deep(.mun-name) {
  font-family: var(--ff-head, sans-serif);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.4px;
  margin: 0;
  line-height: 1.1;
}
.cmp-col :deep(.mun-nivel) {
  font-family: var(--ff-mono, monospace);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cm, #5F5F5B);
}
.cmp-col :deep(.mun-score-wrap) { display: flex; align-items: baseline; gap: 4px; margin-bottom: 6px; }
.cmp-col :deep(.mun-score) {
  font-family: var(--ff-head, sans-serif);
  font-size: 56px;
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1;
}
.cmp-col :deep(.mun-score-unit) {
  font-family: var(--ff-mono, monospace);
  font-size: 13px;
  color: var(--cm, #5F5F5B);
}

.cmp-col :deep(.mun-bars) { display: flex; flex-direction: column; gap: 7px; margin: 14px 0 14px; }
.cmp-col :deep(.mun-bar-row) { display: grid; grid-template-columns: 78px 1fr 28px; align-items: center; gap: 8px; }
.cmp-col :deep(.bar-label) {
  font-family: var(--ff-mono, monospace);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--cm, #5F5F5B);
}
.cmp-col :deep(.bar-track) { height: 7px; background: var(--cbg, #F2F1EE); border-radius: 4px; overflow: hidden; }
.cmp-col :deep(.bar-fill) { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.cmp-col :deep(.bar-val) {
  font-family: var(--ff-mono, monospace);
  font-size: 11px;
  font-weight: 600;
  text-align: right;
}

.cmp-col :deep(.mun-indic) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 12px;
  padding: 12px 0;
  border-top: 1px solid var(--cb, #E5E5E0);
}
.cmp-col :deep(.indic-item) { display: flex; flex-direction: column; gap: 2px; }
.cmp-col :deep(.indic-label) {
  font-family: var(--ff-mono, monospace);
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--cm, #5F5F5B);
}
.cmp-col :deep(.indic-value) {
  font-family: var(--ff-head, sans-serif);
  font-size: 17px;
  font-weight: 700;
}
.cmp-col :deep(.indic-unit) {
  font-family: var(--ff-mono, monospace);
  font-size: 10px;
  font-weight: 400;
  color: var(--cm, #5F5F5B);
}
.cmp-col :deep(.mun-narrativa) {
  font-size: 12px;
  line-height: 1.55;
  color: var(--c2, #3D3D3D);
  margin: 4px 0 0;
  border-top: 1px solid var(--cb, #E5E5E0);
  padding-top: 12px;
}

/* Columna DELTA */
.cmp-delta {
  background: #FFFFFF;
  border: 1px solid var(--cb, #E5E5E0);
  border-radius: 14px;
  padding: 18px 16px;
  position: sticky;
  top: 72px;
}
.delta-h {
  font-family: var(--ff-mono, monospace);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
  margin: 0 0 14px;
  text-align: center;
}
.delta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 8px;
  border-radius: 8px;
  margin-bottom: 4px;
}
.delta-row--max { background: var(--cbg, #F2F1EE); }
.delta-dim {
  font-family: var(--ff-mono, monospace);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--c2, #3D3D3D);
}
.delta-val {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--ff-head, sans-serif);
  font-size: 17px;
  font-weight: 700;
}
.delta-eq { font-size: 13px; }
.delta-tag {
  display: block;
  width: 100%;
  margin-top: 4px;
  font-family: var(--ff-mono, monospace);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ca, #1B6B6D);
}
.delta-row--max { flex-wrap: wrap; }
.delta-total {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 11px 8px;
  margin-top: 8px;
  border-top: 1.5px solid var(--cb, #E5E5E0);
}
.delta-total .delta-dim { font-weight: 600; color: var(--c1, #1A1A1A); }
.delta-total .delta-val { font-size: 22px; }
.delta-note {
  font-size: 11px;
  line-height: 1.5;
  color: var(--c2, #3D3D3D);
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--cb, #E5E5E0);
}

/* Mini-mapas */
.cmp-maps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 20px;
}
.map-block { display: flex; flex-direction: column; gap: 8px; }
.map-label {
  font-family: var(--ff-head, sans-serif);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

/* Brief link */
.cmp-brief-link { display: inline-block; margin-top: 10px; font-family: ui-monospace, monospace; font-size: 10px; color: #1B6B6D; text-decoration: none; letter-spacing: 0.06em; }
.cmp-brief-link:hover { text-decoration: underline; }

/* Responsive: apila A sobre B */
@media (max-width: 860px) {
  .cmp-grid {
    grid-template-columns: 1fr;
  }
  .cmp-delta { position: static; order: 3; }
  .cmp-col:first-of-type { order: 1; }
  .cmp-col:last-of-type { order: 2; }
  .cmp-maps { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .cmp-title { font-size: 14px; }
  .cmp-back span, .cmp-back { font-size: 10px; }
  .cmp-badge { display: none; }
  .sel-vs { display: none; }
}
</style>
