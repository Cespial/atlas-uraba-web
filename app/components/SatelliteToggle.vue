<template>
  <button
    class="sat-toggle"
    :class="{ 'sat-toggle--active': isSatellite }"
    :title="isSatellite ? 'Vista vectorial' : 'Vista satélite'"
    @click="$emit('toggle')"
  >
    <svg
      v-if="!isSatellite"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Satellite icon -->
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
      <!-- Map icon -->
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
    <span class="sat-label">{{ isSatellite ? 'Vectorial' : 'Satélite' }}</span>
  </button>
</template>

<script setup>
defineProps({
  isSatellite: {
    type: Boolean,
    default: false,
  },
})
defineEmits(['toggle'])
</script>

<style scoped>
.sat-toggle {
  position: absolute;
  bottom: 48px;
  right: 168px;
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

.sat-toggle--active {
  background: rgba(27, 107, 109, 0.2);
  border-color: rgba(27, 107, 109, 0.5);
  color: var(--ca, #1B6B6D);
}

.sat-label {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* Mobile: ocultar label, solo ícono */
@media (max-width: 639px) {
  .sat-toggle {
    bottom: calc(var(--sheet-peek, 80px) + 8px);
    right: 8px;
    padding: 7px;
  }
  .sat-label { display: none; }
}
</style>
