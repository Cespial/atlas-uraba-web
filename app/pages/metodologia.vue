<template>
  <div class="met-root">
    <header class="met-header">
      <NuxtLink to="/" class="met-back">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Volver al mapa
      </NuxtLink>
      <div class="met-title-wrap">
        <h1 class="met-title">Metodología</h1>
        <span class="met-subtitle">Fórmula · glosario · catálogo de capas · Atlas Urabá</span>
      </div>
    </header>

    <main class="met-main">
      <!-- ── ÍNDICE NAV ────────────────────────────────────────── -->
      <nav class="met-toc">
        <a href="#indice-v3" class="met-toc-link">1. Índice v3.1</a>
        <a href="#glosario" class="met-toc-link">2. Glosario</a>
        <a href="#catalogo" class="met-toc-link">3. Catálogo de capas</a>
        <a href="#principios" class="met-toc-link">4. Principios</a>
      </nav>

      <!-- ══════════════════════════════════════════════════════════
           1 · ÍNDICE v3.1
      ══════════════════════════════════════════════════════════ -->
      <section id="indice-v3" class="met-block">
        <h2 class="met-h2"><span class="met-step">1</span> Índice v3.1 — <code>atlas_score_v31</code></h2>

        <p class="met-lead">
          El Índice de Bienestar del Atlas Urabá combina cuatro dimensiones ponderadas, calculadas
          por manzana censal (7.028 manzanas en los 8 municipios con datos a ese nivel):
        </p>

        <div class="met-formula-box">
          <code class="met-formula">{{ formula }}</code>
        </div>

        <div class="met-table-wrap">
          <table class="met-table">
            <thead>
              <tr>
                <th>Dimensión</th>
                <th>Peso</th>
                <th>Insumo real (v3 / v3.1 en seguridad)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in dimensionesV3" :key="d.nombre">
                <td>{{ d.nombre }}</td>
                <td><span class="met-peso">{{ d.peso }}</span></td>
                <td>{{ d.insumo }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="met-nota">
          El divisor <code>1.10</code> normaliza la suma de pesos (0.40+0.25+0.25+0.20 = 1.10)
          para que <code>atlas_score_v31</code> quede entre 0 y 1. Fuente:
          <code>public/data/atlas_stats_v31.json</code> → campo <code>_meta</code>, generado el
          {{ formatoFecha(metaV3.generado) }}.
        </p>

        <div class="met-warn">
          <div class="met-warn-title">⚠ Transición v3 → v3.1 — qué cambió y qué no</div>
          <p>
            <strong>Seguridad se reconstruyó (v3.1).</strong> <code>score_seguridad</code> v3 era una
            caja negra sin script generador en el repo, con 4 de 8 municipios saturados en
            <code>1.0000</code> — un patrón típico de dato tope, no de medición real. v3.1 la
            reemplaza por <code>score_seguridad_v31</code>: anclas fijas sobre la tasa de homicidios
            por 100k hab. (SIEDCO/MinDefensa), promedio simple de los 3 últimos años completos
            (2022-2024). La granularidad real de esta dimensión es <strong>municipal</strong> — toda
            manzana hereda el score de su municipio, y v3.1 lo declara explícitamente en vez de
            aparentar resolución de manzana.
          </p>
          <p>
            <strong>Arboletes y San Juan de Urabá</strong> promedian con solo 2 de los 3 años
            (2022 y 2024 — 2023 no está reportado en SIEDCO para esos códigos DANE); su
            <code>score_seguridad_v31</code> debe leerse con esa salvedad.
          </p>
          <p>
            <strong>Socioeconómico</strong> sigue sin insumo nuevo — calculado con la metodología v2
            (<code>score_economico_v2</code>, ver <code>insumos_v2_sin_cambio</code> en el
            <code>_meta</code> citado arriba).
          </p>
          <p>
            <strong>Advertencia honesta:</strong> esta migración es solo de la CAPA CITABLE (este
            brief, la API pública, el comparador y esta página). <strong>El mapa de manzanas del
            Atlas aún pinta el índice v3</strong> — su migración visual a v3.1 está en curso y se
            ratifica en una ola aparte (ver
            <code>docs/investigacion/2026-07-07/impacto-v31.md</code>).
          </p>
        </div>

        <p class="met-fuente">
          Insumos reales v3: isócronas OSRM (routing real por carretera, no distancia euclidiana) ·
          satélite Google Earth Engine (NDVI Sentinel-2, LST Landsat 8/9 para score de calor, NDBI
          para impermeabilización, VIIRS para luminosidad nocturna) · CNPV 2018 DANE (base
          censal de manzana).
        </p>
      </section>

      <!-- ══════════════════════════════════════════════════════════
           2 · GLOSARIO
      ══════════════════════════════════════════════════════════ -->
      <section id="glosario" class="met-block">
        <h2 class="met-h2"><span class="met-step">2</span> Glosario</h2>

        <div class="met-glosario">
          <div class="met-gitem">
            <div class="met-gterm">LISA (Local Indicator of Spatial Association)</div>
            <p class="met-gdef">
              Clasifica cada manzana según cómo se compara su <code>atlas_score</code> con el de
              sus manzanas vecinas — identifica agrupamientos espaciales (clusters) y valores
              atípicos, no solo el valor absoluto de la manzana:
            </p>
            <div class="met-lisa-grid">
              <div v-for="z in zonasLisa" :key="z.key" class="met-lisa-chip" :style="{ '--lc': z.color }">
                <b>{{ z.key }}</b> {{ z.label }}
              </div>
            </div>
            <ul class="met-lisa-list">
              <li><b>HH (Alto-Alto) · Próspero</b> — manzana con score alto rodeada de manzanas con score alto. Clúster de bienestar.</li>
              <li><b>LL (Bajo-Bajo) · Crítico</b> — manzana con score bajo rodeada de manzanas con score bajo. Clúster de precariedad — la señal más útil para priorizar inversión.</li>
              <li><b>HL (Alto-Bajo) · Isla alta</b> — manzana con score alto rodeada de manzanas con score bajo. Un islote de bienestar en zona precaria.</li>
              <li><b>LH (Bajo-Alto) · Rezago</b> — manzana con score bajo rodeada de manzanas con score alto. Se está quedando atrás en su propio entorno próspero.</li>
              <li><b>NS · No significativo</b> — no hay autocorrelación espacial estadísticamente significativa (el patrón podría explicarse por azar).</li>
            </ul>
          </div>

          <div class="met-gitem">
            <div class="met-gterm">Gini intra-municipal (equidad)</div>
            <p class="met-gdef">
              Mide qué tan desigual es el <code>atlas_score_v3</code> <em>dentro</em> de cada
              municipio (no entre municipios). 0 = todas las manzanas del municipio tienen el mismo
              score; más cerca de 1 = alta desigualdad interna.
            </p>
            <div class="met-formula-box met-formula-box--sm">
              <code class="met-formula">{{ metaEquidad.formula }}</code>
            </div>
            <p class="met-gdef">
              <code>brecha_p90_p10</code> = diferencia entre el percentil 90 y el percentil 10 del
              score dentro del municipio. <code>manzanas_criticas</code> = manzanas con score por
              debajo del percentil 25 regional de Urabá (umbral crítico:
              {{ metaEquidad.umbral_critico }}). Fuente: <code>equidad_municipios.json</code>,
              generado {{ formatoFecha(metaEquidad.generado) }}.
            </p>
          </div>

          <div class="met-gitem">
            <div class="met-gterm">IRCA (Índice de Riesgo de la Calidad del Agua)</div>
            <p class="met-gdef">
              Indicador del Instituto Nacional de Salud (INS, sistema SIVICAP) sobre el riesgo
              sanitario del agua para consumo humano en cada municipio, en escala 0–100. Niveles
              oficiales reportados por el INS:
            </p>
            <div class="met-table-wrap">
              <table class="met-table met-table--sm">
                <thead><tr><th>Rango</th><th>Nivel de riesgo</th></tr></thead>
                <tbody>
                  <tr><td>0 – 5</td><td>Sin riesgo</td></tr>
                  <tr><td>5.1 – 14</td><td>Riesgo bajo</td></tr>
                  <tr><td>14.1 – 35</td><td>Riesgo medio</td></tr>
                  <tr><td>35.1 – 80</td><td>Riesgo alto</td></tr>
                  <tr><td>80.1 – 100</td><td>Inviable sanitariamente</td></tr>
                </tbody>
              </table>
            </div>
            <p class="met-fuente">Fuente: INS — dataset SIVICAP (datos.gov.co/resource/nxt2-39c3.json).</p>
          </div>

          <div class="met-gitem">
            <div class="met-gterm">Tasa por 100.000 habitantes</div>
            <p class="met-gdef">
              Forma estándar de comparar hechos (p.ej. homicidios) entre municipios de tamaño muy
              distinto: <code>tasa = (hechos / población) × 100.000</code>. Sin esta normalización,
              Turbo (el municipio más poblado) siempre parecería "peor" en cifras absolutas aunque
              su riesgo por habitante sea menor que el de un municipio pequeño.
            </p>
          </div>

          <div class="met-gitem">
            <div class="met-gterm">Proxy vs. dato real</div>
            <p class="met-gdef">
              <strong>Dato real</strong>: medición directa (satélite, censo, registro
              administrativo, routing real por carretera). <strong>Proxy</strong>: estimación
              indirecta cuando el dato real todavía no está disponible — por ejemplo, distancia
              euclidiana en línea recta como sustituto temporal de minutos reales de viaje por
              carretera. El Atlas marca explícitamente cada capa como real o proxy (ver catálogo
              abajo) para que ningún usuario confunda una estimación con una medición.
            </p>
          </div>

          <div class="met-gitem">
            <div class="met-gterm">PDET (Programas de Desarrollo con Enfoque Territorial)</div>
            <p class="met-gdef">
              Subregiones priorizadas por el Decreto 893 de 2017 para la implementación del Acuerdo
              de Paz. De los 8 municipios del Atlas con datos a nivel de manzana, la subregión PDET
              "Urabá Antioqueño" cubre <strong>Apartadó, Carepa, Chigorodó, Necoclí y San Pedro de
              Urabá</strong> (más Mutatá y Dabeiba, fuera de la cobertura de manzana del Atlas).
              <strong>Arboletes y San Juan de Urabá NO son municipios PDET</strong> pese a estar
              dentro de la cobertura geográfica del Atlas — es un error común agruparlos porque
              comparten subregión Urabá.
            </p>
          </div>

          <div class="met-gitem">
            <div class="met-gterm">Manzana censal (CNPV)</div>
            <p class="met-gdef">
              Unidad geográfica más pequeña del Censo Nacional de Población y Vivienda (CNPV) 2018
              del DANE — típicamente una cuadra urbana delimitada por vías. Es la granularidad base
              del Atlas para los 8 municipios con cobertura de manzana (7.028 manzanas en total);
              donde el dato de origen es solo municipal (p.ej. IRCA, homicidios), el Atlas lo
              muestra a nivel de municipio y no lo desagrega artificialmente a manzana.
            </p>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════════════════════════
           3 · CATÁLOGO DE CAPAS
      ══════════════════════════════════════════════════════════ -->
      <section id="catalogo" class="met-block">
        <h2 class="met-h2"><span class="met-step">3</span> Catálogo de capas</h2>
        <p class="met-lead">
          Inventario generado automáticamente de los archivos de datos que alimentan el Atlas
          ({{ catalogo?.capas?.length ?? '—' }} archivos). Muestra, cuando el archivo lo declara,
          la fuente y la fecha de generación; y cuando la capa corresponde a un elemento del panel
          de capas del mapa, si el dato es real o proxy.
        </p>

        <div v-if="catalogoPending" class="met-state">Cargando catálogo…</div>
        <div v-else-if="catalogoError" class="met-state met-state--err">
          No se pudo cargar el catálogo de capas ({{ '/data/catalogo_capas.json' }}).
        </div>
        <template v-else>
          <div class="met-catalogo-controls">
            <input
              v-model="filtroCapa"
              class="met-catalogo-search"
              type="text"
              placeholder="Filtrar por nombre, fuente o tema…"
            />
            <span class="met-catalogo-count">{{ capasFiltradas.length }} / {{ catalogo?.capas?.length ?? 0 }}</span>
          </div>
          <div class="met-table-wrap">
            <table class="met-table met-table--catalogo">
              <thead>
                <tr>
                  <th>Capa</th>
                  <th>Fuente</th>
                  <th>Tipo</th>
                  <th>Tamaño</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in capasFiltradas" :key="c.archivo">
                  <td>
                    <span class="met-cat-label">{{ c.capa_mapa_label || c.archivo }}</span>
                    <span v-if="c.capa_mapa_tema" class="met-cat-tema">{{ c.capa_mapa_tema }}</span>
                    <code class="met-cat-file">{{ c.archivo }}</code>
                    <span
                      v-if="c.real_o_proxy"
                      class="met-badge"
                      :class="'met-badge--' + c.real_o_proxy"
                    >{{ c.real_o_proxy }}</span>
                  </td>
                  <td class="met-cat-fuente">{{ c.fuente || '—' }}</td>
                  <td><span class="met-cat-tipo">{{ c.tipo }}</span></td>
                  <td>{{ c.tamano_legible }}</td>
                  <td>{{ c.fecha_generacion ? formatoFecha(c.fecha_generacion) : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="met-fuente">
            Catálogo generado por <code>scripts/build_catalogo_capas.py</code> el
            {{ formatoFecha(catalogo?._meta?.generado) }} · {{ catalogo?._meta?.total_capas_mapa_matched ?? 0 }}
            de estos archivos corresponden a una capa visible del mapa.
          </p>
        </template>
      </section>

      <!-- ══════════════════════════════════════════════════════════
           4 · PRINCIPIOS
      ══════════════════════════════════════════════════════════ -->
      <section id="principios" class="met-block">
        <h2 class="met-h2"><span class="met-step">4</span> Principios del Atlas</h2>
        <div class="met-principios">
          <div v-for="p in principios" :key="p.titulo" class="met-principio">
            <div class="met-principio-titulo">{{ p.titulo }}</div>
            <p class="met-principio-desc">{{ p.desc }}</p>
          </div>
        </div>
        <p class="met-fuente">Fuente: ROADMAP.md — Principios (lecciones aprendidas), Atlas Urabá · Tensor.</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

// ── Índice v3.1 — leído de atlas_stats_v31.json._meta ──
// Fetch client-side (server: false): en el prerender estático de Vercel
// (`nuxt generate`) el fetch SSR contra /data/*.json no resuelve de forma
// confiable (mismo patrón que cadena.vue y brief/[municipio].vue).
// Ola 2 (adopción v3.1): atlas_stats_v3.json → atlas_stats_v31.json — ver
// docs/investigacion/2026-07-07/impacto-v31.md.
const { data: v3Raw } = await useFetch('/data/atlas_stats_v31.json', { server: false, lazy: true, key: 'met-v3' })
const metaV3 = computed(() => v3Raw.value?._meta ?? {})
const formula = computed(() =>
  metaV3.value.formula ?? 'atlas_score_v31 = (0.40*score_accesibilidad_v3 + 0.25*score_ambiental_v3 + 0.25*score_socioeconomico_v3 + 0.20*score_seguridad_v31) / 1.10'
)
const dimensionesV3 = computed(() => {
  const insumos = metaV3.value.insumos_reales ?? {}
  const v2sc = metaV3.value.insumos_v2_sin_cambio ?? {}
  const v31 = metaV3.value.insumos_v31 ?? {}
  return [
    { nombre: 'Accesibilidad', peso: '0.40', insumo: insumos.accesibilidad ?? 'isócronas OSRM reales' },
    { nombre: 'Ambiental', peso: '0.25', insumo: insumos.ambiental ?? 'satélite GEE (NDVI + calor)' },
    { nombre: 'Socioeconómico', peso: '0.25', insumo: v2sc.socioeconomico ?? 'score_economico_v2 (sin cambio en v3)' },
    { nombre: 'Seguridad', peso: '0.20', insumo: v31.seguridad ?? 'tasa homicidios 2022-2024 (SIEDCO/MinDefensa), anclas fijas — v3.1' },
  ]
})

// ── Equidad — leído de equidad_municipios.json._meta ──
const { data: equidadRaw } = await useFetch('/data/equidad_municipios.json', { server: false, lazy: true, key: 'met-equidad' })
const metaEquidad = computed(() => equidadRaw.value?._meta ?? {})

function formatoFecha(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const idx = parseInt(m, 10) - 1
  return meses[idx] ? `${d} ${meses[idx]} ${a}` : iso
}

const zonasLisa = [
  { key: 'HH', color: '#1a9641', label: 'Próspero' },
  { key: 'LL', color: '#d7191c', label: 'Crítico' },
  { key: 'HL', color: '#f39c12', label: 'Isla alta' },
  { key: 'LH', color: '#3498db', label: 'Rezago' },
  { key: 'NS', color: '#555555', label: 'No sig.' },
]

const principios = [
  { titulo: '1. Cero geometrías inventadas', desc: 'Ningún buffer, blob u óvalo dibujado a mano. Toda geometría del Atlas proviene de un levantamiento real (CNPV DANE, IGAC, OSM, satélite GEE, registros oficiales).' },
  { titulo: '2. Marcar proxy vs. real', desc: 'El usuario siempre debe poder saber si un indicador viene de una medición directa (satélite, censo, routing real) o de una estimación indirecta (proxy). Ver la columna "real/proxy" del catálogo arriba.' },
  { titulo: '3. Citar fuente en cada capa', desc: 'Cada dataset del Atlas declara su fuente institucional exacta y, cuando aplica, la URL o API de origen — trazabilidad completa hasta el dato oficial.' },
  { titulo: '4. Granularidad honesta', desc: 'El dato se muestra a la resolución real que tiene: manzana censal donde existe información a ese nivel, municipio donde el dato de origen es agregado municipal. Nunca se desagrega artificialmente un dato municipal para simular precisión de manzana.' },
]

// ── Catálogo de capas — fetch client-side fail-quiet (archivo generado por script) ──
const { data: catalogo, pending: catalogoPending, error: catalogoError } =
  await useFetch('/data/catalogo_capas.json', { server: false, lazy: true, key: 'met-catalogo' })

const filtroCapa = ref('')
const capasFiltradas = computed(() => {
  const lista = catalogo.value?.capas ?? []
  const q = filtroCapa.value.trim().toLowerCase()
  if (!q) return lista
  return lista.filter(c =>
    (c.archivo || '').toLowerCase().includes(q) ||
    (c.capa_mapa_label || '').toLowerCase().includes(q) ||
    (c.capa_mapa_tema || '').toLowerCase().includes(q) ||
    (c.fuente || '').toLowerCase().includes(q)
  )
})

useHead({
  title: 'Metodología · Atlas Urabá',
  meta: [
    { name: 'description', content: 'Fórmula del Índice de Bienestar v3.1, glosario técnico (LISA, Gini, IRCA, PDET) y catálogo de capas de datos del Atlas Urabá.' },
    { property: 'og:title', content: 'Metodología — Atlas Urabá' },
    { property: 'og:description', content: 'Cómo se calcula el Índice de Bienestar del Atlas Urabá: fórmula, insumos por dimensión y catálogo de fuentes.' },
    { property: 'og:image', content: 'https://uraba.tensor.lat/og-image.png' },
  ],
})
</script>

<style scoped>
.met-root { min-height: 100vh; background: #0d1211; color: #e7e5e0; }
.met-header { display: flex; align-items: center; gap: 20px; padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.met-back { display: inline-flex; align-items: center; gap: 6px; font-family: ui-monospace, monospace; font-size: 11px; color: #8a8a85; text-decoration: none; }
.met-back:hover { color: #e7e5e0; }
.met-title { font-size: 16px; font-weight: 700; }
.met-subtitle { font-family: ui-monospace, monospace; font-size: 10px; color: #8a8a85; letter-spacing: 0.08em; }
.met-main { max-width: 900px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 22px; }

.met-toc { display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 4px 2px; }
.met-toc-link { font-family: ui-monospace, monospace; font-size: 11px; color: #4fb8ba; text-decoration: none; letter-spacing: 0.02em; }
.met-toc-link:hover { text-decoration: underline; }

.met-block { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 18px 20px; scroll-margin-top: 20px; }
.met-h2 { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.02em; margin-bottom: 12px; }
.met-step { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 999px; background: #1B6B6D; color: #fff; font-family: ui-monospace, monospace; font-size: 11px; flex: none; }
.met-lead { font-size: 13px; line-height: 1.6; color: #d8d6d0; margin-bottom: 12px; }

.met-formula-box { background: #0a0e0d; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; overflow-x: auto; }
.met-formula-box--sm { padding: 10px 12px; margin-bottom: 8px; }
.met-formula { font-family: ui-monospace, monospace; font-size: 12px; color: #4fb8ba; white-space: pre; }

.met-table-wrap { overflow-x: auto; margin-bottom: 12px; }
.met-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.met-table th { text-align: left; font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.06em; color: #8a8a85; text-transform: uppercase; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.12); }
.met-table td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; }
.met-table--sm td, .met-table--sm th { padding: 5px 8px; font-size: 11px; }
.met-peso { font-family: ui-monospace, monospace; color: #4fb8ba; font-weight: 700; }

.met-nota { font-size: 11.5px; line-height: 1.6; color: #8a8a85; margin-bottom: 12px; }
.met-nota code, .met-lead code, .met-gdef code, .met-warn code { font-family: ui-monospace, monospace; font-size: 11px; color: #4fb8ba; background: rgba(27,107,109,0.12); padding: 1px 5px; border-radius: 4px; }

.met-warn { border: 1px solid rgba(245,158,11,0.35); background: rgba(245,158,11,0.06); border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; }
.met-warn-title { font-size: 11.5px; font-weight: 700; color: #f59e0b; margin-bottom: 6px; }
.met-warn p { font-size: 12px; line-height: 1.6; color: #d8d6d0; }
.met-warn strong { color: #e7e5e0; }

.met-fuente { font-size: 10px; color: #6b6b66; margin-top: 4px; }

/* Glosario */
.met-glosario { display: flex; flex-direction: column; gap: 18px; }
.met-gitem { padding-top: 4px; }
.met-gitem + .met-gitem { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; }
.met-gterm { font-size: 13px; font-weight: 700; color: #e7e5e0; margin-bottom: 6px; }
.met-gdef { font-size: 12px; line-height: 1.65; color: #b8b6b0; margin-bottom: 8px; }
.met-gdef strong { color: #e7e5e0; }
.met-lisa-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.met-lisa-chip { font-family: ui-monospace, monospace; font-size: 10.5px; padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--lc) 18%, transparent); border: 1px solid color-mix(in srgb, var(--lc) 45%, transparent); color: var(--lc); }
.met-lisa-list { display: flex; flex-direction: column; gap: 6px; padding-left: 0; list-style: none; }
.met-lisa-list li { font-size: 11.5px; line-height: 1.55; color: #b8b6b0; }
.met-lisa-list b { color: #e7e5e0; }

/* Catálogo */
.met-catalogo-controls { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.met-catalogo-search { flex: 1; max-width: 320px; background: #16201e; color: #e7e5e0; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; font-size: 11.5px; padding: 6px 10px; }
.met-catalogo-search::placeholder { color: #6b6b66; }
.met-catalogo-count { font-family: ui-monospace, monospace; font-size: 10px; color: #8a8a85; }
.met-table--catalogo td { vertical-align: top; }
.met-cat-label { display: block; font-size: 11.5px; font-weight: 600; color: #e7e5e0; }
.met-cat-tema { display: block; font-family: ui-monospace, monospace; font-size: 9px; color: #8a8a85; letter-spacing: 0.04em; margin-top: 1px; }
.met-cat-file { display: block; font-family: ui-monospace, monospace; font-size: 9.5px; color: #5f8a8a; margin-top: 3px; }
.met-cat-fuente { font-size: 11px; color: #b8b6b0; max-width: 320px; }
.met-cat-tipo { font-family: ui-monospace, monospace; font-size: 9.5px; color: #8a8a85; text-transform: uppercase; }
.met-badge { display: inline-block; margin-top: 4px; padding: 1px 6px; border-radius: 3px; font-family: ui-monospace, monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; }
.met-badge--real { background: rgba(27,107,109,0.18); border: 1px solid rgba(27,107,109,0.4); color: #2dd4d0; }
.met-badge--proxy { background: rgba(245,158,11,0.16); border: 1px solid rgba(245,158,11,0.4); color: #f59e0b; }

.met-state { padding: 40px 0; text-align: center; font-family: ui-monospace, monospace; font-size: 12px; color: #8a8a85; }
.met-state--err { color: #f46d43; }

/* Principios */
.met-principios { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
.met-principio { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-left: 3px solid #1B6B6D; border-radius: 6px; padding: 10px 14px; }
.met-principio-titulo { font-size: 11.5px; font-weight: 700; color: #4dd0d3; margin-bottom: 5px; }
.met-principio-desc { font-size: 11.5px; line-height: 1.55; color: #d6d4cf; }
@media (max-width: 640px) { .met-principios { grid-template-columns: 1fr; } }
</style>
