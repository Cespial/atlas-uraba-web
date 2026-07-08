<template>
  <div class="err-root">
    <div class="err-card">
      <NuxtLink to="/" class="err-logo" @click="handleError">
        <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="7" y="7" width="22" height="22" rx="2.5"
                stroke="#e7e5e0" stroke-width="1.8" stroke-opacity="0.7"
                transform="rotate(45 18 18)" />
          <rect x="12" y="12" width="12" height="12" rx="1.5"
                fill="#4fb8ba" fill-opacity="0.9"
                transform="rotate(45 18 18)" />
        </svg>
        <div class="err-brand">
          <span class="err-brand-title">Atlas Urabá</span>
          <span class="err-brand-sub">por Tensor</span>
        </div>
      </NuxtLink>

      <p class="err-code">{{ isNotFound ? '404' : (error?.statusCode ?? 'Error') }}</p>

      <h1 class="err-title">{{ isNotFound ? 'Página no encontrada' : 'Algo salió mal' }}</h1>

      <p class="err-desc">
        {{ isNotFound
          ? 'La página que buscas no existe o cambió de dirección.'
          : 'Ocurrió un error inesperado al cargar esta página. Intenta de nuevo en unos minutos.' }}
      </p>

      <button class="err-back" @click="handleError">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3L4 8l6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Volver al atlas
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  error: { type: Object, default: null },
})

const isNotFound = computed(() => props.error?.statusCode === 404)

useHead({ title: isNotFound.value ? 'Página no encontrada · Atlas Urabá' : 'Error · Atlas Urabá' })

function handleError() {
  clearError({ redirect: '/' })
}
</script>

<style scoped>
.err-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d1211;
  color: #e7e5e0;
  padding: 24px;
}
.err-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  max-width: 420px;
}
.err-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  margin-bottom: 12px;
}
.err-brand { display: flex; flex-direction: column; line-height: 1.1; text-align: left; }
.err-brand-title { font-size: 16px; font-weight: 700; color: #e7e5e0; letter-spacing: -0.02em; }
.err-brand-sub { font-family: ui-monospace, monospace; font-size: 8px; text-transform: uppercase; letter-spacing: 0.18em; color: #4fb8ba; margin-top: 2px; }

.err-code {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  letter-spacing: 0.1em;
  color: #8a8a85;
  margin: 0;
}
.err-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #e7e5e0;
}
.err-desc {
  font-size: 13.5px;
  line-height: 1.6;
  color: #a9a7a1;
  margin: 0;
}
.err-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(79,184,186,0.1);
  color: #4fb8ba;
  font-family: ui-monospace, monospace;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.err-back:hover {
  background: rgba(79,184,186,0.18);
  border-color: rgba(79,184,186,0.35);
}
</style>
