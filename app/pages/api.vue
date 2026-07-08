<template>
  <div class="api-root">
    <header class="api-header">
      <NuxtLink to="/" class="api-back">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Volver al mapa
      </NuxtLink>
      <div class="api-title-wrap">
        <h1 class="api-title">API pública</h1>
        <span class="api-subtitle">REST · JSON · Atlas Urabá</span>
      </div>
    </header>

    <main class="api-main">
      <!-- ── INTRO ─────────────────────────────────────────────── -->
      <section class="api-block">
        <p class="api-lead">
          El Atlas Urabá expone su Índice de Bienestar (<code>atlas_score_v3</code>, metodología
          v3.1 — seguridad reconstruida sobre tasa de homicidios SIEDCO/MinDefensa) y sus 4
          dimensiones —Accesibilidad, Ambiental, Socioeconómico y Seguridad— a través de una
          API REST pública, sin necesidad de autenticación ni llave de acceso.
        </p>
        <p class="api-base">
          URL base: <code>https://uraba.tensor.lat</code>
        </p>
      </section>

      <!-- ── ENDPOINTS ─────────────────────────────────────────── -->
      <section class="api-block">
        <h2 class="api-h2"><span class="api-step">1</span> Endpoints disponibles</h2>
        <div class="api-table-wrap">
          <table class="api-table">
            <thead>
              <tr>
                <th>Método</th>
                <th>Ruta</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ep in endpoints" :key="ep.ruta">
                <td><span class="api-method">{{ ep.metodo }}</span></td>
                <td><code>{{ ep.ruta }}</code></td>
                <td>{{ ep.descripcion }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ── EJEMPLO CURL ──────────────────────────────────────── -->
      <section class="api-block">
        <h2 class="api-h2"><span class="api-step">2</span> Ejemplo — curl</h2>
        <pre class="api-code">{{ ejemploCurl }}</pre>
        <p class="api-nota">
          Los nombres de municipio llevan tilde y van codificados en la URL
          (<code>%C3%A1</code>, <code>%C3%AD</code>, <code>%C3%B3</code>, espacio → <code>%20</code>).
          El endpoint es insensible a mayúsculas/minúsculas y acentos: <code>turbo</code>,
          <code>Turbo</code> y <code>TURBO</code> resuelven igual.
        </p>
      </section>

      <!-- ── EJEMPLO RESPUESTA ─────────────────────────────────── -->
      <section class="api-block">
        <h2 class="api-h2"><span class="api-step">3</span> Ejemplo de respuesta</h2>
        <p class="api-nota api-nota--top">
          <code>GET /api/uraba/municipios</code> — respuesta real (recortada a 2 de 8 municipios):
        </p>
        <pre class="api-code">{{ ejemploJson }}</pre>
      </section>

      <!-- ── ADVERTENCIA MANZANA ───────────────────────────────── -->
      <section class="api-block api-block--warn">
        <h2 class="api-h2"><span class="api-step api-step--warn">!</span> Cobertura de la versión desplegada</h2>
        <p>
          Esta API se sirve como archivos estáticos prerenderizados (sin backend activo). Están
          disponibles el índice, el listado de municipios, el ranking y el detalle de los
          <strong>8 municipios con datos a nivel de manzana</strong> (Apartadó, Turbo, Chigorodó,
          Carepa, Necoclí, Arboletes, San Pedro de Urabá y San Juan de Urabá).
        </p>
        <p>
          <code>GET /api/uraba/manzana/&#123;cod&#125;</code> <strong>no está disponible</strong> en
          esta versión: existen 7.028 manzanas censales y prerenderizar cada una como archivo
          estático es inviable para este despliegue. Ese endpoint sólo respondería si el sitio
          corriera con un backend SSR activo (Nitro serverless), que hoy no es el caso.
        </p>
      </section>

      <!-- ── LICENCIA ──────────────────────────────────────────── -->
      <section class="api-block">
        <h2 class="api-h2"><span class="api-step">4</span> Licencia y atribución</h2>
        <p>Datos abiertos · citar Atlas Urabá · Tensor.</p>
        <p class="api-fuente">
          Fuente: DANE CNPV 2018 (manzanas y socioeconómico), Google Earth Engine / GEE (NDVI
          Sentinel-2, LST Landsat 8/9, VIIRS) y OSRM (isócronas de routing real por carretera).
        </p>
      </section>
    </main>
  </div>
</template>

<script setup>
const endpoints = [
  { metodo: 'GET', ruta: '/api/uraba/info', descripcion: 'Índice de la API (endpoints, cobertura, fórmula, fuente).' },
  { metodo: 'GET', ruta: '/api/uraba/municipios', descripcion: 'Los 8 municipios con su atlas_score_v3 y las 4 dimensiones.' },
  { metodo: 'GET', ruta: '/api/uraba/ranking', descripcion: 'Ranking de municipios ordenado por atlas_score_v3.' },
  { metodo: 'GET', ruta: '/api/uraba/municipio/{nombre}', descripcion: 'Detalle de un municipio: score, dimensiones, ranking, narrativa y top 5 manzanas.' },
  { metodo: 'GET', ruta: '/api/uraba/manzana/{cod}', descripcion: 'No disponible en esta versión estática — ver advertencia abajo.' },
]

const ejemploCurl = 'curl https://uraba.tensor.lat/api/uraba/municipio/Turbo\ncurl https://uraba.tensor.lat/api/uraba/municipio/San%20Pedro%20de%20Urab%C3%A1'

const ejemploJson = `{
  "total": 8,
  "municipios": [
    {
      "municipio": "San Juan de Urabá",
      "atlas_score_v3": 0.6581,
      "ranking": 1,
      "manzanas": 289,
      "dimensiones": {
        "accesibilidad": 0.7524,
        "ambiental": 0.5252,
        "socioeconomico": 0.4068,
        "seguridad": 0.95
      }
    },
    {
      "municipio": "Apartadó",
      "atlas_score_v3": 0.6369,
      "ranking": 2,
      "manzanas": 1659,
      "dimensiones": {
        "accesibilidad": 0.8688,
        "ambiental": 0.4002,
        "socioeconomico": 0.4915,
        "seguridad": 0.6507
      }
    }
  ],
  "fuente": "Atlas Urabá · Tensor (tensor.lat). Insumos: DANE CNPV 2018..."
}`

useHead({ title: 'API pública · Atlas Urabá' })
</script>

<style scoped>
.api-root { min-height: 100vh; background: #0d1211; color: #e7e5e0; }
.api-header { display: flex; align-items: center; gap: 20px; padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.api-back { display: inline-flex; align-items: center; gap: 6px; font-family: ui-monospace, monospace; font-size: 11px; color: #8a8a85; text-decoration: none; }
.api-back:hover { color: #e7e5e0; }
.api-title { font-size: 16px; font-weight: 700; }
.api-subtitle { font-family: ui-monospace, monospace; font-size: 10px; color: #8a8a85; letter-spacing: 0.08em; }
.api-main { max-width: 860px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 22px; }
.api-block { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 18px 20px; }
.api-block--warn { border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.06); }
.api-h2 { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.02em; margin-bottom: 12px; }
.api-step { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 999px; background: #1B6B6D; color: #fff; font-family: ui-monospace, monospace; font-size: 11px; flex: none; }
.api-step--warn { background: #f59e0b; color: #16201e; }
.api-lead { font-size: 13px; line-height: 1.6; color: #d8d6d0; }
.api-base { margin-top: 10px; font-family: ui-monospace, monospace; font-size: 11.5px; color: #8a8a85; }
.api-table-wrap { overflow-x: auto; }
.api-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.api-table th { text-align: left; font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.06em; color: #8a8a85; text-transform: uppercase; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.12); }
.api-table td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; }
.api-method { display: inline-block; padding: 2px 6px; border-radius: 4px; background: rgba(27,107,109,0.25); color: #4fb8ba; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; }
.api-table code, .api-lead code, .api-nota code { font-family: ui-monospace, monospace; font-size: 11px; color: #4fb8ba; background: rgba(27,107,109,0.12); padding: 1px 5px; border-radius: 4px; }
.api-code { font-family: ui-monospace, monospace; font-size: 11.5px; line-height: 1.6; color: #d8d6d0; background: #0a0e0d; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px 16px; overflow-x: auto; white-space: pre; }
.api-nota { margin-top: 10px; font-size: 11.5px; line-height: 1.6; color: #8a8a85; }
.api-nota--top { margin-top: 0; margin-bottom: 10px; }
.api-block--warn p { font-size: 12.5px; line-height: 1.6; margin-bottom: 8px; }
.api-block--warn p:last-child { margin-bottom: 0; }
.api-fuente { margin-top: 8px; font-size: 10px; color: #6b6b66; }
</style>
