<template>
  <div
    class="mobile-sheet"
    :class="{ 'sheet-open': isOpen }"
    ref="sheetEl"
  >
    <!-- ── Zona de arrastre (handle + peek) ─────────────────── -->
    <div
      class="sheet-drag-zone"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
      @click="handleDragZoneClick"
    >
      <div class="sheet-handle" />

      <!-- Peek: resumen siempre visible -->
      <div class="peek-bar">
        <!-- Izquierda: info principal -->
        <div class="peek-main">
          <span class="peek-context">
            {{ manzanaSeleccionada ? manzanaMunicipio : store.municipioActivo }}
          </span>
          <div class="peek-score-row">
            <span class="peek-score-num" :style="{ color: activeScoreColor }">
              {{ activeScoreDisplay }}
            </span>
            <span class="peek-score-unit">/ 100</span>
            <span v-if="manzanaSeleccionada" class="peek-manzana-badge">manzana</span>
            <span v-else class="peek-score-badge" :style="badgeStyle">{{ scoreLabel(activeScore) }}</span>
          </div>
        </div>

        <!-- Derecha: dimensión + chevron -->
        <div class="peek-right">
          <div class="peek-dim">
            <span class="peek-dim-dot" :style="{ background: store.dimensionActual?.color }" />
            <span class="peek-dim-label">{{ store.dimensionActual?.label?.split(' ')[0] }}</span>
          </div>
          <div class="peek-controls">
            <button v-if="capasActivasCount > 0" class="peek-layers-badge" @click.stop="openTab('capas')">
              {{ capasActivasCount }} capa{{ capasActivasCount !== 1 ? 's' : '' }}
            </button>
            <button class="peek-chevron" @click.stop="toggle">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path :d="isOpen ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Progress bar del score -->
      <div class="peek-progress">
        <div class="peek-progress-fill" :style="{ width: activeScorePercent + '%', background: activeScoreColor }" />
      </div>
    </div>

    <!-- ── Contenido expandido ───────────────────────────────── -->
    <div v-show="isOpen" class="sheet-body">

      <!-- Tab bar -->
      <div class="tab-bar">
        <button
          v-for="tab in visibleTabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <!-- Con 5 tabs usar shortLabel, con 4 usar label normal -->
          <span class="tab-label">{{ visibleTabs.length >= 5 ? tab.shortLabel : tab.label }}</span>
          <span v-if="tab.id === 'capas' && capasActivasCount > 0" class="tab-badge">{{ capasActivasCount }}</span>
        </button>
      </div>

      <!-- ── Tab: ÍNDICE ──────────────────────────────────────── -->
      <div v-if="activeTab === 'indice'" class="tab-content" key="indice">

        <!-- Herramientas (Comparar / Simulador) — equivalente móvil del nav del header -->
        <div class="section-label">Herramientas</div>
        <div class="tools-row">
          <NuxtLink to="/comparar" class="tool-link">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M5 2v12M11 2v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M2 5h6M8 11h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Comparar
          </NuxtLink>
          <NuxtLink to="/simulador" class="tool-link">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M13 3l-1.4 1.4M4.4 11.6L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Simulador
          </NuxtLink>
        </div>

        <!-- Dimensiones -->
        <div class="section-label" style="margin-top: 18px">Dimensión del atlas</div>
        <div class="dim-pills">
          <button
            v-for="dim in dimensiones"
            :key="dim.key"
            class="dim-pill"
            :class="{ 'dim-pill--active': store.dimension === dim.key }"
            :style="store.dimension === dim.key ? { borderColor: dim.color, color: dim.color, background: dim.color + '14' } : {}"
            @click="store.setDimension(dim.key)"
          >
            <span class="dim-dot" :style="{ background: dim.color }" />
            {{ dim.label.split(' ')[0] }}
            <span v-if="dimScore(dim.key) != null" class="dim-score" :style="store.dimension === dim.key ? { color: dim.color } : {}">
              {{ dimScore(dim.key) }}
            </span>
          </button>
        </div>

        <!-- Municipios -->
        <div class="section-label" style="margin-top: 18px">Municipio</div>
        <div class="mun-grid">
          <button
            v-for="mun in municipios"
            :key="mun.nombre"
            class="mun-chip"
            :class="{ 'mun-chip--active': store.municipioActivo === mun.nombre }"
            @click="store.setMunicipio(mun.nombre); if(isOpen) toggle()"
          >
            <span class="mun-name">{{ mun.nombre === 'Todos' ? 'Todos' : mun.nombre.split(' de')[0] }}</span>
            <span
              v-if="munScore(mun.nombre) != null"
              class="mun-score"
              :style="{ color: scoreColor(munScore(mun.nombre)/100) }"
            >{{ munScore(mun.nombre) }}</span>
          </button>
        </div>

        <!-- Escala de colores -->
        <div class="section-label" style="margin-top: 18px">Escala</div>
        <div class="legend-grad" />
        <div class="legend-labels">
          <span>0 · Crítico</span>
          <span>50 · Medio</span>
          <span>100 · Excelente</span>
        </div>
        <div class="lisa-row">
          <span v-for="z in zonas" :key="z.key" class="lisa-chip"
            :style="{ color: z.color, background: z.color + '18', border: '1px solid ' + z.color + '55' }">
            {{ z.key }}
          </span>
          <span class="lisa-desc">Clusters LISA</span>
        </div>

        <div class="sheet-footer">CNPV 2018 · REPS · SIMAT · OSM · SMByC · GFW · Tensor 2025</div>
      </div>

      <!-- ── Tab: CAPAS ────────────────────────────────────────── -->
      <div v-if="activeTab === 'capas'" class="tab-content" key="capas">

        <!-- Vistas rápidas (scroll horizontal) -->
        <div class="section-label">Vistas rápidas</div>
        <div class="vistas-scroll">
          <button
            v-for="vista in vistas"
            :key="vista.id"
            class="vista-chip"
            :class="{ 'vista-chip--active': isVistaActive(vista) }"
            @click="toggleVista(vista)"
          >
            <span>{{ vista.emoji }}</span>
            <span>{{ vista.nombre }}</span>
          </button>
        </div>

        <!-- Lista de capas agrupadas -->
        <div v-for="grupo in gruposCapas" :key="grupo.id" class="capas-grupo">
          <div class="capas-grupo-header">
            <span class="capas-grupo-emoji">{{ grupo.emoji }}</span>
            <span class="capas-grupo-nombre">{{ grupo.nombre }}</span>
            <span v-if="activasEnGrupo(grupo) > 0" class="capas-grupo-badge">{{ activasEnGrupo(grupo) }}</span>
          </div>
          <div class="capas-list">
            <button
              v-for="capa in grupo.capas"
              :key="capa.id"
              class="capa-row"
              :class="{
                'capa-row--active': activeLayers.has(capa.id),
                'capa-row--empty': sinDatos.has(capa.id)
              }"
              :disabled="sinDatos.has(capa.id)"
              @click="$emit('toggle-layer', capa.id)"
            >
              <span class="capa-dot" :style="{ background: capa.color }" />
              <span class="capa-label">
                {{ capa.label }}
                <span v-if="sinDatos.has(capa.id)" class="capa-pending">sin datos</span>
              </span>
              <!-- Toggle switch -->
              <span class="capa-toggle" :class="{ 'capa-toggle--on': activeLayers.has(capa.id) }">
                <span class="capa-toggle-knob" />
              </span>
            </button>
          </div>
        </div>

        <!-- Limpiar todo -->
        <div v-if="capasActivasCount > 0" class="capas-reset">
          <button class="capas-reset-btn" @click="resetCapas">Limpiar capas</button>
        </div>
      </div>

      <!-- ── Tab: FILTROS ──────────────────────────────────────── -->
      <div v-if="activeTab === 'filtros'" class="tab-content" key="filtros">

        <div class="section-label">Rango de bienestar</div>
        <div class="filter-range">
          <div class="range-values">
            <span class="range-val" :style="{ color: scoreColor(store.filterMin) }">{{ Math.round(store.filterMin * 100) }}</span>
            <span class="range-sep">—</span>
            <span class="range-val" :style="{ color: scoreColor(store.filterMax) }">{{ Math.round(store.filterMax * 100) }}</span>
          </div>
          <div class="range-track">
            <div
              class="range-fill"
              :style="{
                left: store.filterMin * 100 + '%',
                right: (1 - store.filterMax) * 100 + '%'
              }"
            />
          </div>
          <div class="range-inputs">
            <input
              type="range" min="0" max="100"
              :value="Math.round(store.filterMin * 100)"
              @input="store.setFilterMin($event.target.value / 100)"
              class="range-input"
            />
            <input
              type="range" min="0" max="100"
              :value="Math.round(store.filterMax * 100)"
              @input="store.setFilterMax($event.target.value / 100)"
              class="range-input"
            />
          </div>
        </div>

        <div class="section-label" style="margin-top: 20px">Zona LISA</div>
        <div class="zona-grid">
          <button
            v-for="z in zonas"
            :key="z.key"
            class="zona-btn"
            :class="{ 'zona-btn--active': store.zonaFilter.includes(z.key) }"
            :style="store.zonaFilter.includes(z.key) ? { borderColor: z.color, background: z.color + '20', color: z.color } : {}"
            @click="store.toggleZonaFilter(z.key)"
          >
            <span class="zona-swatch" :style="{ background: z.color }" />
            <span>{{ z.key }}</span>
            <span class="zona-desc">{{ z.desc }}</span>
          </button>
        </div>

        <div v-if="hasFilters" class="reset-row">
          <button class="reset-btn" @click="store.resetFilters()">
            Restablecer filtros
          </button>
        </div>
      </div>

      <!-- ── Tab: MANZANA ─────────────────────────────────────── -->
      <div v-if="activeTab === 'manzana' && manzanaSeleccionada" class="tab-content" key="manzana">

        <!-- Header manzana -->
        <div class="manzana-header">
          <div class="manzana-meta">
            <span class="manzana-zona-badge" :style="zonaStyle(p.zona_atlas)">{{ p.zona_atlas || '—' }}</span>
            <span class="manzana-quintil">{{ p.quintil || '—' }}</span>
          </div>
          <div class="manzana-municipio">{{ p.municipio }}</div>
          <div class="manzana-id">{{ (p.cod_manzana || '').slice(-12) }}</div>
        </div>

        <!-- Score global -->
        <div class="manzana-score-row">
          <div class="manzana-score-num" :style="{ color: scoreColor(p.atlas_score) }">
            {{ Math.round((+p.atlas_score || 0) * 100) }}
          </div>
          <div class="manzana-score-info">
            <span class="manzana-score-label">Bienestar</span>
            <span class="manzana-score-sub">Índice Atlas Urabá</span>
          </div>
        </div>
        <div class="manzana-bar">
          <div class="manzana-bar-fill" :style="{ width: Math.round((+p.atlas_score||0)*100)+'%', background: scoreColor(p.atlas_score) }" />
        </div>

        <!-- Dimensiones -->
        <div class="section-label" style="margin-top: 16px">Dimensiones</div>
        <div class="manzana-dims">
          <div v-for="dim in dimensiones" :key="dim.key" class="manzana-dim-row">
            <span class="manzana-dim-label">{{ dim.label.split(' ')[0] }}</span>
            <div class="manzana-dim-bar">
              <div
                class="manzana-dim-fill"
                :style="{ width: Math.round((+(p[dim.key])||0)*100)+'%', background: dim.color }"
              />
            </div>
            <span class="manzana-dim-score" :style="{ color: dim.color }">
              {{ Math.round((+(p[dim.key])||0)*100) }}
            </span>
          </div>
        </div>

        <!-- Cerrar / deseleccionar -->
        <button class="manzana-close" @click="closeManzana">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Deseleccionar manzana
        </button>
      </div>

      <!-- ── Tab: DIAGNÓSTICO ─────────────────────────────────── -->
      <div v-if="activeTab === 'diagnostico'" class="tab-content" key="diagnostico">

        <!-- Vista Todos: ranking -->
        <template v-if="store.municipioActivo === 'Todos'">
          <div class="section-label">Ranking regional</div>
          <div class="diag-ranking">
            <div
              v-for="(item, i) in rankingMunicipios"
              :key="item.nombre"
              class="diag-rank-row"
              @click="store.setMunicipio(item.nombre); if(isOpen) toggle()"
            >
              <span class="diag-rank-pos">{{ i + 1 }}</span>
              <span class="diag-rank-name">{{ item.nombre.split(' de')[0] }}</span>
              <div class="diag-rank-bar">
                <div class="diag-rank-fill" :style="{ width: item.score + '%', background: scoreColor(item.score/100) }" />
              </div>
              <span class="diag-rank-score" :style="{ color: scoreColor(item.score/100) }">{{ item.score }}</span>
            </div>
          </div>
          <div class="diag-alert">
            <span class="diag-alert-num">1,872</span>
            manzanas requieren intervención prioritaria (Crítica + Alta)
          </div>
          <div class="diag-finding">
            <span class="diag-finding-label">Brecha estructural</span>
            Accesibilidad es la dimensión más débil en los 8 municipios — argumento clave para gestión regional.
          </div>
        </template>

        <!-- Vista municipio: diagnóstico completo -->
        <template v-else-if="gapData">
          <!-- Score headline -->
          <div class="diag-headline">
            <div class="diag-score-num" :style="{ color: scoreColor(gapData.atlas_score/100) }">
              {{ gapData.atlas_score }}
            </div>
            <div class="diag-score-info">
              <span class="diag-score-label">/ 100 · {{ gapData.nivel?.toUpperCase() }}</span>
              <span class="diag-score-rank">#{{ rankPos }} de 8 municipios</span>
            </div>
          </div>

          <!-- Narrativa -->
          <div class="diag-narrativa">{{ gapData.narrativa }}</div>

          <!-- Dimensiones con gap -->
          <div class="section-label" style="margin-top: 16px">Dimensiones vs. promedio Urabá</div>
          <div class="diag-dims">
            <div v-for="(label, key) in dimLabels" :key="key" class="diag-dim-row">
              <span class="diag-dim-label">{{ label }}</span>
              <div class="diag-dim-track">
                <div class="diag-dim-fill" :style="{ width: gapData.dimensiones[key] + '%', background: dimColors[key] }" />
                <!-- Marca promedio Urabá -->
                <div class="diag-dim-avg" :style="{ left: (urabaAvg[key] || 50) + '%' }" />
              </div>
              <span class="diag-dim-score">{{ gapData.dimensiones[key] }}</span>
              <span class="diag-dim-gap" :class="gapData.gaps_vs_uraba[key] >= 0 ? 'gap-pos' : 'gap-neg'">
                {{ gapData.gaps_vs_uraba[key] >= 0 ? '+' : '' }}{{ gapData.gaps_vs_uraba[key] }}
              </span>
            </div>
          </div>

          <!-- Fortaleza y brecha -->
          <div class="diag-pills-row">
            <div class="diag-pill diag-pill--pos">
              <span>▲</span> {{ dimLabels[gapData.fortaleza] || gapData.fortaleza }}
            </div>
            <div class="diag-pill diag-pill--neg">
              <span>▼</span> {{ dimLabels[gapData.debilidad] || gapData.debilidad }}
            </div>
          </div>

          <!-- Top manzanas -->
          <div v-if="topManzanas.length" class="section-label" style="margin-top: 16px">
            Top 5 manzanas prioritarias
          </div>
          <div class="diag-top-list">
            <div v-for="(mz, i) in topManzanas" :key="mz.cod_manzana" class="diag-top-row">
              <span class="diag-top-num">{{ i + 1 }}</span>
              <span class="diag-top-cod">…{{ (mz.cod_manzana || '').slice(-8) }}</span>
              <span class="diag-top-score" :style="{ color: scoreColor(mz.atlas_score) }">
                {{ Math.round((mz.atlas_score || 0) * 100) }}<span style="font-size:7px;opacity:0.6">/100</span>
              </span>
              <span class="diag-top-prio" :class="'prio-' + (mz.prioridad || 'media').toLowerCase()">
                {{ mz.prioridad || '—' }}
              </span>
            </div>
          </div>
        </template>

        <div v-else class="diag-loading-msg">Cargando diagnóstico…</div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAtlasStore, DIMENSIONES, MUNICIPIOS } from '~/stores/atlas'

const props = defineProps({
  activeLayers: { type: Object, default: () => new Set() }
})
const emit = defineEmits(['open', 'close', 'toggle-layer'])

const store = useAtlasStore()
const dimensiones = DIMENSIONES
const municipios  = MUNICIPIOS

const isOpen    = ref(false)
const activeTab = ref('indice')
const sheetEl   = ref(null)

// ── Diagnóstico data ──────────────────────────────────────────
const gapAnalysisData = ref(null)
const topPrioridadData = ref(null)

onMounted(async () => {
  try {
    const [gap, top] = await Promise.all([
      fetch('/data/gap_analysis.json').then(r => r.json()),
      fetch('/data/top_prioridad.json').then(r => r.json()),
    ])
    gapAnalysisData.value = gap
    topPrioridadData.value = top
  } catch (e) {
    console.warn('[MobileSheet] gap/top data:', e.message)
  }
})

const dimLabels = {
  score_accesibilidad:  'Accesibilidad',
  score_ambiental:      'Ambiental',
  score_socioeconomico: 'Socioeconómico',
  score_seguridad:      'Seguridad',
}
const dimColors = {
  score_accesibilidad:  '#60a5fa',
  score_ambiental:      '#34d399',
  score_socioeconomico: '#a78bfa',
  score_seguridad:      '#fbbf24',
}

const urabaAvg = computed(() => {
  const t = store.statsTodos
  if (!t?.avg) return {}
  return {
    score_accesibilidad:  Math.round((t.avg.score_accesibilidad || 0) * 100),
    score_ambiental:      Math.round((t.avg.score_ambiental || 0) * 100),
    score_socioeconomico: Math.round((t.avg.score_socioeconomico || 0) * 100),
    score_seguridad:      Math.round((t.avg.score_seguridad || 0) * 100),
  }
})

const gapData = computed(() => {
  const m = store.municipioActivo
  if (m === 'Todos' || !gapAnalysisData.value) return null
  return gapAnalysisData.value[m] || null
})

const topManzanas = computed(() => {
  const m = store.municipioActivo
  if (!topPrioridadData.value || m === 'Todos') return []
  return topPrioridadData.value[m] || []
})

const rankingMunicipios = computed(() => {
  return MUNICIPIOS
    .filter(m => m.nombre !== 'Todos')
    .map(m => ({
      nombre: m.nombre,
      score: Math.round((store.stats[m.nombre]?.avg?.atlas_score || 0) * 100),
    }))
    .sort((a, b) => b.score - a.score)
})

const rankPos = computed(() => {
  const m = store.municipioActivo
  const sorted = rankingMunicipios.value
  const idx = sorted.findIndex(x => x.nombre === m)
  return idx >= 0 ? idx + 1 : '—'
})

// Zonas LISA con descripciones
const zonas = [
  { key: 'HH', color: '#1a9641', desc: 'Alto-Alto' },
  { key: 'LL', color: '#d7191c', desc: 'Bajo-Bajo' },
  { key: 'HL', color: '#f39c12', desc: 'Alto-Bajo' },
  { key: 'LH', color: '#3498db', desc: 'Bajo-Alto' },
]

// Capas sin datos reales
const sinDatos = new Set(['manglares', 'agua', 'inundacion'])

// Grupos de capas para la tab Capas
const gruposCapas = [
  {
    id: 'territorio', emoji: '🗺️', nombre: 'Territorio',
    capas: [
      { id: 'veredas',    label: 'Veredas',         color: 'rgba(255,255,255,0.3)' },
      { id: 'municipios', label: 'Municipios',       color: 'rgba(255,255,255,0.5)' },
      { id: 'waterways',  label: 'Ríos',             color: '#3B82F6' },
      { id: 'roads',      label: 'Red vial',         color: '#F97316' },
    ]
  },
  {
    id: 'agro', emoji: '🍌', nombre: 'Agricultura',
    capas: [
      { id: 'sipra',      label: 'Aptitud bananera', color: '#00cc44' },
      { id: 'fincas',     label: 'Fincas bananeras', color: '#F5E642' },
      { id: 'eva-banano', label: 'Producción EVA',   color: '#F5E642' },
    ]
  },
  {
    id: 'ambiente', emoji: '🌿', nombre: 'Ambiente',
    capas: [
      { id: 'manglares',    label: 'Manglares',      color: '#166534' },
      { id: 'carbono',      label: 'Carbono bosques',color: '#4ade80' },
      { id: 'runap',        label: 'Áreas protegidas',color: '#166534' },
      { id: 'deforestacion',label: 'Deforestación',  color: '#dc2626' },
      { id: 'inundacion',   label: 'Zonas inundables',color: '#0066FF' },
    ]
  },
  {
    id: 'social', emoji: '👥', nombre: 'Social',
    capas: [
      { id: 'reps',           label: 'Salud (IPS)',      color: '#3B82F6' },
      { id: 'simat',          label: 'Colegios',         color: '#F59E0B' },
      { id: 'terridata-full', label: 'NBI TerriData',    color: '#d73027' },
      { id: 'sui-servicios',  label: 'Cobertura acueducto', color: '#1d91c0' },
      { id: 'uariv',          label: 'Desplazamiento',   color: '#dc2626' },
      { id: 'resguardos-ant', label: 'Resguardos ANT',   color: '#7c3aed' },
      { id: 'zomac',          label: 'ZOMAC',            color: '#ea580c' },
    ]
  },
  {
    id: 'infraestructura', emoji: '🏗️', nombre: 'Infraestructura',
    capas: [
      { id: 'infraestructura', label: 'Puerto Antioquia', color: '#0ea5e9' },
      { id: 'tic',             label: 'Cobertura 4G',     color: '#818cf8' },
    ]
  },
  {
    id: 'transporte', emoji: '🛣️', nombre: 'Transporte',
    capas: [
      { id: 'red-vial',        label: 'Red vial primaria', color: '#f97316' },
      { id: 'red-vial-invias', label: 'Red Vial INVÍAS',   color: '#dc2626' },
      { id: 'aislamiento',     label: 'Aislamiento',        color: '#dc2626' },
    ]
  },
  {
    id: 'conflicto', emoji: '⚡', nombre: 'Conflicto de uso',
    capas: [
      { id: 'conflicto-uso',   label: 'Conflicto suelo',  color: '#dc2626' },
      { id: 'corpouraba-agua', label: 'Agua CORPOURABÁ',  color: '#3b82f6' },
    ]
  },
  {
    id: 'ordenamiento', emoji: '📐', nombre: 'Ordenamiento',
    capas: [
      { id: 'prioridad-inversion', label: 'Prioridad inversión', color: '#f97316' },
      { id: 'catastro',            label: 'Catastro urbano',     color: '#6366f1' },
      { id: 'clasificacion-suelo', label: 'Clasificación suelo',  color: '#FF8F00' },
      { id: 'osm-landuse',         label: 'Usos OSM',             color: '#7CB342' },
      { id: 'equipamientos',       label: 'Equipamientos',        color: '#E65C00' },
    ]
  },
]

// Vistas rápidas
const vistas = [
  { id: 'riesgo',      emoji: '🌊', nombre: 'Riesgo',      capas: ['inundacion', 'deforestacion', 'manglares'] },
  { id: 'agro',        emoji: '🍌', nombre: 'Agro',         capas: ['sipra', 'fincas', 'eva-banano'] },
  { id: 'transporte',  emoji: '🛣️', nombre: 'Transporte',   capas: ['red-vial', 'aislamiento', 'infraestructura'] },
  { id: 'conflicto',   emoji: '⚡', nombre: 'Conflicto',    capas: ['conflicto-uso', 'sipra', 'sipra-excl'] },
  { id: 'social',      emoji: '👥', nombre: 'Social',       capas: ['reps', 'simat', 'uariv', 'resguardos-ant'] },
]

// ── Computed ──────────────────────────────────────────────────────────────────
const manzanaSeleccionada = computed(() => store.manzanaSeleccionada)
const p = computed(() => manzanaSeleccionada.value || {})

const manzanaMunicipio = computed(() => p.value.municipio || '—')

const regionScore = computed(() => {
  const m = store.municipioActivo
  if (m === 'Todos') {
    const all = Object.values(store.stats)
    if (!all.length) return null
    const total = all.reduce((s, v) => s + v.count, 0) || 1
    return all.reduce((s, v) => s + (v.avg?.atlas_score ?? 0) * v.count, 0) / total
  }
  return store.stats[m]?.avg?.atlas_score ?? null
})

const manzanaScore = computed(() =>
  manzanaSeleccionada.value ? +(p.value.atlas_score || 0) : null
)

const activeScore = computed(() =>
  manzanaScore.value !== null ? manzanaScore.value : regionScore.value
)

const activeScoreDisplay = computed(() =>
  activeScore.value != null ? Math.round(activeScore.value * 100) : '—'
)

const activeScorePercent = computed(() =>
  activeScore.value != null ? Math.round(activeScore.value * 100) : 0
)

const activeScoreColor = computed(() => scoreColor(activeScore.value))
const badgeStyle = computed(() => {
  const c = activeScoreColor.value
  return { color: c, background: c + '18', border: '1px solid ' + c + '44' }
})

const capasActivasCount = computed(() => {
  const base = new Set(['veredas', 'municipios'])
  return [...props.activeLayers].filter(id => !base.has(id)).length
})

const hasFilters = computed(() =>
  store.filterMin > 0 || store.filterMax < 1 || store.zonaFilter.length < 5
)

const visibleTabs = computed(() => {
  const tabs = [
    { id: 'indice',      icon: '📊', label: 'Índice',   shortLabel: 'Índice' },
    { id: 'diagnostico', icon: '🎯', label: 'Diag.',     shortLabel: 'Diag.' },
    { id: 'capas',       icon: '🗂️', label: 'Capas',    shortLabel: 'Capas' },
    { id: 'filtros',     icon: '⚙️', label: 'Filtros',  shortLabel: 'Filtros' },
  ]
  if (manzanaSeleccionada.value) {
    tabs.push({ id: 'manzana', icon: '📍', label: 'Manzana', shortLabel: '📍' })
  }
  return tabs
})

// Abrir tab manzana automáticamente cuando se selecciona una
watch(manzanaSeleccionada, (val) => {
  if (val) {
    activeTab.value = 'manzana'
    if (!isOpen.value) {
      isOpen.value = true
      emit('open')
    }
  }
})

// ── Touch drag gestures ───────────────────────────────────────────────────────
let touchStartY   = 0
let touchStartTime = 0
let wasDragMove   = false

function onTouchStart(e) {
  touchStartY    = e.touches[0].clientY
  touchStartTime = Date.now()
  wasDragMove    = false
}

function onTouchMove(e) {
  const dy = e.touches[0].clientY - touchStartY
  if (Math.abs(dy) > 12) wasDragMove = true

  const dt = Date.now() - touchStartTime
  const velocity = Math.abs(dy) / (dt || 1)

  if (!isOpen.value && dy < -40) {
    isOpen.value = true
    emit('open')
  } else if (isOpen.value && dy > 80 && velocity > 0.2) {
    isOpen.value = false
    emit('close')
  }
}

function onTouchEnd() {
  touchStartY = 0
}

function handleDragZoneClick() {
  // No toggle si fue un swipe (ya se manejó en onTouchMove)
  if (!wasDragMove) toggle()
  wasDragMove = false
}

function toggle() {
  isOpen.value = !isOpen.value
  emit(isOpen.value ? 'open' : 'close')
}

function openTab(tab) {
  activeTab.value = tab
  if (!isOpen.value) {
    isOpen.value = true
    emit('open')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(v) {
  const n = +(v ?? 0)
  if (n >= 0.85) return '#1a9850'
  if (n >= 0.70) return '#66bd63'
  if (n >= 0.55) return '#a6d96a'
  if (n >= 0.40) return '#fdae61'
  if (n >= 0.20) return '#f46d43'
  return '#d73027'
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

function munScore(nombre) {
  if (nombre === 'Todos') return null
  const s = store.stats[nombre]
  return s?.avg ? Math.round(s.avg.atlas_score * 100) : null
}

function dimScore(key) {
  const m = store.municipioActivo
  if (m === 'Todos') return null
  const s = store.stats[m]
  return s?.avg ? Math.round((s.avg[key] ?? 0) * 100) : null
}

function zonaStyle(zona) {
  const z = zonas.find(x => x.key === zona)
  if (!z) return {}
  return {
    color: z.color,
    background: z.color + '18',
    border: '1px solid ' + z.color + '44',
    fontFamily: 'var(--ff-mono)',
    fontSize: '7px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '2px 6px',
    borderRadius: '3px',
    fontWeight: '600',
  }
}

function activasEnGrupo(grupo) {
  return grupo.capas.filter(c => props.activeLayers.has(c.id)).length
}

function isVistaActive(vista) {
  return vista.capas.every(id => props.activeLayers.has(id))
}

function toggleVista(vista) {
  const isActive = isVistaActive(vista)
  vista.capas.forEach(id => {
    const on = props.activeLayers.has(id)
    if (isActive && on) emit('toggle-layer', id)
    else if (!isActive && !on) emit('toggle-layer', id)
  })
}

function resetCapas() {
  const base = new Set(['veredas', 'municipios'])
  ;[...props.activeLayers].forEach(id => {
    if (!base.has(id)) emit('toggle-layer', id)
  })
}

function closeManzana() {
  store.clearManzana()
  activeTab.value = 'indice'
}

// Exponer para el padre
defineExpose({ toggle, isOpen, openTab })
</script>

<style scoped>
/* ── Drag zone ─────────────────────────────────────────── */
.sheet-drag-zone {
  cursor: grab;
  user-select: none;
  padding-bottom: 4px;
}

/* ── Peek bar ──────────────────────────────────────────── */
.peek-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 10px;
  gap: 12px;
}

.peek-main { flex: 1; min-width: 0; }

.peek-context {
  display: block;
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--ca, #1B6B6D);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.peek-score-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  flex-wrap: wrap;
}

.peek-score-num {
  font-family: var(--ff-head);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.6px;
  line-height: 1;
}

.peek-score-unit {
  font-family: var(--ff-mono);
  font-size: 9px;
  color: var(--cm, #5F5F5B);
  letter-spacing: 0.1em;
}

.peek-score-badge, .peek-manzana-badge {
  font-family: var(--ff-mono);
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 2px 5px;
  border-radius: 3px;
}

.peek-manzana-badge {
  color: var(--ca, #1B6B6D);
  background: rgba(27,107,109,0.1);
  border: 1px solid rgba(27,107,109,0.25);
}

.peek-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.peek-dim {
  display: flex;
  align-items: center;
  gap: 5px;
}

.peek-dim-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.peek-dim-label {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
}

.peek-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.peek-layers-badge {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ca, #1B6B6D);
  background: rgba(27,107,109,0.1);
  border: 1px solid rgba(27,107,109,0.25);
  border-radius: 4px;
  padding: 3px 7px;
  cursor: pointer;
  white-space: nowrap;
}

.peek-chevron {
  width: 30px; height: 30px;
  border-radius: 8px;
  border: 1px solid var(--cb, #E5E5E0);
  background: var(--cbg, #F2F1EE);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cm, #5F5F5B);
  transition: all 0.15s;
}

.peek-chevron:active {
  transform: scale(0.92);
  background: var(--cb, #E5E5E0);
}

/* Progress bar */
.peek-progress {
  height: 3px;
  background: var(--cb, #E5E5E0);
  margin: 0 16px;
  border-radius: 2px;
  overflow: hidden;
}

.peek-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease, background 0.4s ease;
}

/* ── Sheet body ────────────────────────────────────────── */
.sheet-body {
  border-top: 1px solid var(--cb, #E5E5E0);
  overflow-y: auto;
  max-height: calc(85vh - 90px);
  -webkit-overflow-scrolling: touch;
}

/* ── Tab bar ───────────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--cb, #E5E5E0);
  padding: 0 4px;
  position: sticky;
  top: 0;
  background: #FFF;
  z-index: 1;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--ff-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cm, #5F5F5B);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s;
  position: relative;
  flex: 1;
  justify-content: center;
}

.tab-btn--active {
  color: var(--ca, #1B6B6D);
  border-bottom-color: var(--ca, #1B6B6D);
}

.tab-icon { font-size: 12px; }
.tab-label { white-space: nowrap; }

.tab-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 14px;
  height: 14px;
  border-radius: 7px;
  background: var(--ca, #1B6B6D);
  color: #fff;
  font-size: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* ── Tab content ───────────────────────────────────────── */
.tab-content {
  padding: 16px 16px 32px;
}

/* ── Section label ─────────────────────────────────────── */
.section-label {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--ca, #1B6B6D);
  margin-bottom: 10px;
}

/* ── Tools row (Comparar / Simulador) ──────────────────── */
.tools-row {
  display: flex;
  gap: 8px;
}

.tool-link {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(27,107,109,0.25);
  background: rgba(27,107,109,0.06);
  color: var(--ca, #1B6B6D);
  text-decoration: none;
  font-family: var(--ff-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  min-height: 44px;
  transition: all 0.15s;
}

.tool-link:active { transform: scale(0.97); background: rgba(27,107,109,0.12); }

/* ── Dimension pills ───────────────────────────────────── */
.dim-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dim-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 11px;
  border-radius: 20px;
  border: 1px solid var(--cb, #E5E5E0);
  background: transparent;
  cursor: pointer;
  font-family: var(--ff-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cm, #5F5F5B);
  transition: all 0.15s;
  min-height: 40px;
}

.dim-pill:active { transform: scale(0.96); }

.dim-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dim-score {
  font-weight: 700;
  margin-left: 2px;
  color: var(--cm, #5F5F5B);
}

/* ── Municipality grid — 3 cols para que 9 items queden 3×3 ── */
.mun-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
}

.mun-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--cb, #E5E5E0);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 44px;
}

.mun-chip:active { transform: scale(0.96); }

.mun-chip--active {
  background: rgba(27,107,109,0.07);
  border-color: rgba(27,107,109,0.3);
}

.mun-name {
  font-family: var(--ff-body, 'Inter');
  font-size: 11px;
  color: var(--c1, #1A1A1A);
  text-align: left;
  line-height: 1.2;
}

.mun-score {
  font-family: var(--ff-mono);
  font-size: 11px;
  font-weight: 700;
}

/* ── Legend ────────────────────────────────────────────── */
.legend-grad {
  width: 100%; height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, #d73027, #f46d43, #fdae61, #a6d96a, #66bd63, #1a9850);
  margin-bottom: 4px;
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  margin-bottom: 10px;
}

.lisa-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.lisa-chip {
  padding: 3px 8px;
  border-radius: 4px;
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.lisa-desc {
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-left: 4px;
}

/* ── Sheet footer ──────────────────────────────────────── */
.sheet-footer {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid var(--cb, #E5E5E0);
  font-family: var(--ff-mono);
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
  text-align: center;
}

/* ── Capas tab ─────────────────────────────────────────── */
.vistas-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 16px;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.vistas-scroll::-webkit-scrollbar { display: none; }

.vista-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid var(--cb, #E5E5E0);
  background: transparent;
  cursor: pointer;
  font-family: var(--ff-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cm, #5F5F5B);
  white-space: nowrap;
  transition: all 0.15s;
  min-height: 36px;
  flex-shrink: 0;
}

.vista-chip--active {
  background: rgba(27,107,109,0.1);
  border-color: rgba(27,107,109,0.4);
  color: var(--ca, #1B6B6D);
}

.vista-chip:active { transform: scale(0.95); }

.capas-grupo { margin-bottom: 12px; }

.capas-grupo-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border-bottom: 1px solid var(--cb, #E5E5E0);
  margin-bottom: 4px;
}

.capas-grupo-emoji { font-size: 13px; }

.capas-grupo-nombre {
  font-family: var(--ff-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--c1, #1A1A1A);
  font-weight: 600;
  flex: 1;
}

.capas-grupo-badge {
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--ca, #1B6B6D);
  background: rgba(27,107,109,0.1);
  border-radius: 3px;
  padding: 1px 5px;
}

.capas-list { display: flex; flex-direction: column; gap: 2px; }

.capa-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.12s;
  width: 100%;
  text-align: left;
  min-height: 44px;
}

.capa-row:active:not(:disabled) { transform: scale(0.98); }
.capa-row:hover:not(:disabled)  { background: rgba(0,0,0,0.03); }
.capa-row--active {
  background: rgba(27,107,109,0.06);
  border-color: rgba(27,107,109,0.2);
}
.capa-row--empty { opacity: 0.5; cursor: not-allowed; }

.capa-dot {
  width: 10px; height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

.capa-label {
  flex: 1;
  font-family: var(--ff-body, 'Inter');
  font-size: 14px;
  color: var(--c1, #1A1A1A);
}

.capa-pending {
  display: inline-block;
  margin-left: 6px;
  font-family: var(--ff-mono);
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
  background: rgba(107,114,128,0.12);
  border: 1px solid rgba(107,114,128,0.2);
  border-radius: 2px;
  padding: 1px 4px;
  vertical-align: middle;
}

/* Toggle switch */
.capa-toggle {
  width: 36px; height: 20px;
  border-radius: 10px;
  background: var(--cb, #E5E5E0);
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s;
}

.capa-toggle--on {
  background: var(--ca, #1B6B6D);
}

.capa-toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.capa-toggle--on .capa-toggle-knob {
  transform: translateX(16px);
}

.capas-reset {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--cb, #E5E5E0);
  display: flex;
  justify-content: center;
}

.capas-reset-btn {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #dc2626;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 0;
}

/* ── Filtros tab ───────────────────────────────────────── */
.filter-range {
  background: var(--cbg, #F2F1EE);
  border-radius: 12px;
  padding: 14px 14px 10px;
}

.range-values {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  justify-content: center;
}

.range-val {
  font-family: var(--ff-head);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.44px;
}

.range-sep {
  font-family: var(--ff-mono);
  font-size: 11px;
  color: var(--cm, #5F5F5B);
}

.range-track {
  height: 4px;
  background: var(--cb, #E5E5E0);
  border-radius: 2px;
  position: relative;
  margin: 0 8px 8px;
}

.range-fill {
  position: absolute;
  height: 100%;
  background: var(--ca, #1B6B6D);
  border-radius: 2px;
}

.range-inputs {
  position: relative;
  height: 24px;
}

.range-input {
  position: absolute;
  width: 100%;
  height: 4px;
  appearance: none;
  background: transparent;
  pointer-events: none;
}

.range-input::-webkit-slider-thumb {
  pointer-events: all;
  appearance: none;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--ca, #1B6B6D);
  border: 2px solid #fff;
  box-shadow: 0 1px 6px rgba(0,0,0,0.25);
  cursor: grab;
}

.range-input::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.1); }

.zona-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.zona-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--cb, #E5E5E0);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 44px;
}

.zona-btn:active { transform: scale(0.96); }

.zona-swatch {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.zona-btn > span:nth-child(2) {
  font-family: var(--ff-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.zona-desc {
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.reset-row {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.reset-btn {
  font-family: var(--ff-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cm, #5F5F5B);
  background: var(--cbg, #F2F1EE);
  border: 1px solid var(--cb, #E5E5E0);
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 44px;
}

.reset-btn:active { transform: scale(0.96); }

/* ── Manzana tab ───────────────────────────────────────── */
.manzana-header {
  margin-bottom: 14px;
}

.manzana-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.manzana-quintil {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
}

.manzana-municipio {
  font-family: var(--ff-head);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.36px;
  color: var(--c1, #1A1A1A);
}

.manzana-id {
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  letter-spacing: 0.05em;
  margin-top: 2px;
}

.manzana-score-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 8px;
}

.manzana-score-num {
  font-family: var(--ff-head);
  font-size: 42px;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1;
}

.manzana-score-label {
  display: block;
  font-family: var(--ff-mono);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--c1, #1A1A1A);
}

.manzana-score-sub {
  display: block;
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
  margin-top: 2px;
}

.manzana-bar {
  height: 4px;
  background: var(--cb, #E5E5E0);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.manzana-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease, background 0.4s ease;
}

.manzana-dims { display: flex; flex-direction: column; gap: 8px; }

.manzana-dim-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.manzana-dim-label {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
  width: 80px;
  flex-shrink: 0;
}

.manzana-dim-bar {
  flex: 1;
  height: 4px;
  background: var(--cb, #E5E5E0);
  border-radius: 2px;
  overflow: hidden;
}

.manzana-dim-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.manzana-dim-score {
  font-family: var(--ff-mono);
  font-size: 11px;
  font-weight: 700;
  width: 26px;
  text-align: right;
  flex-shrink: 0;
}

.manzana-close {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  padding: 10px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--ff-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cm, #5F5F5B);
}

.manzana-close:hover { color: var(--c1, #1A1A1A); }

/* ── Diagnóstico tab ──────────────────────────────── */
.diag-headline {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 4px 0 14px;
  border-bottom: 1px solid var(--cb, #E5E5E0);
  margin-bottom: 12px;
}
.diag-score-num {
  font-family: var(--ff-head);
  font-size: 52px;
  font-weight: 700;
  letter-spacing: -1.5px;
  line-height: 1;
}
.diag-score-label {
  display: block;
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--c1, #1A1A1A);
}
.diag-score-rank {
  display: block;
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 3px;
}
.diag-narrativa {
  font-family: var(--ff-body, 'Inter');
  font-size: 13px;
  line-height: 1.55;
  color: var(--c1, #1A1A1A);
  margin-bottom: 4px;
}
.diag-dims { display: flex; flex-direction: column; gap: 10px; }
.diag-dim-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.diag-dim-label {
  font-family: var(--ff-mono);
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cm, #5F5F5B);
  width: 80px;
  flex-shrink: 0;
}
.diag-dim-track {
  flex: 1;
  height: 5px;
  background: var(--cb, #E5E5E0);
  border-radius: 3px;
  overflow: visible;
  position: relative;
}
.diag-dim-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.diag-dim-avg {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 11px;
  background: rgba(0,0,0,0.35);
  border-radius: 1px;
  transform: translateX(-50%);
}
.diag-dim-score {
  font-family: var(--ff-mono);
  font-size: 11px;
  font-weight: 700;
  width: 24px;
  text-align: right;
  flex-shrink: 0;
  color: var(--c1, #1A1A1A);
}
.diag-dim-gap {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  width: 28px;
  text-align: right;
  flex-shrink: 0;
}
.gap-pos { color: #16a34a; }
.gap-neg { color: #dc2626; }

.diag-pills-row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.diag-pill {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px;
  border-radius: 8px;
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
}
.diag-pill--pos {
  background: rgba(22,163,74,0.1);
  border: 1px solid rgba(22,163,74,0.3);
  color: #16a34a;
}
.diag-pill--neg {
  background: rgba(220,38,38,0.08);
  border: 1px solid rgba(220,38,38,0.25);
  color: #dc2626;
}

.diag-top-list { display: flex; flex-direction: column; gap: 6px; }
.diag-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--cbg, #F2F1EE);
  border-radius: 8px;
}
.diag-top-num {
  font-family: var(--ff-mono);
  font-size: 9px;
  color: var(--cm, #5F5F5B);
  width: 14px;
  flex-shrink: 0;
}
.diag-top-cod {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c1, #1A1A1A);
  flex: 1;
}
.diag-top-score {
  font-family: var(--ff-mono);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.diag-top-prio {
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.prio-crítica { background: rgba(220,38,38,0.12); color: #dc2626; }
.prio-alta    { background: rgba(249,115,22,0.12); color: #f97316; }
.prio-media   { background: rgba(234,179,8,0.12);  color: #ca8a04; }
.prio-baja    { background: rgba(34,197,94,0.12);  color: #16a34a; }

/* Ranking (vista Todos) */
.diag-ranking { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.diag-rank-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.12s;
}
.diag-rank-row:active { background: var(--cbg, #F2F1EE); }
.diag-rank-pos {
  font-family: var(--ff-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--cm, #5F5F5B);
  width: 16px;
  flex-shrink: 0;
}
.diag-rank-name {
  font-family: var(--ff-body, 'Inter');
  font-size: 13px;
  color: var(--c1, #1A1A1A);
  width: 90px;
  flex-shrink: 0;
}
.diag-rank-bar {
  flex: 1;
  height: 5px;
  background: var(--cb, #E5E5E0);
  border-radius: 3px;
  overflow: hidden;
}
.diag-rank-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.diag-rank-score {
  font-family: var(--ff-mono);
  font-size: 12px;
  font-weight: 700;
  width: 28px;
  text-align: right;
  flex-shrink: 0;
}
.diag-alert {
  background: rgba(220,38,38,0.08);
  border: 1px solid rgba(220,38,38,0.2);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c1, #1A1A1A);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}
.diag-alert-num {
  font-size: 18px;
  font-weight: 700;
  color: #dc2626;
  font-family: var(--ff-head);
  letter-spacing: -0.5px;
  display: block;
  margin-bottom: 3px;
}
.diag-finding {
  background: var(--cbg, #F2F1EE);
  border-left: 3px solid var(--ca, #1B6B6D);
  border-radius: 0 8px 8px 0;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.diag-finding-label {
  display: block;
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ca, #1B6B6D);
  margin-bottom: 4px;
}
.diag-loading-msg {
  text-align: center;
  padding: 40px;
  font-family: var(--ff-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cm, #5F5F5B);
}
</style>
