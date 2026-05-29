<template>
  <div class="layer-toggle">
    <div class="lt-label">Capas</div>
    <div class="lt-group">
      <button
        v-for="layer in layers"
        :key="layer.id"
        class="lt-btn"
        :class="{ 'lt-btn--active': activeLayers.has(layer.id) }"
        :title="layer.label"
        @click="$emit('toggle', layer.id)"
      >
        <span class="lt-icon" :style="{ background: layer.color }" />
        <span class="lt-text">{{ layer.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeLayers: {
    type: Object, // Set
    default: () => new Set(),
  },
})
defineEmits(['toggle'])

const layers = [
  { id: 'veredas',    label: 'Veredas',     color: 'rgba(255,255,255,0.18)' },
  { id: 'municipios', label: 'Municipios',   color: 'rgba(255,255,255,0.40)' },
  { id: 'reps',       label: 'Salud (REPS)', color: '#3B82F6' },
  { id: 'simat',      label: 'Educ. (SIMAT)', color: '#F59E0B' },
]
</script>

<style scoped>
.layer-toggle {
  position: absolute;
  bottom: 40px;
  left: calc(var(--atlas-panel-w, 320px) + 12px);
  z-index: 20;
  background: var(--dk-panel, #161B22);
  border: 1px solid var(--dk-border, #30363D);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  min-width: 148px;
}

.lt-label {
  font-family: var(--ff-mono);
  font-size: 7px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ca, #1B6B6D);
  padding: 0 2px 4px;
  border-bottom: 1px solid var(--dk-border, #30363D);
  margin-bottom: 2px;
}

.lt-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lt-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 6px;
  border-radius: 5px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  width: 100%;
}

.lt-btn:hover {
  background: rgba(255,255,255,0.06);
  border-color: var(--dk-border, #30363D);
}

.lt-btn--active {
  background: rgba(27, 107, 109, 0.15);
  border-color: rgba(27, 107, 109, 0.35);
}

.lt-icon {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
  transition: opacity 0.15s ease;
}

.lt-btn:not(.lt-btn--active) .lt-icon {
  opacity: 0.35;
}

.lt-text {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--dk-border, #8B949E);
  white-space: nowrap;
  transition: color 0.15s ease;
}

.lt-btn:hover .lt-text,
.lt-btn--active .lt-text {
  color: #E6EDF3;
}

/* Mobile: esquina inferior izquierda, justo encima del sheet */
@media (max-width: 639px) {
  .layer-toggle {
    bottom: calc(var(--sheet-peek, 80px) + 8px);
    left: 8px;
  }
}
/* Tablet: ajustar al sidebar más estrecho */
@media (min-width: 640px) and (max-width: 1023px) {
  .layer-toggle {
    left: calc(260px + 12px);
  }
}
</style>
