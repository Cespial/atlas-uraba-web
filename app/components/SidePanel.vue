<template>
  <aside class="side-panel">

    <!-- ══════════════════════════════════════════
         SUB-TABS — navegación de secciones
    ══════════════════════════════════════════ -->
    <div class="panel-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="ptab"
        :class="{ 'ptab--active': activeTab === tab.id }"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ══════════════════════════════════════════
         CABECERA — identidad y KPI global
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'index'" class="panel-section panel-header">
      <!-- Eyebrow / breadcrumb -->
      <div class="section-label">
        <span class="label-index">01</span>
        <span class="label-dash">—</span>
        <span>Municipio activo</span>
      </div>

      <!-- Nombre municipio -->
      <h2 class="municipio-titulo">{{ store.municipioActivo }}</h2>

      <!-- Score global -->
      <div v-if="regionScore != null" class="score-kpi">
        <span
          class="score-value"
          :style="{ color: scoreColor(regionScore) }"
        >{{ Math.round(regionScore * 100) }}</span>
        <span class="score-unit">/ 100</span>
        <span class="score-badge" :style="scoreBadgeStyle(regionScore)">
          {{ scoreLabel(regionScore) }}
        </span>
      </div>

      <!-- Barra de bienestar -->
      <div v-if="regionScore != null" class="score-track-wrap">
        <div class="score-track">
          <div
            class="score-fill"
            :style="{
              width: Math.round(regionScore * 100) + '%',
              background: scoreColor(regionScore),
            }"
          />
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         DIMENSIONES — selector de capa temática
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'index'" class="panel-section">
      <div class="section-label">
        <span class="label-index">02</span>
        <span class="label-dash">—</span>
        <span>Dimensión</span>
      </div>

      <div class="dim-list">
        <button
          v-for="dim in dimensiones"
          :key="dim.key"
          class="dim-btn"
          :class="{ 'dim-btn--active': store.dimension === dim.key }"
          @click="store.setDimension(dim.key)"
        >
          <!-- Dot de color -->
          <span class="dim-dot" :style="{ background: dim.color }" />

          <!-- Label -->
          <span class="dim-label">{{ dim.label }}</span>

          <!-- Score de la dimensión para el municipio activo -->
          <span
            v-if="dimScore(dim.key) != null"
            class="dim-score"
            :style="{ color: dim.color }"
          >{{ dimScore(dim.key) }}</span>

          <!-- Indicador activo -->
          <span v-if="store.dimension === dim.key" class="dim-active-pip" />
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         MUNICIPIOS — selector de ámbito espacial
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'index'" class="panel-section">
      <div class="section-label">
        <span class="label-index">03</span>
        <span class="label-dash">—</span>
        <span>Municipio</span>
      </div>

      <div class="mun-list">
        <button
          v-for="mun in municipios"
          :key="mun.nombre"
          class="mun-btn"
          :class="{ 'mun-btn--active': store.municipioActivo === mun.nombre }"
          @click="store.setMunicipio(mun.nombre)"
        >
          <span class="mun-nombre">{{ mun.nombre }}</span>
          <span
            v-if="munScore(mun.nombre) != null"
            class="mun-score"
            :style="{ color: scoreColor(munScore(mun.nombre) / 100) }"
          >{{ munScore(mun.nombre) }}</span>
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         DISTRIBUCIÓN — histograma por rangos
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'index'" class="panel-section">
      <div class="section-label">
        <span class="label-index">04</span>
        <span class="label-dash">—</span>
        <span>Distribución</span>
      </div>
      <HistogramPanel />
    </div>

    <!-- ══════════════════════════════════════════
         RANKING — posición relativa municipios
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'ranking'" class="panel-section">
      <div class="section-label">
        <span class="label-index">05</span>
        <span class="label-dash">—</span>
        <span>Rankings</span>
      </div>
      <ScoreRankingList />
    </div>

    <!-- ══════════════════════════════════════════
         LEYENDA — escala Jenks + zonas LISA
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'zonas'" class="panel-section">
      <div class="section-label">
        <span class="label-index">06</span>
        <span class="label-dash">—</span>
        <span>Zonas LISA</span>
      </div>

      <!-- Grid de zonas -->
      <div class="lisa-grid">
        <div
          v-for="z in zonas"
          :key="z.key"
          class="lisa-item"
        >
          <span class="lisa-dot" :style="{ background: z.color }" />
          <span class="lisa-label">{{ z.label }}</span>
        </div>
      </div>

      <!-- Gradiente Jenks -->
      <div class="jenks-wrap">
        <div class="jenks-bar" />
        <div class="jenks-labels">
          <span>0 · Crítico</span>
          <span>100 · Excelente</span>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         PANORAMA — panel de resumen territorial
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'panorama'" class="tab-content">
      <PanoramaPanel />
    </div>

    <!-- ══════════════════════════════════════════
         FUENTES — colofón de datos
    ══════════════════════════════════════════ -->
    <div v-show="activeTab === 'fuentes'" class="panel-footer">
      <div class="fuentes-text">
        CNPV 2018 DANE · REPS MinSalud<br />
        SIMAT MEN · OSM Colombia<br />
        MGN DANE 2024 · Tensor 2025
      </div>
    </div>

  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAtlasStore, DIMENSIONES, MUNICIPIOS } from '~/stores/atlas'

const store      = useAtlasStore()
const dimensiones = DIMENSIONES
const municipios  = MUNICIPIOS

const activeTab = ref('index')
const tabs = [
  { id: 'index',    label: 'Índice'    },
  { id: 'zonas',    label: 'Capas'     },
  { id: 'ranking',  label: 'Ranking'   },
  { id: 'panorama', label: 'Panorama'  },
  { id: 'fuentes',  label: 'Fuentes'   },
]

/* ─── Zonas LISA ─────────────────────────────────────── */
const zonas = [
  { key: 'HH', color: '#1a9641', label: 'HH · Próspero' },
  { key: 'LL', color: '#d7191c', label: 'LL · Crítico'   },
  { key: 'HL', color: '#f39c12', label: 'HL · Isla alta' },
  { key: 'LH', color: '#3498db', label: 'LH · Rezago'    },
  { key: 'NS', color: '#555555', label: 'NS · No sig.'   },
]

/* ─── Score regional ─────────────────────────────────── */
const regionScore = computed(() => {
  const m = store.municipioActivo
  if (m === 'Todos') {
    const all = Object.values(store.stats)
    if (!all.length) return null
    const total = all.reduce((s, v) => s + v.count, 0)
    return all.reduce((s, v) => s + (v.avg?.atlas_score ?? 0) * v.count, 0) / total
  }
  return store.stats[m]?.avg?.atlas_score ?? null
})

/* ─── Colores escala Jenks ───────────────────────────── */
function scoreColor(v) {
  const n = +v
  if (n >= 0.85) return 'var(--score-6)'   /* #1a9850 Excelente  */
  if (n >= 0.70) return 'var(--score-5)'   /* #66bd63 Alto       */
  if (n >= 0.55) return 'var(--score-4)'   /* #a6d96a Medio-alto */
  if (n >= 0.40) return 'var(--score-3)'   /* #fdae61 Medio-bajo */
  if (n >= 0.20) return 'var(--score-2)'   /* #f46d43 Bajo       */
  return 'var(--score-1)'                  /* #d73027 Crítico    */
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
    border: `1px solid ${color}33`,
    background: `${color}14`,
  }
}

/* ─── Score por municipio ────────────────────────────── */
function munScore(nombre) {
  if (nombre === 'Todos') return null
  const s = store.stats[nombre]
  if (!s?.avg?.atlas_score) return null
  return Math.round(s.avg.atlas_score * 100)
}

/* ─── Score por dimensión ────────────────────────────── */
function dimScore(key) {
  const m = store.municipioActivo
  if (m === 'Todos') {
    const all = Object.values(store.stats)
    if (!all.length) return null
    const total = all.reduce((s, v) => s + v.count, 0)
    const val   = all.reduce((s, v) => s + (v.avg?.[key] ?? 0) * v.count, 0) / total
    return Math.round(val * 100)
  }
  const s = store.stats[m]
  if (!s?.avg) return null
  return Math.round((s.avg[key] ?? 0) * 100)
}
</script>

<style scoped>
/* ═════════════════════════════════════════════════════════
   SIDE PANEL — Tensor Design System
   Paleta dark institucional: --dk-* sobre fondo --dk-panel
   Acento: --ca (#1B6B6D) solo como toque, nunca dominante
   Tipografía: Space Grotesk (head) · Inter (body) · JetBrains Mono (mono)
═════════════════════════════════════════════════════════ */

/* ─── Sub-tabs de navegación ─────────────────────────── */
.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--cb, #E5E5E0);
  background: #fff;
  flex-shrink: 0;
}

.ptab {
  flex: 1;
  padding: 8px 4px;
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: .1em;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--cm, #5F5F5B);
  border-bottom: 2px solid transparent;
  transition: all .15s;
}

.ptab--active {
  color: var(--ca, #1B6B6D);
  border-bottom-color: var(--ca, #1B6B6D);
}

/* ─── Contenedor principal ───────────────────────────── */
.side-panel {
  position: absolute;
  left: 0;
  top: var(--atlas-header-h, 52px);
  bottom: 28px;                        /* altura del AppFooter */
  width: var(--atlas-panel-w, 320px);
  z-index: 10;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;

  background: var(--white, #FFFFFF);
  border-right: 1px solid var(--cb, #E5E5E0);

  /* grid sutil PMO-Milagros */
  background-image:
    linear-gradient(rgba(0,0,0,0.016) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.016) 1px, transparent 1px);
  background-size: 40px 40px;

  /* scroll suave */
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--cb) transparent;
}

.side-panel::-webkit-scrollbar { width: 4px; }
.side-panel::-webkit-scrollbar-track { background: transparent; }
.side-panel::-webkit-scrollbar-thumb {
  background: var(--cbs, #D0D0CB);
  border-radius: 2px;
}

/* ─── Sección genérica ───────────────────────────────── */
.panel-section {
  padding: 16px;
  border-bottom: 1px solid var(--cb, #E5E5E0);
  flex-shrink: 0;
}

/* ─── Tab content genérico (panorama, etc.) ──────────── */
.tab-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* ─── Label de sección (eyebrow) ─────────────────────── */
.section-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ca);         /* teal solo como acento */
  margin-bottom: 10px;
  line-height: 1;
}

.label-index {
  color: var(--ca);
  opacity: 0.7;
}

.label-dash {
  color: var(--cb, #E5E5E0);
  margin: 0 1px;
}

/* ══════════════════════════════════════════
   01 — CABECERA / KPI
══════════════════════════════════════════ */
.panel-header {
  background:
    linear-gradient(
      180deg,
      rgba(27, 107, 109, 0.06) 0%,
      transparent 100%
    );
}

/* Nombre del municipio */
.municipio-titulo {
  font-family: var(--ff-head);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.36px;
  color: var(--c1, #1A1A1A);
  margin: 0 0 8px 0;
  line-height: 1.2;
}

/* KPI numérico grande */
.score-kpi {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 8px;
}

.score-value {
  font-family: var(--ff-head);
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.72px;
  line-height: 1;
  transition: color 0.4s ease;
}

.score-unit {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--cm, #5F5F5B);
  margin-bottom: 2px;
}

.score-badge {
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 3px;
  transition: all 0.4s ease;
  margin-left: auto;
}

/* Barra de progreso del score */
.score-track-wrap {
  margin-top: 4px;
}

.score-track {
  width: 100%;
  height: 3px;
  background: var(--cb, #E5E5E0);
  border-radius: 2px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease;
}

/* ══════════════════════════════════════════
   02 — DIMENSIONES
══════════════════════════════════════════ */
.dim-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dim-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  position: relative;
  width: 100%;
}

.dim-btn:hover {
  background: rgba(0,0,0,0.04);
  border-color: var(--cb, #E5E5E0);
}

.dim-btn--active {
  background: rgba(0,0,0,0.06);
  border-color: var(--cb, #E5E5E0);
}

.dim-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.dim-btn--active .dim-dot {
  transform: scale(1.3);
  box-shadow: 0 0 6px currentColor;
}

.dim-label {
  font-family: var(--ff-mono);
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cm, #5F5F5B);
  flex: 1;
  transition: color 0.15s ease;
}

.dim-btn:hover .dim-label,
.dim-btn--active .dim-label {
  color: var(--c1, #1A1A1A);
}

.dim-score {
  font-family: var(--ff-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.05em;
  transition: color 0.3s ease;
}

.dim-active-pip {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--ca);
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

/* ══════════════════════════════════════════
   03 — MUNICIPIOS
══════════════════════════════════════════ */
.mun-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.mun-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  width: 100%;
}

.mun-btn:hover {
  background: rgba(0,0,0,0.04);
}

.mun-btn--active {
  background: rgba(27, 107, 109, 0.12);
  border-color: rgba(27, 107, 109, 0.3);
}

.mun-nombre {
  font-family: var(--ff-body);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--cm, #5F5F5B);
  transition: color 0.15s ease;
}

.mun-btn:hover .mun-nombre {
  color: var(--c1, #1A1A1A);
}

.mun-btn--active .mun-nombre {
  color: var(--ca);
  font-weight: 500;
}

.mun-score {
  font-family: var(--ff-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.05em;
  flex-shrink: 0;
  transition: color 0.3s ease;
}

/* ══════════════════════════════════════════
   06 — LEYENDA LISA + JENKS
══════════════════════════════════════════ */
.lisa-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  margin-bottom: 14px;
}

.lisa-item {
  display: flex;
  align-items: center;
  gap: 7px;
}

.lisa-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.lisa-label {
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.05em;
  color: var(--cm, #5F5F5B);
  white-space: nowrap;
}

/* Gradiente de bienestar */
.jenks-wrap {
  padding-top: 12px;
  border-top: 1px solid var(--cb, #E5E5E0);
}

.jenks-bar {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    #d73027,    /* score-1  Crítico    */
    #f46d43,    /* score-2  Bajo       */
    #fdae61,    /* score-3  Medio-bajo */
    #a6d96a,    /* score-4  Medio-alto */
    #66bd63,    /* score-5  Alto       */
    #1a9850     /* score-6  Excelente  */
  );
  margin-bottom: 5px;
}

.jenks-labels {
  display: flex;
  justify-content: space-between;
  font-family: var(--ff-mono);
  font-size: 7px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cm, #5F5F5B);
}

/* ══════════════════════════════════════════
   FOOTER — fuentes
══════════════════════════════════════════ */
.panel-footer {
  margin-top: auto;
  padding: 12px 16px;
  border-top: 1px solid var(--cb, #E5E5E0);
  flex-shrink: 0;
}

.fuentes-text {
  font-family: var(--ff-mono);
  font-size: 7px;
  font-weight: 400;
  letter-spacing: 0.1em;
  line-height: 1.8;
  color: var(--cm, #5F5F5B);
  opacity: 0.7;
}
</style>
