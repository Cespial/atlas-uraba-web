<template>
  <div class="layer-toggle">
    <div class="lt-header">
      <span class="lt-label">Capas</span>
    </div>
    <template v-for="group in groups" :key="group">
      <div class="lt-group-label">{{ group }}</div>
      <div class="lt-group">
        <button
          v-for="layer in layersByGroup(group)"
          :key="layer.id"
          class="lt-btn"
          :class="{ 'lt-btn--active': activeLayers.has(layer.id) }"
          :title="layer.label"
          @click="$emit('toggle', layer.id)"
        >
          <span class="lt-icon" :style="{ background: layer.color }" />
          <span class="lt-text">{{ layer.label }}</span>
          <span class="lt-status">{{ activeLayers.has(layer.id) ? '●' : '○' }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  activeLayers: {
    type: Object,
    default: () => new Set(),
  },
})
defineEmits(['toggle'])

const groups = ['Territorio', 'Productivo', 'Servicios']

function layersByGroup(group) {
  return layers.filter(l => l.group === group)
}

const layers = [
  // Contexto territorial
  { id: 'veredas',      label: 'Veredas',          color: 'rgba(255,255,255,0.25)', group: 'Territorio' },
  { id: 'municipios',   label: 'Municipios',        color: 'rgba(255,255,255,0.45)', group: 'Territorio' },
  { id: 'waterways',    label: 'Ríos',              color: '#3B82F6',                group: 'Territorio' },
  { id: 'roads',        label: 'Vías',              color: '#F97316',                group: 'Territorio' },
  // Productivo — del gemelo digital
  { id: 'sipra',        label: 'Aptitud banano',    color: '#00cc44',                group: 'Productivo' },
  { id: 'sipra-excl',   label: 'Zonas exclusión',   color: '#cc3333',                group: 'Productivo' },
  { id: 'fincas',       label: 'Fincas bananeras',  color: '#F5E642',                group: 'Productivo' },
  // Equipamientos
  { id: 'reps',         label: 'Salud (REPS)',       color: '#3B82F6',                group: 'Servicios'  },
  { id: 'simat',        label: 'Educación',          color: '#F59E0B',                group: 'Servicios'  },
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

.lt-header {
  padding: 0 2px 4px;
  border-bottom: 1px solid var(--dk-border, #30363D);
  margin-bottom: 4px;
}

.lt-label {
  font-family: var(--ff-mono);
  font-size: 7px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ca, #1B6B6D);
}

.lt-group-label {
  font-family: var(--ff-mono);
  font-size: 6px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--dk-border, #555);
  padding: 4px 2px 2px;
  margin-top: 2px;
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

.lt-status {
  margin-left: auto;
  font-size: 8px;
  color: var(--dk-border, #555);
  flex-shrink: 0;
}
.lt-btn--active .lt-status {
  color: var(--ca, #1B6B6D);
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
