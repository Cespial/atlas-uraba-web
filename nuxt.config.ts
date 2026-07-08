export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  // SSR + Vercel serverless: necesario para que las rutas server/api/** (API
  // pública REST de FASE 4) se desplieguen como funciones, no como sitio estático.
  nitro: {
    preset: 'vercel',
    // El proyecto en Vercel construye con `nuxt generate` (vercel-static), así
    // que las rutas dinámicas deben prerenderizarse explícitamente o darán 404
    // en producción. Los datos del brief cargan client-side (server:false),
    // por lo que el HTML prerenderizado es solo el shell — suficiente.
    prerender: {
      routes: [
        '/brief/apartado', '/brief/turbo', '/brief/chigorodo', '/brief/carepa',
        '/brief/necocli', '/brief/arboletes', '/brief/san-pedro-de-uraba',
        '/brief/san-juan-de-uraba',
        // API pública REST (FASE 4, Tarea 1.2): server/api/uraba/** sólo se
        // sirve en runtime SSR; en `nuxt generate` cada ruta debe listarse
        // aquí para prerenderizarse como archivo estático. Se excluye
        // /api/uraba/manzana/[cod] (7.028 posibles códigos, inviable
        // estático) — ver nota en app/pages/api.vue.
        // Se pide con "/" final: como "/api/uraba" es a la vez ruta y prefijo
        // de sus hijas (municipios, ranking, municipio/*), Nitro necesita
        // escribirla como archivo "uraba/index" (no "uraba" a secas) para no
        // chocar con el directorio "uraba/" que requieren sus hijas. La regla
        // de rewrite en vercel.json expone la URL final limpia "/api/uraba".
        '/api/uraba/', '/api/uraba/municipios', '/api/uraba/ranking',
        // /api/uraba/municipio/{nombre}: el handler normaliza acentos/mayúsculas,
        // pero el prerender debe pedir la ruta EXACTA (URL-encoded) para que
        // Nitro la escriba como archivo. Se usa el nombre canónico acentuado.
        '/api/uraba/municipio/Apartad%C3%B3',
        '/api/uraba/municipio/Turbo',
        '/api/uraba/municipio/Chigorod%C3%B3',
        '/api/uraba/municipio/Carepa',
        '/api/uraba/municipio/Necocl%C3%AD',
        '/api/uraba/municipio/Arboletes',
        '/api/uraba/municipio/San%20Pedro%20de%20Urab%C3%A1',
        '/api/uraba/municipio/San%20Juan%20de%20Urab%C3%A1',
      ],
    },
    // Empaqueta sólo los JSON/GeoJSON que la API REST (FASE 4) lee en runtime
    // como server assets, de modo que viajen DENTRO del bundle de la función
    // serverless (se leen vía useStorage('assets:data'), no por filesystem).
    // Se evita arrastrar los 100MB+ de pmtiles/geojson pesados de public/data.
    serverAssets: [
      { baseName: 'data', dir: 'server/assets/data' },
    ],
  },
  // /comparar y /simulador son herramientas interactivas client-heavy: se
  // renderizan como SPA (ssr:false) para evitar hydration mismatches por los
  // datos que cargan sólo en cliente. La home y la API siguen con SSR.
  routeRules: {
    '/comparar': { ssr: false },
    '/simulador': { ssr: false },
  },
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
        { property: 'og:image', content: 'https://uraba.tensor.lat/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Atlas Urabá — Mapa de bienestar humano territorial' },
        { property: 'og:locale', content: 'es_CO' },
        { property: 'og:site_name', content: 'Atlas Urabá' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@tensorlat' },
        { name: 'twitter:title', content: 'Atlas Urabá — Bienestar Humano Territorial' },
        { name: 'twitter:description', content: 'Plataforma interactiva de indicadores de bienestar por manzana para Urabá, Antioquia.' },
        { name: 'twitter:image', content: 'https://uraba.tensor.lat/og-image.png' },
        { name: 'twitter:image:alt', content: 'Atlas Urabá — Mapa de bienestar humano territorial' },
        { name: 'robots', content: 'index, follow' },
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
