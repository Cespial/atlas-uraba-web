<template>
  <div class="panorama-panel">
    <!-- Header -->
    <div class="pano-header">
      <div class="pano-title">
        <span class="pano-name">{{ store.municipioActivo }}</span>
        <span class="pano-vs">vs</span>
        <span class="pano-region">Urabá</span>
      </div>
      <div class="pano-score">
        <span class="pano-score-num" :style="{ color: scoreColor(munScore) }">
          {{ munScore != null ? Math.round(munScore * 100) : '—' }}
        </span>
        <span class="pano-score-unit">/100</span>
      </div>
    </div>

    <!-- Radar chart -->
    <div class="pano-chart-wrap" v-if="chartData">
      <Radar :data="chartData" :options="chartOptions" />
    </div>

    <!-- Tabla de dimensiones -->
    <div class="pano-table">
      <div
        v-for="dim in dimensiones"
        :key="dim.key"
        class="pano-row"
      >
        <div class="pano-row-header">
          <span class="pano-dim-dot" :style="{ background: dim.color }" />
          <span class="pano-dim-name">{{ dim.label }}</span>
        </div>
        <div class="pano-bars">
          <!-- Municipio -->
          <div class="pano-bar-wrap">
            <div class="pano-bar-label">{{ store.municipioActivo.split(' ')[0] }}</div>
            <div class="pano-bar-track">
              <div
                class="pano-bar-fill"
                :style="{
                  width: Math.round((munStats?.avg?.[dim.key] ?? 0) * 100) + '%',
                  background: dim.color
                }"
              />
            </div>
            <div class="pano-bar-val" :style="{ color: dim.color }">
              {{ munStats?.avg?.[dim.key] != null ? Math.round(munStats.avg[dim.key] * 100) : '—' }}
            </div>
          </div>
          <!-- Región -->
          <div class="pano-bar-wrap pano-bar-region">
            <div class="pano-bar-label">Urabá</div>
            <div class="pano-bar-track">
              <div
                class="pano-bar-fill pano-bar-fill--region"
                :style="{ width: Math.round((regionStats?.[dim.key] ?? 0) * 100) + '%' }"
              />
            </div>
            <div class="pano-bar-val pano-bar-val--region">
              {{ regionStats?.[dim.key] != null ? Math.round(regionStats[dim.key] * 100) : '—' }}
            </div>
          </div>
        </div>
        <!-- Delta -->
        <div
          class="pano-delta"
          :class="delta(dim.key) >= 0 ? 'pano-delta--pos' : 'pano-delta--neg'"
        >
          {{ delta(dim.key) >= 0 ? '+' : '' }}{{ delta(dim.key) }}
        </div>
      </div>
    </div>

    <!-- Footer nota -->
    <div class="pano-footer">
      Score 0-100 · Fuentes: CNPV 2018, REPS, SIMAT, OSM
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { useAtlasStore, DIMENSIONES } from '~/stores/atlas'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const store = useAtlasStore()
const dimensiones = DIMENSIONES.filter(d => d.key !== 'atlas_score')

// Stats del municipio activo
const munStats = computed(() => {
  const m = store.municipioActivo
  return m !== 'Todos' ? store.stats[m] : null
})

// Stats promedio de la región
const regionStats = computed(() => {
  const all = Object.values(store.stats)
  if (!all.length) return null
  const total = all.reduce((s, v) => s + v.count, 0) || 1
  const avg = {}
  dimensiones.forEach(d => {
    avg[d.key] = all.reduce((s, v) => s + (v.avg?.[d.key] ?? 0) * v.count, 0) / total
  })
  return avg
})

const munScore = computed(() => munStats.value?.avg?.atlas_score ?? null)

function scoreColor(v) {
  const n = +(v ?? 0)
  if (n >= 0.85) return '#1B6B6D'; if (n >= 0.70) return '#1d91c0'
  if (n >= 0.55) return '#41b6c4'; if (n >= 0.40) return '#a8ddb5'
  if (n >= 0.20) return '#fdae61'; return '#f46d43'
}

function delta(key) {
  const m = munStats.value?.avg?.[key] ?? null
  const r = regionStats.value?.[key] ?? null
  if (m == null || r == null) return 0
  return Math.round((m - r) * 100)
}

// Datos del radar chart
const chartData = computed(() => {
  if (!munStats.value || !regionStats.value) return null
  return {
    labels: dimensiones.map(d => d.label.split(' ')[0]),
    datasets: [
      {
        label: store.municipioActivo,
        data: dimensiones.map(d => Math.round((munStats.value.avg?.[d.key] ?? 0) * 100)),
        backgroundColor: 'rgba(27,107,109,0.15)',
        borderColor: '#1B6B6D',
        borderWidth: 2,
        pointBackgroundColor: '#1B6B6D',
        pointRadius: 3,
      },
      {
        label: 'Urabá (promedio)',
        data: dimensiones.map(d => Math.round((regionStats.value[d.key] ?? 0) * 100)),
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.25)',
        borderWidth: 1.5,
        borderDash: [4, 2],
        pointBackgroundColor: 'rgba(255,255,255,0.3)',
        pointRadius: 2,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      labels: {
        color: '#8B949E',
        font: { family: "'JetBrains Mono'", size: 9 },
        boxWidth: 10,
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.r}/100`,
      },
    },
  },
  scales: {
    r: {
      min: 0, max: 100,
      ticks: {
        stepSize: 25,
        color: '#555',
        font: { family: "'JetBrains Mono'", size: 7 },
        backdropColor: 'transparent',
      },
      grid: { color: 'rgba(255,255,255,0.08)' },
      angleLines: { color: 'rgba(255,255,255,0.08)' },
      pointLabels: {
        color: '#8B949E',
        font: { family: "'JetBrains Mono'", size: 8 },
      },
    },
  },
}
</script>

<style scoped>
.panorama-panel { padding: 0 0 8px; }

.pano-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px 12px; border-bottom: 1px solid var(--cb, #E5E5E0); margin-bottom: 12px;
}
.pano-title { display: flex; align-items: baseline; gap: 5px; }
.pano-name { font-family: var(--ff-head); font-size: 15px; font-weight: 600; letter-spacing: -0.3px; color: var(--c1, #1A1A1A); }
.pano-vs { font-family: var(--ff-mono); font-size: 8px; color: var(--cm, #5F5F5B); text-transform: uppercase; }
.pano-region { font-family: var(--ff-mono); font-size: 10px; color: var(--cm, #5F5F5B); }
.pano-score { text-align: right; }
.pano-score-num { font-family: var(--ff-head); font-size: 28px; font-weight: 700; letter-spacing: -0.56px; line-height: 1; }
.pano-score-unit { font-family: var(--ff-mono); font-size: 9px; color: var(--cm, #5F5F5B); text-transform: uppercase; letter-spacing: 0.1em; }

.pano-chart-wrap { padding: 0 8px 12px; }

.pano-table { display: flex; flex-direction: column; gap: 10px; padding: 0 16px 8px; }

.pano-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
.pano-row-header { display: flex; align-items: center; gap: 5px; grid-column: 1; }
.pano-dim-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.pano-dim-name { font-family: var(--ff-mono); font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--cm, #5F5F5B); }

.pano-bars { grid-column: 1; display: flex; flex-direction: column; gap: 3px; margin-top: 3px; }
.pano-bar-wrap { display: flex; align-items: center; gap: 4px; }
.pano-bar-label { font-family: var(--ff-mono); font-size: 7px; color: var(--cm, #5F5F5B); width: 40px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pano-bar-track { flex: 1; height: 4px; background: var(--cb, #E5E5E0); border-radius: 2px; overflow: hidden; }
.pano-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
.pano-bar-fill--region { background: rgba(0,0,0,0.15); }
.pano-bar-val { font-family: var(--ff-mono); font-size: 9px; font-weight: 600; width: 22px; text-align: right; flex-shrink: 0; }
.pano-bar-val--region { color: var(--cm, #5F5F5B); font-weight: 400; }
.pano-bar-region { opacity: 0.7; }

.pano-delta { grid-column: 2; grid-row: 1 / 3; font-family: var(--ff-mono); font-size: 10px; font-weight: 600; text-align: right; }
.pano-delta--pos { color: #1B6B6D; }
.pano-delta--neg { color: #d73027; }

.pano-footer { padding: 8px 16px 0; font-family: var(--ff-mono); font-size: 7px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--cm, #5F5F5B); border-top: 1px solid var(--cb, #E5E5E0); }
</style>
