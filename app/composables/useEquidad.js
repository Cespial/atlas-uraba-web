// useEquidad.js — carga única y compartida de equidad_municipios.json.
// Fail-quiet: si el archivo no existe o falla la red, equidad queda null y
// los consumidores ocultan su UI (mismo patrón defensivo que stats).
import { ref } from 'vue'

const equidad = ref(null)
let started = false

export function useEquidad() {
  if (!started && import.meta.client) {
    started = true
    fetch('/data/equidad_municipios.json')
      .then(r => (r.ok ? r.json() : null))
      .then(j => { equidad.value = j })
      .catch(() => { equidad.value = null })
  }
  return { equidad }
}
