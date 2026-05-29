<template>
  <header class="atlas-header">
    <!-- Logo siempre visible -->
    <TensorLogo />

    <!-- Nav municipios — desktop/tablet, scrollable en tablet -->
    <nav class="header-municipios" role="navigation">
      <button
        v-for="mun in MUNICIPIOS_SHORT"
        :key="mun.nombre"
        @click="store.setMunicipio(mun.nombre); closeMobileSheet()"
        :class="[
          'mun-nav-btn',
          store.municipioActivo === mun.nombre ? 'mun-nav-btn--active' : ''
        ]"
      >{{ mun.short }}</button>
    </nav>

    <!-- Mobile: score + botón sheet -->
    <div class="header-mobile-actions">
      <div class="header-mobile-score" @click="$emit('toggle-sheet')">
        <span class="mobile-score-value" :style="{ color: scoreColor }">
          {{ regionScoreDisplay }}
        </span>
        <span class="mobile-score-label">/ 100</span>
      </div>
      <button class="sheet-toggle-btn" @click="$emit('toggle-sheet')" :aria-label="sheetOpen ? 'Cerrar panel' : 'Abrir panel'">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path v-if="!sheetOpen" d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path v-else d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Desktop: badge -->
    <div class="header-badges">
      <span class="header-badge">
        <span class="badge-dot" />
        <span class="badge-text">7,028 manzanas</span>
      </span>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useAtlasStore, MUNICIPIOS } from '~/stores/atlas'

defineProps({ sheetOpen: Boolean })
defineEmits(['toggle-sheet'])

const store = useAtlasStore()

const MUNICIPIOS_SHORT = MUNICIPIOS.map(m => ({
  nombre: m.nombre,
  short:  m.nombre === 'Todos' ? 'Todos'
        : m.nombre.replace('San ', 'S.').split(' de')[0],
}))

function closeMobileSheet() {
  // El padre maneja el estado del sheet
}

const regionScore = computed(() => {
  const all = Object.values(store.stats)
  if (!all.length) return null
  const total = all.reduce((s,v) => s+v.count, 0) || 1
  return all.reduce((s,v) => s+(v.avg?.atlas_score??0)*v.count, 0) / total
})

const regionScoreDisplay = computed(() =>
  regionScore.value != null ? Math.round(regionScore.value * 100) : '—'
)

const scoreColor = computed(() => {
  const n = regionScore.value ?? 0
  if (n >= 0.70) return '#66bd63'
  if (n >= 0.40) return '#fdae61'
  return '#f46d43'
})
</script>

<style scoped>
.atlas-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 30;
  height: var(--atlas-header-h, 52px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: #FFFFFF;
  border-bottom: 1px solid var(--cb, #E5E5E0);
}

/* Nav municipios */
.header-municipios {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.header-municipios::-webkit-scrollbar { display: none; }

.mun-nav-btn {
  padding: 5px 9px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--cm, #5F5F5B);
  transition: all 0.15s;
  flex-shrink: 0;
}
.mun-nav-btn:hover {
  color: var(--c1, #1A1A1A);
  background: rgba(0,0,0,0.04);
}
.mun-nav-btn--active {
  background: rgba(27,107,109,0.12);
  color: var(--ca, #1B6B6D);
  border-color: rgba(27,107,109,0.3);
}

/* Mobile: score + botón sheet */
.header-mobile-actions {
  display: none;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.header-mobile-score {
  display: flex;
  align-items: baseline;
  gap: 3px;
  cursor: pointer;
}
.mobile-score-value {
  font-family: var(--ff-head);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.4px;
  line-height: 1;
}
.mobile-score-label {
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--cm, #5F5F5B);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.sheet-toggle-btn {
  width: 36px; height: 36px;
  border-radius: 8px;
  border: 1px solid var(--cb, #E5E5E0);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c1, #1A1A1A);
  transition: background 0.15s;
}
.sheet-toggle-btn:active { background: var(--cbg, #F2F1EE); }

/* Badges desktop */
.header-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.header-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--cbg, #F2F1EE);
  border: 1px solid var(--cb, #E5E5E0);
}
.badge-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--ca, #1B6B6D);
  animation: pulse 2s infinite;
}
.badge-text {
  font-family: var(--ff-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cm, #5F5F5B);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Mobile */
@media (max-width: 639px) {
  .header-municipios { display: none; }
  .header-badges { display: none; }
  .header-mobile-actions { display: flex; }
}
</style>
