<template>
  <div class="panorama-panel">

    <!-- ══════════════════════════════════════════
         ESTADO: sin municipio seleccionado
    ══════════════════════════════════════════ -->
    <div v-if="store.municipioActivo === 'Todos'" class="pano-empty">
      <div class="pano-empty-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 2"/>
          <path d="M16 8 L16 17 M16 20 L16 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="pano-empty-title">Selecciona un municipio</p>
      <p class="pano-empty-sub">
        Haz clic en un municipio del mapa o usa el selector<br>
        para ver su panorama comparativo vs Urabá.
      </p>
      <!-- Mini ranking orientativo -->
      <div v-if="Object.keys(store.stats).length" class="pano-empty-ranking">
        <div class="pano-empty-ranking-label">Ranking regional · Atlas Score</div>
        <div
          v-for="(row, i) in rankingRegion"
          :key="row.nombre"
          class="pano-empty-ranking-row"
          @click="store.setMunicipio(row.nombre)"
        >
          <span class="per-rank">{{ i + 1 }}</span>
          <span class="per-name">{{ row.short }}</span>
          <div class="per-track">
            <div class="per-fill" :style="{ width: row.pct + '%', background: scoreColor(row.score) }" />
          </div>
          <span class="per-val" :style="{ color: scoreColor(row.score) }">{{ row.val }}</span>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         PANORAMA MUNICIPIO
    ══════════════════════════════════════════ -->
    <template v-else>

      <!-- Header: municipio vs región + score -->
      <div class="pano-header">
        <div class="pano-title-block">
          <div class="pano-mun-label">{{ store.municipioActivo }}</div>
          <div class="pano-meta">
            <span class="pano-vs-badge">vs Urabá</span>
            <span v-if="munCount != null" class="pano-manzanas">
              {{ munCount.toLocaleString('es-CO') }} manzanas
            </span>
          </div>
        </div>
        <div class="pano-score-block">
          <span class="pano-score-num" :style="{ color: scoreColor(munScore) }">
            {{ munScore != null ? Math.round(munScore * 100) : '—' }}
          </span>
          <div class="pano-score-sub">
            <span class="pano-score-unit">/100</span>
            <span class="pano-score-badge" :style="scoreBadgeStyle(munScore)">{{ scoreLabel(munScore) }}</span>
          </div>
        </div>
      </div>

      <!-- Barra de score global -->
      <div v-if="munScore != null" class="pano-global-track-wrap">
        <div class="pano-global-track">
          <div
            class="pano-global-fill"
            :style="{ width: Math.round(munScore * 100) + '%', background: scoreColor(munScore) }"
          />
          <!-- Marcador región -->
          <div
            v-if="regionScore != null"
            class="pano-region-marker"
            :style="{ left: Math.round(regionScore * 100) + '%' }"
            :title="`Promedio Urabá: ${Math.round(regionScore * 100)}`"
          />
        </div>
        <div class="pano-global-labels">
          <span>0</span>
          <span v-if="regionScore != null" class="pano-region-label-inline">
            Urabá {{ Math.round(regionScore * 100) }}
          </span>
          <span>100</span>
        </div>
      </div>

      <!-- ── Radar CSS puro: barras por dimensión ─────── -->
      <div class="pano-dims-section">
        <div class="pano-dims-eyebrow">
          <span>Dimensión</span>
          <span>Municipio</span>
          <span>Urabá</span>
          <span>Delta</span>
        </div>

        <div
          v-for="dim in dimensiones"
          :key="dim.key"
          class="pano-dim-row"
        >
          <!-- Nombre -->
          <div class="pdr-name">
            <span class="pdr-dot" :style="{ background: dim.color }" />
            <span class="pdr-label">{{ dim.label }}</span>
          </div>

          <!-- Barras superpuestas -->
          <div class="pdr-bars-wrap">
            <!-- Track de la región (fondo gris con marcador) -->
            <div class="pdr-track">
              <!-- Barra municipio -->
              <div
                class="pdr-bar-mun"
                :style="{
                  width: Math.round((munStats?.avg?.[dim.key] ?? 0) * 100) + '%',
                  background: dim.color,
                  opacity: munStats?.avg?.[dim.key] != null ? 1 : 0.3,
                }"
              />
              <!-- Marcador región -->
              <div
                v-if="regionStats?.[dim.key] != null"
                class="pdr-region-tick"
                :style="{ left: Math.round(regionStats[dim.key] * 100) + '%' }"
              />
            </div>
          </div>

          <!-- Valores -->
          <div class="pdr-vals">
            <span class="pdr-val-mun" :style="{ color: dim.color }">
              {{ munStats?.avg?.[dim.key] != null ? Math.round(munStats.avg[dim.key] * 100) : '—' }}
            </span>
            <span class="pdr-val-sep">/</span>
            <span class="pdr-val-reg">
              {{ regionStats?.[dim.key] != null ? Math.round(regionStats[dim.key] * 100) : '—' }}
            </span>
          </div>

          <!-- Delta -->
          <div
            class="pdr-delta"
            :class="delta(dim.key) >= 0 ? 'pdr-delta--pos' : 'pdr-delta--neg'"
          >
            {{ delta(dim.key) >= 0 ? '+' : '' }}{{ delta(dim.key) }}
          </div>
        </div>
      </div>

      <!-- ── Ranking comparativo: todos los municipios ── -->
      <div v-if="Object.keys(store.stats).length" class="pano-ranking-section">
        <div class="pano-ranking-eyebrow">Ranking regional · {{ store.dimension === 'atlas_score' ? 'Índice Atlas' : dimensionActualLabel }}</div>

        <div
          v-for="(row, i) in rankingDimension"
          :key="row.nombre"
          class="prk-row"
          :class="{ 'prk-row--active': row.nombre === store.municipioActivo }"
          @click="store.setMunicipio(row.nombre)"
        >
          <span class="prk-pos">{{ i + 1 }}</span>
          <div class="prk-info">
            <span class="prk-name">{{ row.short }}</span>
            <span class="prk-manzanas">{{ row.count.toLocaleString('es-CO') }} mzn</span>
          </div>
          <div class="prk-track">
            <div class="prk-fill" :style="{ width: row.pct + '%', background: scoreColor(row.score) }" />
            <!-- Marca promedio región -->
            <div
              v-if="regionDimScore != null"
              class="prk-region-tick"
              :style="{ left: Math.round(regionDimScore * 100) + '%' }"
            />
          </div>
          <span class="prk-val" :style="{ color: scoreColor(row.score) }">{{ row.val }}</span>
          <span
            class="prk-delta"
            :class="row.deltaNum >= 0 ? 'prk-delta--pos' : 'prk-delta--neg'"
          >{{ row.deltaNum >= 0 ? '+' : '' }}{{ row.deltaNum }}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="pano-footer">
        Score 0–100 · Fuentes: CNPV 2018, REPS, SIMAT, OSM · Tensor 2025
      </div>

    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore, DIMENSIONES, MUNICIPIOS } from '~/stores/atlas'

const store = useAtlasStore()

// Dimensiones sin el score global (se usa para las barras individuales)
const dimensiones = DIMENSIONES.filter(d => d.key !== 'atlas_score')

// Label de la dimensión activa
const dimensionActualLabel = computed(() =>
  DIMENSIONES.find(d => d.key === store.dimension)?.label ?? store.dimension
)

// ── Stats del municipio activo ─────────────────────────
const munStats = computed(() => {
  const m = store.municipioActivo
  return m !== 'Todos' ? (store.stats[m] ?? null) : null
})

// Conteo de manzanas del municipio activo
const munCount = computed(() => munStats.value?.count ?? null)

// Score atlas del municipio activo (0-1)
const munScore = computed(() => munStats.value?.avg?.atlas_score ?? null)

// ── Stats promedio ponderado de la región ─────────────
const regionStats = computed(() => {
  const all = Object.values(store.stats)
  if (!all.length) return null
  const total = all.reduce((s, v) => s + (v.count ?? 0), 0) || 1
  const avg = {}
  dimensiones.forEach(d => {
    avg[d.key] = all.reduce((s, v) => s + (v.avg?.[d.key] ?? 0) * (v.count ?? 0), 0) / total
  })
  return avg
})

// Score atlas de la región (0-1)
const regionScore = computed(() => {
  const all = Object.values(store.stats)
  if (!all.length) return null
  const total = all.reduce((s, v) => s + (v.count ?? 0), 0) || 1
  return all.reduce((s, v) => s + (v.avg?.atlas_score ?? 0) * (v.count ?? 0), 0) / total
})

// Score de la dimensión activa a nivel región (0-1)
const regionDimScore = computed(() => {
  const dim = store.dimension
  if (dim === 'atlas_score') return regionScore.value
  const all = Object.values(store.stats)
  if (!all.length) return null
  const total = all.reduce((s, v) => s + (v.count ?? 0), 0) || 1
  return all.reduce((s, v) => s + (v.avg?.[dim] ?? 0) * (v.count ?? 0), 0) / total
})

// ── Ranking ordenado por Atlas Score (para el empty state) ──
const rankingRegion = computed(() =>
  Object.entries(store.stats)
    .map(([nombre, s]) => ({
      nombre,
      short: shortName(nombre),
      score: s.avg?.atlas_score ?? 0,
      val: Math.round((s.avg?.atlas_score ?? 0) * 100),
      pct: Math.round((s.avg?.atlas_score ?? 0) * 100),
    }))
    .sort((a, b) => b.score - a.score)
)

// ── Ranking por dimensión activa (con delta vs región) ──
const rankingDimension = computed(() => {
  const dim = store.dimension
  const rScore = regionDimScore.value ?? 0
  return Object.entries(store.stats)
    .map(([nombre, s]) => {
      const score = s.avg?.[dim] ?? 0
      return {
        nombre,
        short: shortName(nombre),
        score,
        val: Math.round(score * 100),
        pct: Math.round(score * 100),
        count: s.count ?? 0,
        deltaNum: Math.round((score - rScore) * 100),
      }
    })
    .sort((a, b) => b.score - a.score)
})

// ── Helpers ───────────────────────────────────────────
function shortName(nombre) {
  return nombre
    .replace('San Pedro de Urabá', 'S.Pedro')
    .replace('San Juan de Urabá', 'S.Juan')
    .replace('Arboletes', 'Arbolt.')
    .replace('Necoclí', 'Necoclí')
    .replace('Chigorodó', 'Chigrd.')
    .replace('Apartadó', 'Aptdo.')
}

function delta(key) {
  const m = munStats.value?.avg?.[key] ?? null
  const r = regionStats.value?.[key] ?? null
  if (m == null || r == null) return 0
  return Math.round((m - r) * 100)
}

function scoreColor(v) {
  const n = +(v ?? 0)
  if (n >= 0.85) return '#1B6B6D'
  if (n >= 0.70) return '#1d91c0'
  if (n >= 0.55) return '#41b6c4'
  if (n >= 0.40) return '#a8ddb5'
  if (n >= 0.20) return '#fdae61'
  return '#f46d43'
}

function scoreLabel(v) {
  const n = +(v ?? 0)
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
    border: `1px solid ${color}33`,
    background: `${color}14`,
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   PANORAMA PANEL — PanoramaPanel.vue
   CSS-only, sin Chart.js, compatible con SSG
═══════════════════════════════════════════════ */

.panorama-panel { padding: 0 0 12px; }

/* ── Empty state ──────────────────────────────────── */
.pano-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 20px 16px;
  text-align: center;
  gap: 8px;
}

.pano-empty-icon {
  color: var(--cm, #5F5F5B);
  opacity: 0.4;
  margin-bottom: 4px;
}

.pano-empty-title {
  font-family: var(--ff-head);
  font-size: 14px;
  font-weight: 600;
  color: var(--c1, #1A1A1A);
  margin: 0;
}

.pano-empty-sub {
  font-family: var(--ff-body);
  font-size: 11px;
  color: var(--cm, #5F5F5B);
  line-height: 1.6;
  margin: 0;
}

/* Mini ranking en empty state */
.pano-empty-ranking {
  width: 100%;
  margin-top: 16px;
  border-top: 1px solid var(--cb, #E5E5E0);
  padding-top: 12px;
}

.pano-empty-ranking-label {
  font-family: var(--ff-mono);
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--cm, #5F5F5B);
  margin-bottom: 10px;
  text-align: left;
}

.pano-empty-ranking-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.12s;
}
.pano-empty-ranking-row:hover { background: rgba(0,0,0,0.03); }

.per-rank {
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  width: 14px;
  text-align: right;
  flex-shrink: 0;
}

.per-name {
  font-family: var(--ff-mono);
  font-size: 9px;
  color: var(--c1, #1A1A1A);
  width: 52px;
  flex-shrink: 0;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.per-track {
  flex: 1;
  height: 3px;
  background: var(--cb, #E5E5E0);
  border-radius: 2px;
  overflow: hidden;
}

.per-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.per-val {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  width: 22px;
  text-align: right;
  flex-shrink: 0;
}

/* ── Header municipio ─────────────────────────────── */
.pano-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--cb, #E5E5E0);
}

.pano-title-block { flex: 1; min-width: 0; }

.pano-mun-label {
  font-family: var(--ff-head);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--c1, #1A1A1A);
  line-height: 1.2;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pano-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pano-vs-badge {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cm, #5F5F5B);
  background: var(--cbg, #F2F1EE);
  border: 1px solid var(--cb, #E5E5E0);
  padding: 1px 5px;
  border-radius: 3px;
}

.pano-manzanas {
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  letter-spacing: 0.05em;
}

.pano-score-block {
  text-align: right;
  flex-shrink: 0;
  margin-left: 10px;
}

.pano-score-num {
  font-family: var(--ff-head);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.6px;
  line-height: 1;
  display: block;
}

.pano-score-sub {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 3px;
}

.pano-score-unit {
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.pano-score-badge {
  font-family: var(--ff-mono);
  font-size: 7px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 3px;
}

/* ── Barra de score global ────────────────────────── */
.pano-global-track-wrap {
  padding: 10px 16px 8px;
  border-bottom: 1px solid var(--cb, #E5E5E0);
}

.pano-global-track {
  position: relative;
  width: 100%;
  height: 6px;
  background: var(--cb, #E5E5E0);
  border-radius: 3px;
  overflow: visible;
}

.pano-global-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease, background 0.4s ease;
}

.pano-region-marker {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 12px;
  background: var(--c1, #1A1A1A);
  border-radius: 1px;
  transform: translateX(-50%);
  opacity: 0.35;
}

.pano-global-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-family: var(--ff-mono);
  font-size: 7px;
  color: var(--cm, #5F5F5B);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.pano-region-label-inline {
  opacity: 0.6;
  font-size: 7px;
}

/* ── Sección de dimensiones ───────────────────────── */
.pano-dims-section {
  padding: 10px 16px 8px;
  border-bottom: 1px solid var(--cb, #E5E5E0);
}

.pano-dims-eyebrow {
  display: grid;
  grid-template-columns: 90px 1fr 52px 28px;
  gap: 4px;
  font-family: var(--ff-mono);
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cm, #5F5F5B);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--cb, #E5E5E0);
  margin-bottom: 6px;
}

.pano-dim-row {
  display: grid;
  grid-template-columns: 90px 1fr 52px 28px;
  gap: 4px;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.pano-dim-row:last-child { border-bottom: none; }

.pdr-name {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.pdr-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pdr-label {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cm, #5F5F5B);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Track con barra municipio + tick región */
.pdr-bars-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.pdr-track {
  position: relative;
  width: 100%;
  height: 5px;
  background: var(--cb, #E5E5E0);
  border-radius: 3px;
  overflow: visible;
}

.pdr-bar-mun {
  height: 100%;
  border-radius: 3px;
  transition: width 0.55s ease, opacity 0.3s;
}

.pdr-region-tick {
  position: absolute;
  top: -2px;
  width: 1.5px;
  height: 9px;
  background: rgba(0,0,0,0.4);
  border-radius: 1px;
  transform: translateX(-50%);
}

/* Valores numéricos */
.pdr-vals {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-family: var(--ff-mono);
  font-size: 8px;
  justify-content: flex-end;
}

.pdr-val-mun {
  font-size: 9px;
  font-weight: 600;
}

.pdr-val-sep {
  color: var(--cb, #E5E5E0);
  font-size: 7px;
}

.pdr-val-reg {
  font-size: 8px;
  color: var(--cm, #5F5F5B);
}

/* Delta */
.pdr-delta {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  text-align: right;
}

.pdr-delta--pos { color: #1B6B6D; }
.pdr-delta--neg { color: #d73027; }

/* ── Ranking de municipios ────────────────────────── */
.pano-ranking-section {
  padding: 10px 16px 8px;
  border-bottom: 1px solid var(--cb, #E5E5E0);
}

.pano-ranking-eyebrow {
  font-family: var(--ff-mono);
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--cm, #5F5F5B);
  margin-bottom: 8px;
}

.prk-row {
  display: grid;
  grid-template-columns: 16px 64px 1fr 22px 26px;
  gap: 5px;
  align-items: center;
  padding: 4px 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.12s;
  border: 1px solid transparent;
}

.prk-row:hover {
  background: rgba(0,0,0,0.03);
}

.prk-row--active {
  background: rgba(27, 107, 109, 0.07);
  border-color: rgba(27, 107, 109, 0.2);
}

.prk-pos {
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  text-align: right;
}

.prk-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.prk-name {
  font-family: var(--ff-mono);
  font-size: 9px;
  color: var(--c1, #1A1A1A);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prk-row--active .prk-name {
  color: var(--ca, #1B6B6D);
  font-weight: 600;
}

.prk-manzanas {
  font-family: var(--ff-mono);
  font-size: 7px;
  color: var(--cm, #5F5F5B);
  opacity: 0.7;
}

.prk-track {
  position: relative;
  height: 4px;
  background: var(--cb, #E5E5E0);
  border-radius: 2px;
  overflow: visible;
}

.prk-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.prk-region-tick {
  position: absolute;
  top: -2px;
  width: 1.5px;
  height: 8px;
  background: rgba(0,0,0,0.35);
  border-radius: 1px;
  transform: translateX(-50%);
}

.prk-val {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  text-align: right;
}

.prk-delta {
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 600;
  text-align: right;
}
.prk-delta--pos { color: #1B6B6D; }
.prk-delta--neg { color: #d73027; }

/* ── Footer ──────────────────────────────────────── */
.pano-footer {
  padding: 8px 16px 0;
  font-family: var(--ff-mono);
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
  opacity: 0.7;
  border-top: 1px solid var(--cb, #E5E5E0);
  margin-top: 4px;
}
</style>
