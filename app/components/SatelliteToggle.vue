<template>
  <button
    class="sat-toggle"
    :class="modeClass"
    :title="modeTitle"
    @click="$emit('toggle')"
  >
    <!-- Modo 0: Dark — icono luna/noche -->
    <svg
      v-if="effectiveMode === 0"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>

    <!-- Modo 1: Satélite — icono satélite orbital -->
    <svg
      v-else-if="effectiveMode === 1"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" />
      <line x1="7.76" y1="16.24" x2="4.93" y2="19.07" />
    </svg>

    <!-- Modo 2: Calles claras — icono mapa -->
    <svg
      v-else
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>

    <span class="sat-label">{{ modeLabel }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // modo numérico: 0=Dark, 1=Satélite, 2=Calles
  mapMode: {
    type:    Number,
    default: 0,
  },
  // compatibilidad retroactiva — si solo llega isSatellite boolean
  isSatellite: {
    type:    Boolean,
    default: false,
  },
})

defineEmits(['toggle'])

const effectiveMode = computed(() => {
  // Si el padre pasa mapMode explícito, usarlo; si no, derivar de isSatellite legacy
  if (props.mapMode !== 0) return props.mapMode
  return props.isSatellite ? 1 : 0
})

const modeLabel = computed(() => {
  const labels = ['Satélite', 'Calles', 'Dark']
  return labels[effectiveMode.value]
})

const modeTitle = computed(() => {
  const titles = [
    'Cambiar a vista satélite',
    'Cambiar a calles claras',
    'Cambiar a mapa oscuro',
  ]
  return titles[effectiveMode.value]
})

const modeClass = computed(() => {
  return {
    'sat-toggle--satellite': effectiveMode.value === 1,
    'sat-toggle--streets':   effectiveMode.value === 2,
  }
})
</script>

<style scoped>
.sat-toggle {
  position: absolute;
  top: calc(var(--atlas-header-h, 52px) + 130px);
  right: 12px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  background: var(--dk-panel, #161B22);
  border: 1px solid var(--dk-border, #30363D);
  border-radius: 8px;
  cursor: pointer;
  color: #8B949E;
  transition: all 0.15s ease;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

.sat-toggle:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.2);
  color: #E6EDF3;
}

/* Modo 1 — Satélite activo */
.sat-toggle--satellite {
  background: rgba(27, 107, 109, 0.2);
  border-color: rgba(27, 107, 109, 0.5);
  color: var(--ca, #1B6B6D);
}

/* Modo 2 — Calles claras activo */
.sat-toggle--streets {
  background: rgba(99, 132, 200, 0.2);
  border-color: rgba(99, 132, 200, 0.5);
  color: #6384C8;
}

.sat-label {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 639px) {
  .sat-toggle {
    top: calc(var(--atlas-header-h, 48px) + 130px);
    right: 8px;
    padding: 7px;
  }
  .sat-label { display: none; }
}
</style>
