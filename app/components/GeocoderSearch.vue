<template>
  <div class="geocoder" :class="{ 'geocoder--open': open }">
    <!-- Trigger -->
    <button class="geo-trigger" @click="open = !open" :title="open ? 'Cerrar búsqueda' : 'Buscar lugar'">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
        <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span class="geo-trigger-label">Buscar</span>
    </button>

    <!-- Panel de búsqueda -->
    <Transition name="geo-slide">
      <div v-if="open" class="geo-panel">
        <input
          ref="inputRef"
          v-model="query"
          class="geo-input"
          placeholder="Barrio, vereda, municipio..."
          @input="onInput"
          @keydown.esc="close"
          @keydown.enter="selectFirst"
          autocomplete="off"
          spellcheck="false"
        />

        <!-- Resultados -->
        <div v-if="loading" class="geo-loading">
          <span class="geo-spinner" />
          <span>Buscando...</span>
        </div>

        <ul v-else-if="results.length" class="geo-results">
          <li
            v-for="r in results"
            :key="r.place_id"
            class="geo-result"
            @click="selectResult(r)"
          >
            <svg class="geo-pin" width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="4" r="2.5" fill="currentColor" opacity="0.6"/>
              <path d="M5 10 C5 10 1.5 6.5 1.5 4a3.5 3.5 0 0 1 7 0C8.5 6.5 5 10 5 10Z" stroke="currentColor" stroke-width="1" fill="none"/>
            </svg>
            <div class="geo-result-info">
              <span class="geo-result-name">{{ r.display_name.split(',')[0] }}</span>
              <span class="geo-result-sub">{{ r.display_name.split(',').slice(1,3).join(',').trim() }}</span>
            </div>
          </li>
        </ul>

        <div v-else-if="query.length > 2 && !loading" class="geo-empty">
          Sin resultados en Urabá
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['fly-to'])

const open     = ref(false)
const query    = ref('')
const results  = ref([])
const loading  = ref(false)
const inputRef = ref(null)
let   debounce = null

function close() {
  open.value = false
  query.value = ''
  results.value = []
}

watch(open, async (v) => {
  if (v) {
    await nextTick()
    inputRef.value?.focus()
  }
})

function onInput() {
  clearTimeout(debounce)
  if (query.value.length < 2) { results.value = []; return }
  loading.value = true
  debounce = setTimeout(search, 400)
}

async function search() {
  if (query.value.length < 2) { loading.value = false; return }
  try {
    const q = encodeURIComponent(query.value + ', Urabá, Antioquia, Colombia')
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&countrycodes=co&viewbox=-77.2,7.3,-75.8,8.8&bounded=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
    const data = await res.json()
    results.value = data
  } catch(e) {
    results.value = []
  } finally {
    loading.value = false
  }
}

function selectResult(r) {
  emit('fly-to', { lat: +r.lat, lng: +r.lon, zoom: 14, name: r.display_name.split(',')[0] })
  close()
}

function selectFirst() {
  if (results.value.length) selectResult(results.value[0])
}

// Cerrar al hacer click fuera
function onClickOutside(e) {
  if (!e.target.closest('.geocoder')) close()
}
onMounted(() => document.addEventListener('click', onClickOutside, true))
onUnmounted(() => document.removeEventListener('click', onClickOutside, true))
</script>

<style scoped>
.geocoder {
  position: absolute;
  top: calc(var(--atlas-header-h, 52px) + 10px);
  left: calc(var(--atlas-panel-w, 320px) + 12px);
  z-index: 25;
}

@media (max-width: 639px) {
  .geocoder { left: 8px; top: calc(var(--atlas-header-h, 48px) + 8px); }
}
@media (min-width: 640px) and (max-width: 1023px) {
  .geocoder { left: calc(260px + 12px); }
}

.geo-trigger {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 10px; border-radius: 8px;
  background: rgba(22,27,34,0.92); backdrop-filter: blur(8px);
  border: 1px solid #30363D; color: #8B949E;
  font-family: var(--ff-mono); font-size: 9px;
  text-transform: uppercase; letter-spacing: 0.1em;
  cursor: pointer; transition: all 0.15s;
}
.geo-trigger:hover, .geocoder--open .geo-trigger {
  border-color: var(--ca, #1B6B6D); color: var(--ca, #1B6B6D);
}

.geo-panel {
  position: absolute; top: calc(100% + 6px); left: 0;
  width: 280px; background: rgba(22,27,34,0.97);
  backdrop-filter: blur(12px);
  border: 1px solid #30363D; border-radius: 10px;
  overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.geo-input {
  width: 100%; padding: 10px 12px;
  background: transparent; border: none;
  border-bottom: 1px solid #30363D;
  color: #E6EDF3; font-family: var(--ff-body); font-size: 13px;
  outline: none;
}
.geo-input::placeholder { color: #555; }

.geo-loading {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; color: #8B949E;
  font-family: var(--ff-mono); font-size: 9px;
  text-transform: uppercase; letter-spacing: 0.1em;
}
.geo-spinner {
  width: 10px; height: 10px; border-radius: 50%;
  border: 1.5px solid #1B6B6D; border-top-color: transparent;
  animation: spin 0.6s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

.geo-results { list-style: none; margin: 0; padding: 4px; }

.geo-result {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 10px; border-radius: 6px; cursor: pointer;
  transition: background 0.1s;
}
.geo-result:hover { background: rgba(255,255,255,0.06); }

.geo-pin { color: var(--ca, #1B6B6D); flex-shrink: 0; margin-top: 2px; }

.geo-result-name {
  display: block; font-family: var(--ff-body); font-size: 12px;
  color: #E6EDF3; font-weight: 500;
}
.geo-result-sub {
  display: block; font-family: var(--ff-mono); font-size: 9px;
  color: #8B949E; letter-spacing: 0.05em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.geo-empty {
  padding: 10px 12px; font-family: var(--ff-mono); font-size: 9px;
  text-transform: uppercase; letter-spacing: 0.1em; color: #555;
}

.geo-slide-enter-active, .geo-slide-leave-active { transition: all .2s ease; }
.geo-slide-enter-from, .geo-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
