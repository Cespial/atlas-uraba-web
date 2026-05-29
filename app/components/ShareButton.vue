<template>
  <button class="share-btn" @click="share" :title="'Compartir vista actual'">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <circle cx="13" cy="3" r="2" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="3"  cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="13" cy="13" r="2" stroke="currentColor" stroke-width="1.5"/>
      <line x1="5" y1="7"  x2="11" y2="4"  stroke="currentColor" stroke-width="1.2"/>
      <line x1="5" y1="9"  x2="11" y2="12" stroke="currentColor" stroke-width="1.2"/>
    </svg>
    <span class="share-label">{{ copied ? '¡Copiado!' : 'Compartir' }}</span>

    <!-- Toast de confirmación -->
    <Transition name="toast">
      <div v-if="copied" class="share-toast">
        URL copiada al portapapeles
      </div>
    </Transition>
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAtlasStore } from '~/stores/atlas'

const store  = useAtlasStore()
const router = useRouter()
const copied = ref(false)

async function share() {
  const params = new URLSearchParams()

  // Estado del mapa
  if (store.municipioActivo !== 'Todos')
    params.set('mun', store.municipioActivo)
  if (store.dimension !== 'atlas_score')
    params.set('dim', store.dimension)
  if (store.filterMin > 0)
    params.set('smin', Math.round(store.filterMin * 100).toString())
  if (store.filterMax < 1)
    params.set('smax', Math.round(store.filterMax * 100).toString())

  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`

  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  } catch(e) {
    // Fallback: seleccionar texto
    const el = document.createElement('textarea')
    el.value = url
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  }
}
</script>

<style scoped>
.share-btn {
  position: absolute;
  /* Bajo SatelliteToggle: header(52px) + 130px (controles zoom) + 38px (sat-toggle h) + 8px gap */
  top: calc(var(--atlas-header-h, 52px) + 176px);
  right: 12px;
  z-index: 20;
  display: flex; align-items: center; gap: 5px;
  padding: 6px 10px; border-radius: 8px;
  background: rgba(22,27,34,0.92); backdrop-filter: blur(8px);
  border: 1px solid #30363D; color: #8B949E;
  font-family: var(--ff-mono); font-size: 9px;
  text-transform: uppercase; letter-spacing: 0.1em;
  cursor: pointer; transition: all 0.15s;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.share-btn:hover { border-color: var(--ca,#1B6B6D); color: var(--ca,#1B6B6D); }

/* Mobile: ajuste de posición */
@media (max-width: 639px) {
  .share-btn {
    top: calc(var(--atlas-header-h, 48px) + 176px);
    right: 8px;
  }
  .share-label { display: none; }
}

.share-toast {
  position: absolute; bottom: calc(100% + 8px); left: 50%;
  transform: translateX(-50%); white-space: nowrap;
  background: var(--ca,#1B6B6D); color: #fff;
  padding: 5px 10px; border-radius: 6px;
  font-size: 10px; font-family: var(--ff-mono);
  box-shadow: 0 4px 12px rgba(27,107,109,0.4);
  pointer-events: none;
}
.share-toast::after {
  content: ''; position: absolute; top: 100%; left: 50%;
  transform: translateX(-50%); border: 4px solid transparent;
  border-top-color: var(--ca,#1B6B6D);
}

.toast-enter-active, .toast-leave-active { transition: all .2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(4px); }
</style>
