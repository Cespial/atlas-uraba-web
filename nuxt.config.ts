export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  css: [
    'maplibre-gl/dist/maplibre-gl.css',
    '~/assets/css/main.css',
  ],
  app: {
    head: {
      title: 'Atlas Urabá — Bienestar Humano Territorial',
      htmlAttrs: { lang: 'es' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Índice de bienestar humano territorial por manzana para Urabá, Antioquia, Colombia. 7,028 manzanas · 8 municipios · 10 indicadores.' },
        { property: 'og:title', content: 'Atlas Urabá — Bienestar Humano Territorial' },
        { property: 'og:description', content: 'Plataforma interactiva de indicadores de bienestar por manzana para Urabá, Antioquia.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://uraba.tensor.lat' },
        { name: 'theme-color', content: '#0D1117' },
      ],
      link: [
        { rel: 'canonical', href: 'https://uraba.tensor.lat' },
      ],
    },
  },
  vite: {
    optimizeDeps: { include: ['maplibre-gl', 'pmtiles'] },
  },
  tailwindcss: { exposeConfig: true },
})
