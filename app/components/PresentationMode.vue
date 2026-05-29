<template>
  <button
    class="pres-btn"
    :class="{ 'pres-btn--active': active }"
    @click="toggle"
    :title="active ? 'Salir (Esc)' : 'Modo presentación'"
  >
    <svg v-if="!active" width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
    <svg v-else width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M2 6h4V2M14 6h-4V2M2 10h4v4M14 10h-4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <span class="pres-label">{{ active ? 'Salir' : 'Presentar' }}</span>
  </button>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const active = ref(false)

function toggle() {
  active.value = !active.value
  if (active.value) {
    document.documentElement.requestFullscreen?.().catch(() => {})
    document.body.classList.add('presentation-mode')
  } else {
    if (document.fullscreenElement) document.exitFullscreen?.()
    document.body.classList.remove('presentation-mode')
    active.value = false
  }
}

function onKey(e) {
  if (e.key === 'Escape' && active.value) {
    document.body.classList.remove('presentation-mode')
    active.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && active.value) {
      document.body.classList.remove('presentation-mode')
      active.value = false
    }
  })
})
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
.pres-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 10px; border-radius: 8px;
  background: rgba(22,27,34,0.92); backdrop-filter: blur(8px);
  border: 1px solid #30363D; color: #8B949E;
  font-family: var(--ff-mono); font-size: 9px;
  text-transform: uppercase; letter-spacing: 0.1em;
  cursor: pointer; transition: all 0.15s;
}
.pres-btn:hover { border-color: var(--ca,#1B6B6D); color: var(--ca,#1B6B6D); }
.pres-btn--active { background: var(--ca,#1B6B6D); color: #fff; border-color: var(--ca,#1B6B6D); }
</style>
