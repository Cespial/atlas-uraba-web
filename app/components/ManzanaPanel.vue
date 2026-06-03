<template>
  <Transition name="slide-up">
    <!-- En mobile el MobileSheet muestra el detalle; este panel solo en tablet+ -->
    <div
      v-if="store.manzanaSeleccionada"
      class="absolute bottom-9 z-20 hidden sm:block"
      :style="{ left: 'calc(var(--atlas-panel-w) + 16px)', right: '16px', maxWidth: '440px' }"
    >
      <div class="bg-white border border-tensor-border rounded-2xl shadow-2xl overflow-hidden">
        <!-- Header: borde izquierdo teal estilo card accent Tensor -->
        <div class="border-l-[3px] border-tensor-teal pl-4 pr-4 pt-4 pb-3 bg-tensor-bg">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <span
                  class="px-1.5 py-0.5 rounded font-mono text-[8px] uppercase tracking-[0.12em] font-medium"
                  :style="zonaStyle(p.zona_atlas)"
                >{{ p.zona_atlas || '—' }}</span>
                <span class="font-mono text-[8px] uppercase tracking-[0.1em] text-tensor-muted">{{ p.quintil || '—' }}</span>
              </div>
              <h3 class="font-head font-semibold text-[16px] tracking-[-0.32px] text-tensor-text">
                {{ p.municipio }}
              </h3>
              <p class="font-mono text-[8px] text-tensor-muted mt-0.5 tracking-[0.05em]">
                {{ (p.cod_manzana || '').slice(-12) }}
              </p>
            </div>
            <div class="text-right">
              <div
                class="font-head font-semibold text-[32px] tracking-[-0.64px] leading-none"
                :style="{ color: scoreColor(p.atlas_score) }"
              >{{ Math.round((+p.atlas_score||0) * 100) }}</div>
              <div class="font-mono text-[8px] uppercase tracking-[0.18em] text-tensor-muted mt-1">
                Bienestar
              </div>
            </div>
          </div>
          <!-- Barra global -->
          <div class="mt-3 bg-tensor-border rounded-full h-1.5 overflow-hidden">
            <div
              class="h-1.5 rounded-full transition-all duration-700"
              :style="{ width: Math.round((+p.atlas_score||0)*100)+'%', background: scoreColor(p.atlas_score) }"
            />
          </div>
        </div>

        <!-- Dimensiones -->
        <div class="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
          <div v-for="dim in dimensiones" :key="dim.key">
            <div class="flex justify-between items-center mb-1">
              <span class="font-mono text-[8px] uppercase tracking-[0.1em] text-tensor-muted">
                {{ dim.label.split(' ')[0] }}
              </span>
              <span class="font-mono text-[10px] font-medium" :style="{ color: dim.color }">
                {{ Math.round((+(p[dim.key])||0) * 100) }}
              </span>
            </div>
            <div class="bg-tensor-border rounded-full h-1 overflow-hidden">
              <div
                class="h-1 rounded-full transition-all duration-500"
                :style="{ width: Math.round((+(p[dim.key])||0)*100)+'%', background: dim.color }"
              />
            </div>
          </div>
        </div>

        <!-- Indicadores v2 (GHSL + NDVI) — solo si disponibles -->
        <div v-if="hasV2" class="px-4 py-2.5 border-t border-tensor-border">
          <div class="flex items-center gap-1.5 mb-2">
            <span class="font-mono text-[7px] uppercase tracking-[0.18em] text-cyan-500">Indicadores v2</span>
            <span class="px-1 py-px rounded font-mono text-[6px] uppercase tracking-[0.1em]
                         bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">GHSL · NDVI</span>
          </div>
          <div class="grid grid-cols-3 gap-x-3 gap-y-1.5">
            <div v-for="dim in dimensionesV2" :key="dim.key">
              <div class="flex justify-between items-center mb-0.5">
                <span class="font-mono text-[7px] text-tensor-muted">{{ dim.shortLabel }}</span>
                <span class="font-mono text-[9px] font-medium" :style="{ color: dim.color }">
                  {{ Math.round((+(p[dim.key])||0) * 100) }}
                </span>
              </div>
              <div class="bg-tensor-border rounded-full h-0.5 overflow-hidden">
                <div
                  class="h-0.5 rounded-full"
                  :style="{ width: Math.round((+(p[dim.key])||0)*100)+'%', background: dim.color }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer: Moran I -->
        <div class="px-4 py-2.5 border-t border-tensor-border flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div>
              <div class="font-mono text-[7px] uppercase tracking-[0.15em] text-tensor-muted">Moran's I</div>
              <div class="font-mono text-[11px] font-medium text-tensor-body mt-0.5">
                {{ (+p.moran_i||0).toFixed(4) }}
              </div>
            </div>
            <div class="w-px h-5 bg-tensor-border" />
            <div>
              <div class="font-mono text-[7px] uppercase tracking-[0.15em] text-tensor-muted">Fuente</div>
              <div class="font-mono text-[9px] text-tensor-body mt-0.5">CNPV 2018</div>
            </div>
          </div>
          <button
            @click="store.clearManzana()"
            class="w-6 h-6 rounded-full flex items-center justify-center
                   text-tensor-muted hover:text-tensor-text hover:bg-tensor-bg
                   transition-colors font-medium text-sm"
          >×</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore, DIMENSIONES } from '~/stores/atlas'

const store = useAtlasStore()
const dimensiones = DIMENSIONES.filter(d => d.key !== 'atlas_score' && !d.v2)
const p = computed(() => store.manzanaSeleccionada || {})

// Indicadores v2 disponibles cuando el feature proviene de atlas_enriquecido
const hasV2 = computed(() => p.value.atlas_score_v2 != null)
const dimensionesV2 = [
  { key: 'atlas_score_v2',        shortLabel: 'Atlas v2',  color: '#06b6d4' },
  { key: 'score_accesibilidad_v2',shortLabel: 'Acces. v2', color: '#38bdf8' },
  { key: 'score_ambiental_v2',    shortLabel: 'Ambient. v2', color: '#4ade80' },
  { key: 'score_ndvi',            shortLabel: 'NDVI',      color: '#86efac' },
  { key: 'impermeabilizacion',    shortLabel: 'Impermeab.',color: '#7dd3fc' },
  { key: 'proxy_luminosidad',     shortLabel: 'Luminosidad',color: '#fde68a' },
]

function scoreColor(v) {
  const n = +(v||0)
  if (n >= 0.85) return '#1a9850'
  if (n >= 0.70) return '#66bd63'
  if (n >= 0.55) return '#a6d96a'
  if (n >= 0.40) return '#fdae61'
  if (n >= 0.20) return '#f46d43'
  return '#d73027'
}

const zonaColors = { HH: '#1a9641', LL: '#d7191c', HL: '#f39c12', LH: '#3498db', NS: '#5F5F5B' }
function zonaStyle(z) {
  const c = zonaColors[z] || '#5F5F5B'
  return { background: c + '18', color: c, border: `1px solid ${c}44` }
}
</script>
