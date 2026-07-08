# Dossier técnico/arquitectura — Atlas Urabá

**Frente**: Técnico/Arquitectura · **Repo**: `/Users/cristianespinal/atlas-uraba-web` ·
**Fecha de consulta**: 2026-07-07 · **Alcance**: solo lectura (auditoría estática del
repo + verificación en vivo de `https://uraba.tensor.lat` vía `curl`). No se propone
ninguna reescritura de stack (Nuxt 4 + MapLibre + PMTiles + Pinia + Chart.js se queda).

---

## 0. Resumen ejecutivo

El atlas funciona y está en producción, pero tiene un patrón de carga que no escala
bien más allá del estado actual: **`useAtlasMap.js` registra ~40 fuentes GeoJSON de
forma eager en `loadAtlasLayer()`**, una función que corre una sola vez al montar el
mapa (evento `load`), independientemente de si el usuario activa esas capas alguna
vez. MapLibre GL JS empieza a descargar el `data:` de cada `addSource()` en el
instante en que se llama, sin esperar a que una layer visible la use — esto es
comportamiento documentado de la librería, no una suposición: se confirma leyendo el
código (ninguna de las ~40 fuentes se agrega de forma condicionada a `toggleLayer`,
todas viven dentro de `loadAtlasLayer()`, `app/composables/useAtlasMap.js:166-1254`).

Medido contra el propio repo, eso son **~82 MB de GeoJSON crudo** descargados en cada
primera visita (`public/data`, ver §1), comprimidos a brotli automáticamente por
Vercel (confirmado con `curl` en vivo, §1.3) pero aun así del orden de **10-14 MB
por el cable** — antes de que el usuario haya tocado un solo control.

El segundo hallazgo mayor es una contradicción de arquitectura ya diagnosticada en
`HANDOFF.md` (2026-07-07) que esta auditoría **confirma en vivo**: `nuxt.config.ts`
declara `nitro.preset: 'vercel'` (SSR) y existen 5 endpoints REST reales en
`server/api/uraba/**`, pero el proyecto en Vercel construye con `nuxt generate`
(sitio 100% estático). Resultado verificado ahora mismo:

```
$ curl -s -o /dev/null -w "HTTP_CODE:%{http_code}\n" https://uraba.tensor.lat/api/uraba/municipios
HTTP_CODE:404
```

Este dossier prioriza mejoras concretas, con `file:line`, esfuerzo estimado y sin
tocar el stack. La tabla de hallazgos priorizados está en §7.

---

## 1. Peso y estrategia de carga de `public/data`

### 1.1 Inventario

```
$ du -sh public/data
103M    public/data     (76 archivos: 47 .geojson, 1 .pmtiles, JSON/CSV de apoyo)
```

Los 15 archivos más pesados (fuente: `du -ah public/data`, 2026-07-07):

| Archivo | Tamaño |
|---|---|
| `catastro_igac_uraba.geojson` | 16 MB |
| `atlas_enriquecido.geojson` | 11 MB |
| `atlas.geojson` | 7.3 MB |
| `prioridad_inversion.geojson` | 7.2 MB |
| `clasificacion_suelo.geojson` | 7.1 MB |
| `atlas_slim.geojson` | 5.8 MB |
| `aislamiento_manzanas.geojson` | 5.8 MB |
| `conflicto_uso_manzanas.geojson` | 5.4 MB |
| `conflictos_uso.geojson` | 5.1 MB |
| `runap_areas.geojson` | 4.7 MB |
| `ideam_inundacion.geojson` | 4.4 MB |
| `red_vial_invias.geojson` | 3.1 MB |
| `atlas.pmtiles` | 3.1 MB |
| `veredas.geojson` | 2.1 MB |
| `smbyc_deforestacion_choco.geojson` | 2.1 MB |

Nota: hay pares de archivos que huelen a artefactos duplicados de iteraciones
distintas del pipeline (`atlas.geojson` / `atlas_slim.geojson` / `atlas_enriquecido.geojson`,
`conflicto_uso_manzanas.geojson` / `conflictos_uso.geojson`). **Hipótesis**: alguno de
estos ya no se referencia desde el código y es basura de build. Verificable con:

```bash
for f in public/data/*.geojson; do grep -q "$(basename "$f")" app -r || echo "huérfano: $f"; done
```
No se ejecutó esta verificación exhaustiva en esta auditoría (no confirmado); queda
como acción de bajo esfuerzo para el dueño del repo.

### 1.2 Carga eager confirmada — el hallazgo central

`app/composables/useAtlasMap.js` define `loadAtlasLayer()` (línea 166), que corre una
única vez cuando el mapa dispara su evento `load` (`useAtlasMap.js:134-149`). Dentro
de esa función hay **43 llamadas a `map.value.addSource(...)`** (`grep -c addSource
useAtlasMap.js` → 43), de las cuales **40 apuntan a un archivo `.geojson` distinto**
bajo `/data/`. Todas están fuera de cualquier `if (layerVisibility[...])`: el patrón
real es "agregar la fuente siempre, con la layer en `visibility: 'none'`, y que
`toggleLayer()` (línea 1274) solo cambie la propiedad de visibilidad de la layer ya
cargada" — por ejemplo `clasificacion-suelo` (`useAtlasMap.js:769-792`, fuente 7.1 MB)
o `catastro` (`useAtlasMap.js:1097`, fuente 16 MB, la más pesada del repo).

`toggleLayer()` (`useAtlasMap.js:1274-1343`) confirma el patrón: su `layerMap` solo
llama a `setLayoutProperty(layerId, 'visibility', vis)` sobre layers que **ya
existen** — no hay ninguna rama que haga `addSource` de forma perezosa la primera vez
que el usuario activa una capa.

Sumando el tamaño real en disco de las 40 fuentes que `useAtlasMap.js` agrega vía
`addSource` con `data: '/data/*.geojson'` (lista exacta obtenida con
`grep -oE "data:\s*'/data/[a-zA-Z0-9_.-]+'" useAtlasMap.js`, tamaños con `stat -f%z`):

```
TOTAL: 85,935,690 bytes ≈ 82 MB crudos, en 40 archivos
```

Esto ocurre **para cualquier visitante**, sin importar si solo quiere ver el mapa de
score general (`atlas` — vía PMTiles, ver §1.4) sin abrir nunca el panel de capas.

### 1.3 Impacto real por el cable (mitigado por compresión, no eliminado)

Vercel aplica Brotli automáticamente. Verificado en vivo:

```
$ curl -sD - -o /dev/null https://uraba.tensor.lat/data/atlas_enriquecido.geojson -H "Accept-Encoding: gzip, br"
content-encoding: br
cache-control: public, max-age=86400
```

```
$ curl -s -o /dev/null -w "size_download:%{size_download}\n" https://uraba.tensor.lat/data/atlas.geojson -H "Accept-Encoding: gzip, br"
size_download:1210827          # 7,685,867 bytes crudos → 1.21 MB por el cable (ratio ~6.3x)
```

Aplicando el mismo ratio de compresión observado (~6.3x, razonable para GeoJSON con
mucha coordenada repetida) a los 82 MB crudos, el **estimado** de descarga real de
las 40 fuentes eager es del orden de **13-14 MB comprimidos** (hipótesis, no medido
capa por capa — el ratio real varía con la geometría de cada archivo). Sigue siendo
sustancial para un primer contacto en un municipio con conectividad rural/móvil
(hipótesis razonable dado que la audiencia incluye alcaldías de los 8 municipios de
Urabá, pero no hay datos de RUM/analítica de red en el repo que la confirmen).

### 1.4 Lo que ya está bien: `atlas.pmtiles`

La fuente principal de manzanas (`atlas`) ya migró a PMTiles con fallback inteligente
a GeoJSON (`useAtlasMap.js:166-194`): hace un `HEAD` a `/data/atlas.pmtiles` primero,
comprueba `content-type` para descartar el falso-positivo de un SPA fallback en
`text/html`, y solo si falla usa el GeoJSON de 7.3 MB. Este es exactamente el patrón
que falta para las otras 39 fuentes: **el precedente y la herramienta (`tippecanoe`,
confirmado instalado en `/opt/homebrew/bin/tippecanoe`) ya existen en el entorno**, no
hay que introducir infraestructura nueva.

`vercel.json` ya sirve `.pmtiles` con cache agresivo e inmutable:
```json
{ "source": "/data/(.*)\\.pmtiles", "headers": [
  { "key": "Cache-Control", "value": "public, max-age=2592000, immutable" } ] }
```
mientras que `.geojson` solo obtiene `max-age=86400` (§5) — un incentivo adicional
para migrar.

### 1.5 Duplicación fuera de `useAtlasMap.js`

Dos rutas más descargan el **mismo** `atlas.geojson` completo (7.3 MB / ~1.2 MB
brotli) de forma independiente, sin usar el PMTiles ya disponible:

- `app/components/comparar/CompararMiniMapa.vue:62` —
  `map.addSource('atlas-mini', { type: 'geojson', data: '/data/atlas.geojson' })`
  para el mini-mapa de `/comparar`. Al ser un mapa pequeño y de solo lectura, es un
  candidato aún más claro para PMTiles (mismo archivo que ya existe).
- `app/composables/useSimulador.js:115-116` — `Promise.all([fetch('/data/atlas.geojson')...,
  fetch('/data/isocronas_osrm_real.csv')...])` en `cargarDatos()`, para el simulador
  de inversión. Aquí sí se necesitan las 7,028 manzanas con geometría para el cálculo
  de distancia euclidiana, así que la sustitución no es tan directa (PMTiles no
  expone fácilmente todas las features a la vez sin recorrer tiles) — se documenta
  como limitación conocida, no como acción inmediata.

El navegador mitiga parcialmente el costo de red en navegación repetida dentro de la
misma sesión gracias al `Cache-Control: max-age=86400` de `.geojson` (la segunda
visita a la misma URL debería resolver desde caché de disco sin ir a red), pero el
**primer** golpe a cada una de esas rutas sigue siendo pesado y no hay una capa de
caché compartida entre `/`, `/comparar` y `/simulador` (cada uno hace su propio
`fetch()` crudo, no `useFetch` con `key` compartido ni un store central de geometría).

---

## 2. PMTiles vs GeoJSON — candidatos concretos y priorización

Criterio de priorización: tamaño en disco × probabilidad de que la capa esté detrás
de un toggle poco usado (todas lo están, según §1.2) × complejidad de conversión
(polígonos simples con propiedades categóricas = conversión trivial con `tippecanoe`;
fuentes con `promoteId` usado para `feature-state` requieren verificar que PMTiles
preserve el campo id, cosa que `atlas.pmtiles` ya demuestra que funciona).

| Prioridad | Archivo | Línea `addSource` | Tamaño | Por qué es buen candidato |
|---|---|---|---|---|
| P0 | `catastro_igac_uraba.geojson` | `useAtlasMap.js:1097` | 16 MB | El archivo más pesado del repo; capa de referencia, `visibility:'none'` por defecto, probablemente la menos activada |
| P0 | `atlas_enriquecido.geojson` | `useAtlasMap.js:998-1000` | 11 MB | 5 sub-capas (v2 GHSL/NDVI/luminosidad) cuelgan de la misma fuente — una sola conversión cubre 5 toggles |
| P1 | `prioridad_inversion.geojson` | `useAtlasMap.js:796-800` | 7.2 MB | Ya usa `promoteId: '_fid'`, igual que `atlas.pmtiles` — plantilla de conversión reutilizable |
| P1 | `clasificacion_suelo.geojson` | `useAtlasMap.js:769` | 7.1 MB | Polígonos categóricos simples, `match` expression ya vectorizable en PMTiles |
| P1 | `aislamiento_manzanas.geojson` | `useAtlasMap.js:953` | 5.8 MB | `promoteId: 'cod_manzana'` |
| P1 | `conflicto_uso_manzanas.geojson` | `useAtlasMap.js:971` | 5.4 MB | `promoteId: 'cod_manzana'` |
| P2 | `runap_areas.geojson` | `useAtlasMap.js:1187` | 4.7 MB | Polígonos de áreas protegidas, geometría estable (no cambia entre releases) |
| P2 | `ideam_inundacion.geojson` | `useAtlasMap.js:713` | 4.4 MB | Igual — dato satelital/oficial poco cambiante |
| P2 | `red_vial_invias.geojson` | `useAtlasMap.js:1116` | 3.1 MB | Líneas, buen caso para tiles por zoom (detalle de vía relevante solo a zoom alto) |

**No** se recomienda migrar `veredas.geojson` (2.1 MB, capa de referencia siempre
visible, `useAtlasMap.js:206`) ni las capas de puntos pequeñas (`reps.geojson`,
`simat.geojson`, `equipamientos.geojson`, todas <1 MB) — el costo de mantener una
build adicional de PMTiles no se justifica frente al tamaño.

**Esfuerzo estimado por archivo**: bajo (una línea de `tippecanoe` + cambiar
`addSource` a `type:'vector', url:'pmtiles://...'` + replicar el patrón HEAD-check de
`useAtlasMap.js:176-194` si se quiere fallback). El trabajo grande no es técnico sino
de **repetir el patrón 8-9 veces** y decidir qué zoom mínimo tiene sentido por capa
(las capas de referencia institucional como catastro o RUNAP probablemente no
necesitan ser visibles a zoom país, solo a zoom municipio/manzana).

**Recomendación complementaria de bajo esfuerzo**: para las capas que NO se migren a
PMTiles, cambiar el patrón de "siempre cargar, toggle solo cambia visibilidad" por
"cargar la fuente en el primer `toggleLayer(id)` que la active" — es decir, mover el
`addSource` correspondiente de `loadAtlasLayer()` a dentro de `toggleLayer()`, guardado
detrás de un `if (!map.value.getSource(id))`. Esto no requiere tocar ningún archivo de
datos, solo reordenar ~15 líneas de `useAtlasMap.js` por capa. Es el fix de esfuerzo
más bajo de todo el dossier y ataca la misma causa raíz que PMTiles sin tocar el
pipeline de datos.

---

## 3. Bundle del cliente

`.vercel/output/static/_nuxt/*.js` (artefacto de un build local reciente, presente en
el repo): **1.6 MB de JS total** repartidos en ~15 chunks. El chunk más grande
(`BSCK7p18.js`, 1.0 MB) contiene MapLibre GL JS (confirmado con `strings` — aparecen
símbolos internos de `mapbox-gl`/formatted-text de MapLibre). Esto **no es un
problema**: MapLibre ya se importa de forma diferida —

```js
// useAtlasMap.js:99, 102
_maplibregl = (await import('maplibre-gl')).default
const { Protocol } = await import('pmtiles')
```

— así que no bloquea el chunk inicial de la app, y Chart.js (usado solo en `/cadena`,
`app/pages/cadena.vue:104-105`) se beneficia automáticamente del code-splitting
por-ruta de Nuxt (no se descarga en `/`, `/comparar` ni `/simulador`). No se identificó
ninguna acción de bundle-size que valga la pena frente al problema de datos de §1-2.

---

## 4. El dilema estático vs SSR en Vercel

### 4.1 Estado confirmado en producción

`nuxt.config.ts:1-19` declara intención SSR explícita:

```ts
// SSR + Vercel serverless: necesario para que las rutas server/api/** (API
// pública REST de FASE 4) se desplieguen como funciones, no como sitio estático.
nitro: {
  preset: 'vercel',
  prerender: { routes: ['/brief/apartado', ...] },
  serverAssets: [{ baseName: 'data', dir: 'server/assets/data' }],
},
```

y existe una API REST real y funcional en `server/api/uraba/` (5 endpoints:
`index.get.js`, `municipios.get.js`, `ranking.get.js`, `municipio/[nombre].get.js`,
`manzana/[cod].get.js`), respaldada por `scripts/sync-api-assets.mjs` (que copia 4
archivos de `public/data/` a `server/assets/data/` antes de cada build/dev vía
`prebuild`/`predev` en `package.json:6-7`) y `server/utils/uraba.js` (lee esos assets
vía `useStorage('assets')`, con caché en memoria).

Pero el Build Command configurado en el proyecto de Vercel (fuera del repo, en la
configuración del dashboard — no visible por auditoría de código, solo inferible por
el comportamiento en prod) usa `nuxt generate`. Confirmado en vivo:

```
$ curl -s -o /dev/null -w "HTTP_CODE:%{http_code}\n" https://uraba.tensor.lat/api/uraba/municipios
HTTP_CODE:404
```

El artefacto local `.vercel/output/functions/` solo contiene `__fallback.func`
(el fallback de rutas dinámicas de `nuxt generate`/SSG, no las funciones de
`server/api/**`) — confirma que la última vez que se generó output localmente con el
mismo comando que corre Vercel, las rutas de API no se materializaron como funciones.

Esto significa que **todo el trabajo de `server/api/uraba/**`, `server/utils/uraba.js`
y `scripts/sync-api-assets.mjs` viaja en el bundle pero está muerto en producción** —
tal como ya lo documentó `HANDOFF.md` (sección "Hallazgo de infraestructura") el mismo
día de esta auditoría. Esta auditoría lo confirma con evidencia externa (`curl` contra
el dominio real) en vez de solo inspección de código.

### 4.2 Opción A — Build Command → `npm run build` (SSR real)

Restaura la arquitectura que `nuxt.config.ts` ya declara: las 5 rutas de
`server/api/uraba/**` se desplegarían como funciones serverless de Vercel, con acceso
en runtime a `atlas_stats_v3.json`, `gap_analysis.json`, `atlas.geojson` y
`equidad_municipios.json` vía `useStorage`.

- **A favor**: cero cambios de código — es literalmente cambiar un campo en el
  dashboard de Vercel. `npm run build` ya "pasa verde" localmente según
  `HANDOFF.md` ("Setup notes").
- **En contra**: cambia el modelo de despliegue de "sitio estático puro" a
  "funciones + estático", con implicaciones de cold-start, límites de ejecución de
  Vercel Functions, y (según el plan del propio plan tier) posible costo. También
  significa que `/comparar` y `/simulador`, que hoy están forzados a `ssr:false` vía
  `routeRules` (`nuxt.config.ts`, comentario "para evitar hydration mismatches"),
  seguirían siendo SPA — eso no cambia — pero el resto de rutas pasarían a
  renderizarse en el servidor en cada visita salvo que se marquen explícitamente
  para prerender, lo que puede introducir regresiones no probadas si no se hace con
  cuidado (revisar cada página bajo el nuevo modo antes de promover a producción).
- **Esfuerzo**: bajo si solo se cambia el campo del dashboard; medio si además hay
  que auditar cada página para decidir su estrategia de render (SSR vs prerender vs
  SPA) porque el comportamiento cambia de raíz.

### 4.3 Opción B — API estática pre-generada dentro de `nuxt generate` (recomendada)

Nitro trata las rutas de `server/api/**` igual que las páginas a efectos de
prerender: si se agregan explícitamente al arreglo `nitro.prerender.routes` (el mismo
mecanismo ya usado para las 8 rutas `/brief/*` en `nuxt.config.ts`, fix del commit
`85b4eb4`), `nuxt generate` las ejecuta una vez en tiempo de build (dentro de un
Nitro en proceso que sí tiene acceso a `useStorage('assets')`, exactamente como en dev)
y escribe la respuesta JSON como archivo estático en `.output/public/api/...`. Desde
ahí, Vercel las sirve como asset estático — sin función serverless, sin cold-start,
compatible con el Build Command actual (`nuxt generate`).

Las 5 rutas son ideales para esto porque son **puras y con espacio de entrada
enumerable**:

- `/api/uraba` — 1 ruta fija (`server/api/uraba/index.get.js`)
- `/api/uraba/municipios` — 1 ruta fija
- `/api/uraba/ranking` — 1 ruta fija
- `/api/uraba/municipio/[nombre]` — 8 municipios → 8 rutas enumerables
- `/api/uraba/manzana/[cod]` — 7,028 manzanas → 7,028 rutas enumerables (cada
  respuesta es pequeña, del orden de <1 KB por el `r()` de redondeo a 4 decimales en
  `server/api/uraba/manzana/[cod].get.js:6`, así que 7,028 archivos no es un problema
  de peso total, es del orden de unos pocos MB)

Ejemplo de cambio en `nuxt.config.ts` (agregar al `prerender.routes` ya existente):

```ts
prerender: {
  routes: [
    '/brief/apartado', /* ...las 8 existentes... */,
    '/api/uraba', '/api/uraba/municipios', '/api/uraba/ranking',
    ...MUNICIPIOS.map(m => `/api/uraba/municipio/${slugFor(m.nombre)}`),
    ...codigosManzana.map(c => `/api/uraba/manzana/${c}`),
  ],
},
```

(la lista de 7,028 códigos de manzana tendría que generarse en el propio config o en
un script previo, leyendo `atlas.geojson`/`atlas_stats_v3.json` — trabajo de
integración, no de diseño).

- **A favor**: mantiene el Build Command actual sin cambios, cero riesgo de
  cold-start o regresión de render en las páginas existentes, y **es exactamente lo
  que el enunciado de esta investigación sugiere** como opción alternativa. Los
  archivos estáticos resultantes heredan las reglas de caché de `vercel.json` (hoy
  solo cubren `.geojson`/`.pmtiles`, habría que sumar una regla para `/api/*` — ver
  §5).
- **En contra**: la API deja de ser "en vivo" — si se recalcula `atlas_stats_v3.json`
  sin volver a hacer `nuxt generate`, la API estática queda desactualizada (mismo
  riesgo que ya existe hoy para todo el contenido prerenderizado del sitio, así que
  no es un riesgo nuevo). El endpoint `manzana/[cod]` deja de aceptar códigos fuera
  del set conocido en build-time con un 404 "en runtime" real — pasa a ser un 404 de
  archivo no encontrado, comportamiento equivalente pero sin el cuerpo JSON
  estructurado que hoy arma `notFound()` (`server/utils/uraba.js:44-50`); es una
  pérdida de fidelidad menor pero real.
- **Esfuerzo**: medio — hay que generar la lista de 7,028 rutas de manzana de forma
  programática (no a mano) y confirmar en un build local que Nitro efectivamente
  materializa esas 7,028 respuestas sin exceder límites de build de Vercel (tiempo o
  número de archivos). No verificado en esta auditoría — es una prueba de build real
  que el equipo debe correr antes de comprometerse a esta ruta.

### 4.4 Recomendación

Dado que el repo explícitamente busca mantenerse desplegado como sitio estático
(comentario en `nuxt.config.ts`: "El proyecto en Vercel construye con `nuxt generate`
(vercel-static)") y que el volumen de tráfico de una API pública de un atlas
municipal probablemente no justifica el salto a funciones serverless con sus
implicaciones de costo/cold-start, la **Opción B (prerender estático) es la que mejor
respeta el principio de "no reescribir el stack"**: es una extensión directa de un
patrón que el propio repo ya usa para `/brief/*`. La Opción A queda como alternativa
si en algún momento se necesita que la API refleje datos verdaderamente en vivo
(por ejemplo si se conecta a una fuente que cambia más rápido que el ciclo de deploy).

---

## 5. Cache headers

`vercel.json` define reglas explícitas solo para dos extensiones:

```json
{ "source": "/data/(.*)\\.pmtiles", "headers": [
    { "key": "Cache-Control", "value": "public, max-age=2592000, immutable" } ] },
{ "source": "/data/(.*)\\.geojson", "headers": [
    { "key": "Cache-Control", "value": "public, max-age=86400" } ] }
```

Verificado en vivo que **todo lo demás bajo `/data/` no tiene regla propia** y cae al
default de Vercel para archivos estáticos servidos "al vuelo" (sin hash en el nombre),
que es `no-cache`/revalidación obligatoria:

```
$ curl -sD - -o /dev/null https://uraba.tensor.lat/data/atlas_stats_v3.json
cache-control: public, max-age=0, must-revalidate

$ curl -sD - -o /dev/null https://uraba.tensor.lat/data/isocronas_osrm_real.csv
cache-control: public, max-age=0, must-revalidate
```

Esto afecta a archivos que se consumen en **cada** carga de página relevante y casi
nunca cambian entre despliegues: `atlas_stats_v3.json`, `atlas_stats_v2.json`,
`gap_analysis.json`, `equidad_municipios.json`, `benchmarks.json`,
`top_prioridad.json`, `eva_produccion_serie.json`, `sipsa_precios.json`,
`expo_banano_fob.json`, `isocronas_municipio.json`, `isocronas_osrm_real.csv`, y el
resto de `.csv`/`.json` de `public/data/` (ver referencias en `app/pages/comparar.vue:131-133`,
`app/pages/cadena.vue:114-116`, `app/pages/brief/[municipio].vue:130-134`,
`app/composables/useEquidad.js:12`, `app/composables/useSimulador.js:116`).

**Recomendación** (esfuerzo bajo, cambio de una línea en `vercel.json`): agregar una
regla para `\.json$` y `\.csv$` bajo `/data/` con `max-age` de al menos 1 día, igual
que ya se hace para `.geojson`. Dado que estos archivos se regeneran por script
(`scripts/compute_equidad.py`, `recalc_v3.py`, `script_clasificacion.py`) y no en cada
deploy, un `max-age=86400` (o más, con invalidación manual si algún día se necesita)
es coherente con el patrón ya usado. Ejemplo:

```json
{
  "source": "/data/(.*)\\.(json|csv)",
  "headers": [
    { "key": "Cache-Control", "value": "public, max-age=86400" },
    { "key": "Access-Control-Allow-Origin", "value": "*" }
  ]
}
```

(Cuidado: el patrón `\.(json|csv)` no debe interceptar rutas de la API si se adopta
la Opción B de §4.3 — conviene acotarlo a `/data/(.*)\.(json|csv)` como ya está, que
por prefijo de path no choca con `/api/*`.)

---

## 6. Robustez — error boundaries y estados vacíos

### 6.1 Lo que ya está bien resuelto

- **Fallo de inicialización del mapa**: `AtlasMap.vue` envuelve `initMap()` en
  `try/catch` y emite un evento `error` (`app/components/AtlasMap.vue:42-45`);
  `index.vue` escucha ese evento (`@error="onMapError"`, `app/pages/index.vue:52`) y
  muestra un overlay visible cuando `store.error` está seteado
  (`app/pages/index.vue:16-17`). Es un patrón completo: captura → estado → UI.
- **Fallback de PMTiles**: `useAtlasMap.js:168-194` ya resuelve el caso "el archivo
  `.pmtiles` no existe o el host devuelve el `index.html` de la SPA en su lugar" con
  una comprobación de `content-type` antes de decidir el tipo de fuente — un detalle
  fino que evita el bug típico de "PMTiles falla en silencio porque `addSource` no
  lanza sobre errores asíncronos" (documentado en el propio comentario del código).
- **Timeout de garantía**: si el mapa nunca dispara `idle` (por ejemplo, capas que
  tardan demasiado), un `setTimeout` de 8 segundos fuerza `ready.value = true` de
  todas formas (`useAtlasMap.js:151-158`) — evita que un fallo de red dependiente dé
  cliffhanging el overlay de carga eternamente. El comentario en el código indica que
  el valor subió de 4s a 8s tras observarse que en móvil se cerraba antes de tiempo —
  buena señal de que esto se ajustó con datos reales, no a ciegas.
- **Estados pending/error explícitos** en las páginas nuevas del sprint 2026-07-07:
  `comparar.vue:44-45` (`v-if="pending"` / `v-else-if="error"`), mismo patrón en
  `brief/[municipio].vue` y `cadena.vue`, todas usando `useFetch(..., { server:
  false, lazy: true })` con manejo de `error` explícito por archivo cargado.
- **Patrón fail-quiet consistente** en composables de apoyo: `useEquidad.js:9-16`
  (si el fetch falla, `equidad.value = null` y el consumidor oculta su UI, sin
  romper la página) y `useSimulador.js:111-113` (`error.value` capturado en
  `try/catch` alrededor de `Promise.all`).

### 6.2 Gaps identificados

| Gap | Evidencia | Severidad | Esfuerzo de cierre |
|---|---|---|---|
| No hay `app/error.vue` personalizado | `find app -iname "error.vue"` → sin resultados; solo existe `app/app.vue` como shell | Bajo — Nuxt sirve su página de error genérica por defecto, funcional pero no de marca | Bajo: crear `app/error.vue` con el mismo lenguaje visual del resto del sitio |
| `loadStats()` tiene reintento pero reintenta la **misma** URL que ya falló | `useAtlasMap.js:1224-1232`: el bloque `catch (e1)` vuelve a llamar `fetchJson('/data/atlas_stats.json')` — el mismo archivo, sin backoff ni alternativa real hasta el tercer intento (`atlas.geojson` + recomputar) | Bajo — es un caso raro (solo dispara si el primer fetch falla), y el tercer nivel de fallback sí es genuino | Bajo: podría documentarse como intencional (reintento simple de red transitoria) o añadir un pequeño delay; no urgente |
| Doble carga de `municipios.geojson` | `useAtlasMap.js:206-207`: se agrega como fuente `veredas`/`municipios` Y por separado como `municipios-score` (línea 198-203) con el mismo archivo | Muy bajo — el archivo pesa 48 KB, impacto de red despreciable | Bajo: podría compartirse una sola fuente con dos estilos de layer, pero no es prioritario dado el tamaño |
| Sin `Suspense`/skeleton dedicado en `/simulador` mientras `cargarDatos()` trae 7.3 MB + CSV | `useSimulador.js:110-127` sí expone `cargando`/`error` reactivos, pero no se auditó el componente de la página para confirmar que se usan con una UI de carga clara (fuera del alcance de este frente — lo cubre mejor el frente de producto/UX) | No evaluado | — |

En general, el patrón de manejo de errores del repo es **más maduro que lo típico
para un proyecto de este tamaño** — el hallazgo dominante de esta auditoría no es la
robustez ante errores sino el volumen de datos que se mueve de forma incondicional.

---

## 7. Tabla de hallazgos priorizados

| # | Hallazgo | Impacto | Esfuerzo | Disponible ya (sin gestión) |
|---|---|---|---|---|
| 1 | 40 fuentes GeoJSON (~82 MB crudos) se cargan eager en `loadAtlasLayer()`, `useAtlasMap.js:166-1254`, sin relación con qué capas activa el usuario | Alto | Medio | Sí |
| 2 | `/api/uraba/**` (5 endpoints, `server/api/uraba/**`) da 404 en producción porque el Build Command de Vercel usa `nuxt generate` en vez de `npm run build`, pese a que `nuxt.config.ts` declara SSR | Alto | Bajo–Medio (según opción elegida) | Sí (Opción B); Opción A requiere decisión externa (dashboard Vercel) |
| 3 | `catastro_igac_uraba.geojson` (16 MB, `useAtlasMap.js:1097`) es el archivo más pesado del repo y se carga siempre pese a ser una capa de referencia off-by-default | Alto | Medio | Sí (herramienta `tippecanoe` ya instalada) |
| 4 | `.json`/`.csv` bajo `/data/` no tienen regla de cache en `vercel.json` (confirmado con `curl`: `cache-control: public, max-age=0, must-revalidate`), pese a cambiar solo cuando corre un script de recálculo | Medio | Bajo | Sí |
| 5 | Fix de esfuerzo mínimo: mover cada `addSource()` de `loadAtlasLayer()` a dentro de `toggleLayer()` (lazy-on-first-toggle) para las ~30 capas que no se migren a PMTiles | Alto | Bajo | Sí |
| 6 | `atlas_enriquecido.geojson` (11 MB, `useAtlasMap.js:998-1000`) alimenta 5 sub-capas del "Atlas v2" — una sola conversión a PMTiles cubre las 5 | Medio-Alto | Medio | Sí |
| 7 | `CompararMiniMapa.vue:62` y `useSimulador.js:115` vuelven a descargar `atlas.geojson` completo (7.3 MB / ~1.2 MB brotli) en vez de usar `atlas.pmtiles` ya existente | Medio | Medio (simulador necesita todas las features; minimapa de `/comparar` sí es candidato directo) | Sí para `/comparar`; el simulador requiere más diseño |
| 8 | `prioridad_inversion.geojson`, `clasificacion_suelo.geojson`, `aislamiento_manzanas.geojson`, `conflicto_uso_manzanas.geojson` (juntos ~25 MB) ya usan `promoteId`, mismo patrón que `atlas.pmtiles` — conversión de plantilla repetible | Medio | Medio | Sí |
| 9 | Posibles archivos huérfanos en `public/data` (p.ej. `conflictos_uso.geojson` vs `conflicto_uso_manzanas.geojson`, `atlas_slim.geojson`) — no confirmado, requiere grep de verificación | Bajo–Medio (peso de deploy/repo, no de runtime si no se referencian) | Bajo | Sí |
| 10 | Sin `app/error.vue` de marca — cae al error genérico de Nuxt | Bajo | Bajo | Sí |
| 11 | `runap_areas.geojson` (4.7 MB) e `ideam_inundacion.geojson` (4.4 MB) son datos oficiales estables (poco cambiantes), buenos candidatos de PMTiles con cache larga | Medio | Medio | Sí |
| 12 | El bundle JS del cliente (1.6 MB, dominado por MapLibre) ya está bien manejado (dynamic import + code-splitting por ruta) — **no requiere acción**, se documenta para que no se re-investigue | — | — | — |

---

## 8. Fuera de alcance de este dossier

- No se evaluó el pipeline Python (`recalc_v3.py`, `script_clasificacion.py`,
  `scripts/compute_equidad.py`) más allá de confirmar que existen y qué archivos
  producen — pertenece a un frente de datos/metodología, no de arquitectura web.
- No se corrió un build completo de `nuxt generate` con la Opción B implementada
  para medir tiempo real de build con 7,028 rutas de API prerenderizadas — es la
  siguiente validación necesaria antes de comprometerse a esa ruta.
- No se auditó accesibilidad (a11y), SEO más allá de lo que ya declara
  `nuxt.config.ts` (meta tags OG/Twitter completos), ni la calidad de los estados
  de carga página por página del simulador — quedan mejor cubiertos por un frente de
  producto/UX.
- No se verificó cuántas veces cada capa opcional se activa en uso real (no hay
  analítica en el repo) — la priorización de PMTiles en §2 se basa en tamaño y en el
  hecho de que todas parten con `visibility: 'none'`, no en datos de uso real.

---

## Verificación adversarial (undefined)

**Metodología**: se releyó cada `file:line` citado en el repo local, se recontaron
`addSource`/`promoteId` con `grep`/`python3` sobre `useAtlasMap.js`, se recalculó el
peso total de las 40 fuentes byte a byte, se repitieron en vivo los `curl` contra
`https://uraba.tensor.lat` (código HTTP, `cache-control`, `content-encoding`,
`size_download`), se corrió el `grep` de huérfanos que el propio dossier proponía sin
ejecutar, y se verificaron los 5 commits citados con `git log`/`git show`. Veredicto
por hallazgo (numeración según la lista de entrada):

1. **Carga eager de ~40 fuentes GeoJSON (~82MB)** — **CONFIRMADO**, con precisión
   sorprendente. Recuento independiente: `python3` sobre `useAtlasMap.js` encuentra
   exactamente **40 nombres de archivo `.geojson` distintos** referenciados en
   `addSource`, suma exacta **85,935,690 bytes** (= 81.95 MiB, coincide con el "≈82 MB"
   del dossier al usar la convención MiB de `du`). `toggleLayer()` (líneas 1274-1343,
   confirmado con `sed`) en efecto solo llama `setLayoutProperty(..., 'visibility', ...)`
   — no hay ninguna rama con `addSource` condicionado. Impacto/esfuerzo se mantienen
   (Alto/Medio).
2. **Fix lazy-on-first-toggle** — **CONFIRMADO** como viable de bajo esfuerzo: el
   propio archivo ya usa el patrón `if (!map.value.getSource(id))` en al menos un
   lugar (`useAtlasMap.js:197`, para `municipios-score`), así que no es un patrón
   nuevo a introducir sino a replicar. Impacto/esfuerzo se mantienen (Alto/Bajo).
3. **API 404 en producción** — **CONFIRMADO** con `curl` repetido en esta verificación:
   `HTTP_CODE:404` contra `https://uraba.tensor.lat/api/uraba/municipios` (igual que
   en la auditoría original). `HANDOFF.md:30-34` confirma el diagnóstico previo
   ("La API REST `/api/uraba/**` (FASE 4) está 404 en producción"). `nuxt.config.ts`
   confirma el preset `vercel` + comentario explícito de la contradicción. Impacto Alto
   se mantiene. Nota de matiz (no invalida el hallazgo): el esfuerzo "Bajo" de esta
   entrada describe solo *confirmar* el diagnóstico (trivial); la *remediación* real
   vive en el hallazgo hermano (Opción B, esfuerzo Medio) — se sugiere que el dossier
   deje explícito que "Bajo" aquí se refiere únicamente a la constatación, no al fix,
   para evitar que un lector confunda ambos esfuerzos (no se edita la tabla original
   para no romper trazabilidad con §7, se deja como nota aquí).
4. **Opción B — prerender estático de `/api/uraba/**`** — **CONFIRMADO** como
   técnicamente disponible ya: `nuxt.config.ts` tiene `nitro.prerender.routes` con las
   8 rutas `/brief/*` reales (confirmado leyendo el archivo), y el commit `85b4eb4`
   ("fix: prerender de las 8 rutas /brief/* — el build de Vercel es estático (nuxt
   generate) y las rutas dinámicas daban 404 en producción") existe tal cual en
   `git log`. `server/utils/uraba.js` confirmado: usa `useStorage('assets')` con
   `server:data:<archivo>`, patrón compatible con build-time prerender (no depende de
   request runtime). Impacto/esfuerzo se mantienen (Alto/Medio).
5. **`catastro_igac_uraba.geojson` (16MB) siempre se descarga** — **CONFIRMADO**:
   `du -ah public/data` reproduce 16M exacto; `useAtlasMap.js:1097` en efecto contiene
   `addSource('catastro', { type: 'geojson', data: '/data/catastro_igac_uraba.geojson' })`
   dentro de `loadAtlasLayer()`, con la layer en `visibility: 'none'`; `tippecanoe`
   confirmado instalado en `/opt/homebrew/bin/tippecanoe`. Impacto/esfuerzo se
   mantienen (Alto/Medio).
6. **`atlas_enriquecido.geojson` (11MB) alimenta 5 sub-capas** — **CONFIRMADO**:
   `useAtlasMap.js:998-1000` en efecto define un único `addSource('atlas-enriquecido',
   ...)` con `promoteId: '_fid'`, y `toggleLayer()` lista las 5 layers
   (`enriquecido-atlas-v2`, `enriquecido-accesibilidad-v2`, `enriquecido-ndvi`,
   `enriquecido-impermeabilizacion`, `enriquecido-ambiental-v2`) como entradas
   independientes del `layerMap` — confirma que las 5 comparten la misma fuente.
   Impacto/esfuerzo se mantienen (Medio/Medio).
7. **`vercel.json` sin regla de cache para `.json`/`.csv`** — **CONFIRMADO** al 100%:
   `vercel.json` leído íntegro solo tiene reglas para `.pmtiles` y `.geojson`. `curl`
   repetido en vivo reproduce exactamente lo citado: `atlas_stats_v3.json` y
   `isocronas_osrm_real.csv` devuelven `cache-control: public, max-age=0,
   must-revalidate`, mientras `.geojson` devuelve `max-age=86400` y `.pmtiles`
   `max-age=2592000, immutable`. Impacto/esfuerzo se mantienen (Medio/Bajo).
8. **`CompararMiniMapa.vue`/`useSimulador.js` re-descargan `atlas.geojson`** —
   **CONFIRMADO** línea por línea: `CompararMiniMapa.vue:62` es literalmente
   `map.addSource('atlas-mini', { type: 'geojson', data: '/data/atlas.geojson' })`
   dentro de `map.on('load', ...)`; `useSimulador.js:115-116` hace
   `Promise.all([fetch('/data/atlas.geojson')..., fetch('/data/isocronas_osrm_real.csv')...])`.
   Ninguno de los dos usa `atlas.pmtiles`. Impacto/esfuerzo se mantienen (Medio/Medio).
9. **4 capas con `promoteId` comparten patrón** — **REFUTADO PARCIALMENTE, CORREGIDO**.
   `grep -n "promoteId" useAtlasMap.js` muestra que solo **3 de los 4 archivos
   listados** usan `promoteId`: `prioridad_inversion.geojson` (línea 799,
   `promoteId: '_fid'`), `aislamiento_manzanas.geojson` (línea 953,
   `promoteId: 'cod_manzana'`) y `conflicto_uso_manzanas.geojson` (línea 971,
   `promoteId: 'cod_manzana'`). **`clasificacion_suelo.geojson` (línea 769) NO tiene
   `promoteId`** — su `addSource` es
   `{ type: 'geojson', data: '/data/clasificacion_suelo.geojson' }`, sin el campo.
   Esto no invalida la recomendación de migrar `clasificacion_suelo.geojson` a
   PMTiles (sigue siendo un buen candidato por tamaño y por ser polígonos
   categóricos simples con `match`), pero sí invalida el argumento específico de "ya
   usa el mismo patrón `promoteId` que `atlas.pmtiles`" para ese archivo. **Corrección**:
   el peso conjunto de los 3 archivos que sí comparten el patrón `promoteId` es
   7.2+5.8+5.4 = **18.4 MB** (no ~25MB); `clasificacion_suelo.geojson` (7.1MB) se
   mantiene en la lista de candidatos PMTiles pero por mérito propio (§2, fila P1),
   no por el argumento de este hallazgo. Impacto se mantiene Medio; esfuerzo se
   mantiene Medio.
10. **Archivos huérfanos en `public/data`** — **CONFIRMADO Y AMPLIADO**. El dossier
    proponía el `grep` de verificación pero no lo había ejecutado; esta auditoría lo
    corrió: hay **7 archivos huérfanos** (ningún `app/**` los referencia por nombre),
    no solo los 2 mencionados como ejemplo — `atlas_slim.geojson` (5.8MB),
    `conflictos_uso.geojson` (5.1MB), `smbyc_deforestacion_choco.geojson` (2.1MB),
    `resguardos_indigenas_osm_backup.geojson` (928KB), `zonas_urbanas.geojson` (168KB),
    `manglares_uraba_points.geojson` (108KB), `fincas_g20.geojson` (48KB) — **14 MB
    totales de peso muerto de repo/deploy**, más del doble de lo que el dossier
    estimaba como hipótesis. Se pasa de "no confirmado" a **confirmado con evidencia
    exacta**; impacto sigue siendo Bajo-Medio porque no afecta runtime (nunca se
    descargan en el navegador, solo pesan en el repo/build), pero el hallazgo gana
    solidez y podría re-etiquetarse "impacto: bajo, pero cuantificado (14MB, 7
    archivos)" en vez de dejarlo como hipótesis abierta.
11. **Sin `app/error.vue` de marca** — **CONFIRMADO**: `find app -iname "error.vue"`
    no devuelve resultados; solo existe `app/app.vue`. Impacto/esfuerzo se mantienen
    (Bajo/Bajo).
12. **Manejo de errores del mapa ya resuelto** — **CONFIRMADO** en sus tres piezas:
    `AtlasMap.vue:41-45` envuelve `initMap()` en `try/catch` y emite
    `emit('error', e.message || 'Error al inicializar el mapa')`; `index.vue` muestra
    `<ErrorState v-if="store.error" ... @retry="retryLoad" />` (el componente real se
    llama `ErrorState`, no un overlay inline — detalle menor, el comportamiento
    descrito es correcto); el timeout de 8s existe literal en
    `useAtlasMap.js:151-158` con el comentario exacto sobre el ajuste de 4s→8s por
    observación en móvil. El fallback PMTiles→GeoJSON con chequeo de `content-type`
    también se confirma en `useAtlasMap.js:166-193`. Impacto/esfuerzo se mantienen
    (Bajo/Bajo). Verificación adicional no solicitada pero relevante: el "doble carga
    de `municipios.geojson`" mencionado en §6.2 también se confirma
    (`useAtlasMap.js:197-207`: `municipios-score` con `promoteId` y `municipios` sin
    él, mismo archivo, dos `addSource` distintos) y el patrón de reintento de
    `loadStats()` a la misma URL también se confirma exacto
    (`useAtlasMap.js:1224-1230`: el bloque `catch (e1)` vuelve a llamar
    `fetchJson('/data/atlas_stats.json')`, el mismo archivo).

**Resumen del veredicto**: de los 12 hallazgos verificados, **11 se confirman sin
cambios** y **1 requiere corrección factual** (hallazgo 9: 3 de 4 archivos usan
`promoteId`, no 4; total corregido 18.4MB no ~25MB — la recomendación de migrar los 4
archivos a PMTiles se mantiene válida, solo cambia el argumento de precedente para
`clasificacion_suelo.geojson`). El hallazgo 10 (huérfanos) pasa de hipótesis no
verificada a hecho confirmado con cifra exacta (14MB, 7 archivos). Todos los números
citados con `curl` en vivo (códigos HTTP, `cache-control`, `content-encoding`,
`size_download`) se reprodujeron de forma idéntica en esta verificación independiente,
igual que los 5 commits citados en §9.

---

## 9. Fuentes

- Código fuente del repo, `file:line` citado inline en cada sección (consultado
  2026-07-07).
- `HANDOFF.md` del repo, sección "Hallazgo de infraestructura" (fecha del propio
  documento: 2026-07-07) — contrastado y confirmado con evidencia externa en esta
  auditoría.
- `git log --oneline -5` del repo (commits `7b1c024`, `d2adfe9`, `e56b009`, `85b4eb4`,
  `42b1cf4`), consultado 2026-07-07.
- Verificaciones en vivo contra `https://uraba.tensor.lat` vía `curl` (headers,
  códigos de estado, tamaños de descarga), consultado 2026-07-07.
- `du`/`stat`/`grep` sobre `public/data` y `app/composables/useAtlasMap.js` del repo
  local, consultado 2026-07-07.
