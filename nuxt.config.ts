// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  css: ['maplibre-gl/dist/maplibre-gl.css'],
  app: {
    head: {
      title: 'Atlas Urabá — Bienestar Humano Territorial',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Índice de bienestar humano territorial por manzana para Urabá, Antioquia, Colombia' },
      ],
    },
  },
  vite: {
    optimizeDeps: {
      include: ['maplibre-gl'],
    },
  },
})
