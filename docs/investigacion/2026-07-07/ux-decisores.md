# Auditoría UX/Producto para decisores — Atlas Urabá

**Frente:** UX/Producto para decisores (alcaldes, funcionarios DNP/Gobernación, cooperación internacional, gremios agro)
**Fecha de consulta:** 2026-07-07
**Método:** lectura del código fuente (`/Users/cristianespinal/atlas-uraba-web`, solo lectura) + verificación en vivo de `https://uraba.tensor.lat` y sus rutas (`curl`, sin JS ejecutado salvo lo indicado).
**Convención:** toda afirmación cita `file:line` (código) o URL (sitio vivo). Lo no verificable en vivo (sin ejecutar JS real de MapLibre) se marca **[hipótesis]**.

---

## 0. Resumen ejecutivo

El atlas tiene una base de producto sólida para un mapa territorial: permalinks funcionales, exportación CSV filtrada, ficha de política imprimible por municipio, y un panel de capas bien organizado con "vistas rápidas". Pero para la audiencia específica de **decisores no técnicos** (alcaldes, DNP, cooperación) hay tres brechas de alto impacto y bajo esfuerzo:

1. **El filtro por score/zona (que alimenta el CSV y el permalink) no tiene interfaz en desktop** — es un componente huérfano. Un alcalde en laptop no puede filtrar; solo en mobile.
2. **`/comparar`, `/simulador` y `/cadena` no tienen estado en la URL** — no se puede compartir por WhatsApp/correo una comparación específica ni una simulación, solo la vista del mapa principal.
3. **No hay glosario ni página de metodología** — las siglas de zona LISA (HH/LL/HL/LH/NS) y los pesos del índice v3 no se explican en ningún lugar accesible al usuario final; solo hay una lista de fuentes.

Además: no existe versión en inglés (bloqueante para cooperación internacional), no hay tour/onboarding, no hay exportación a Excel ni PNG del mapa, y el SEO/OG está bien resuelto solo en la home (las otras 4 rutas heredan el título/descripción genérico de la home o no tienen ninguno).

---

## 1. Qué SÍ existe (verificado, para no proponer duplicados)

### 1.1 Permalinks — parcial, solo en el mapa principal
El mapa principal (`/`) sincroniza `municipioActivo` y `dimension` a la URL vía `history.replaceState` en un watcher (`app/pages/index.vue:216-222`), y hay un botón "Compartir" explícito que arma la URL con `mun`, `dim`, `smin`, `smax` y la copia al portapapeles (`app/components/ShareButton.vue:30-48`). Confirmado en vivo: `GET /` responde `200` (`curl -s -o /dev/null -w "%{http_code}"` → `200`, consultado 2026-07-07).

Falta: el permalink **no incluye centro/zoom del mapa** (`ShareButton.vue:30-42` solo arma `mun/dim/smin/smax`), así que "compartir la vista actual" no reproduce un encuadre distinto al centro por defecto del municipio. Y como se detalla en §2.1, `smin`/`smax` casi nunca tendrán valor porque no hay UI de desktop para fijarlos.

### 1.2 Exportación de datos — solo CSV, solo en el mapa principal
`DownloadButton.vue` descarga un CSV de las manzanas filtradas (`municipio`, 8 scores/campos) honrando `municipioActivo`, `filterMin/Max` y `zonaFilter` del store (`app/components/DownloadButton.vue:33-88`). Funciona: hace `fetch('/data/atlas.geojson')` completo (7.68 MB, confirmado con `curl -sI https://uraba.tensor.lat/data/atlas.geojson` → `content-length: 7685867`, 2026-07-07) y filtra client-side.

Falta: no hay exportación a Excel/XLSX, no hay exportación de la capa de catastro IGAC ni de ninguna otra de las ~70 capas listadas en `ROADMAP.md`, y no hay export de imagen (PNG/SVG) del mapa — confirmado: cero coincidencias para `toDataURL|getCanvas|html2canvas|screenshot` en `app/components/*.vue`.

### 1.3 Ficha de política (policy brief) — existe, y por partida doble

Hay **dos** implementaciones distintas de "ficha municipal", con contenido parecido pero código separado:

- **`app/pages/brief/[municipio].vue`** (278 líneas): página de ruta propia, genera una hoja A4 por municipio con score v3, comparación vs. Urabá/Antioquia/Colombia, narrativa determinística de gaps, equidad interna (Gini, brecha p90-p10), top-5 manzanas prioritarias, economía agro y señales satelitales, con botón "Descargar PDF" que dispara `window.print()` (`brief/[municipio].vue:225`). Las 8 rutas de municipio están prerrenderizadas explícitamente (`nuxt.config.ts:14-19`). Verificado en vivo: `https://uraba.tensor.lat/brief/apartado` → `200` (2026-07-07). **Tiene URL propia y por tanto es enlazable/compartible.**
- **`app/components/FichaMunicipal.vue`** (1037 líneas): un modal overlay dentro del mapa principal, activado por el estado local `fichaOpen` de `index.vue:142,116` (no un `ref` de ruta), con `role="dialog" aria-modal="true"` correctamente etiquetado (`FichaMunicipal.vue:9`) y su propio botón "Brief PDF" → `window.print()` (`FichaMunicipal.vue:18,419`). Lee `store.municipioActivo` reactivamente (`FichaMunicipal.vue:271-283`) y hace sus propios `fetch()` a `gap_analysis.json`/`benchmarks.json` (`FichaMunicipal.vue:251-252`) — datos que se solapan con los que ya carga `brief/[municipio].vue`. **No tiene estado en la URL**: el parámetro `mun` del permalink del mapa (§1.1) selecciona el municipio correcto, pero no puede indicar "y abre la ficha" — quien reciba el link ve el mapa, no la ficha abierta.

Ambas comparten fuente de datos pero son dos árboles de componentes/estilos distintos que hay que mantener en paralelo — riesgo de que diverjan (ej. si se corrige una cifra o narrativa en una y no en la otra).

Con todo, esta sigue siendo, junto con el permalink del mapa, la pieza de producto que mejor sirve a la audiencia de decisores: es exactamente el artefacto de una página que un alcalde lleva a un cabildo o un cooperante adjunta a un informe — sobre todo la versión de ruta propia (`/brief/[municipio]`), que sí es compartible por link directo.

### 1.4 Panel de capas — bien resuelto
`LayerPanel.vue` tiene "vistas rápidas" (conjuntos temáticos con un clic) y un accordion de temas con contador de capas activas (`app/components/LayerPanel.vue:24-60`). No es una lista plana de ~70 checkboxes — está curado. No se detectó una versión equivalente sin curar en ningún otro punto del código.

### 1.5 Modo presentación — construido pero no montado
`PresentationMode.vue` implementa fullscreen + tecla Esc (`app/components/PresentationMode.vue:23-51`), pero **no aparece importado en ningún `page` ni `component`** (`grep -rln "PresentationMode" app/pages app/components` → sin resultados, 2026-07-07). Es código muerto: la función "presentar en pantalla completa para una reunión" está construida pero inalcanzable desde la UI.

### 1.6 Tooltips editoriales contextuales
`EditorialTooltip.vue` carga `/data/editorial.json` y muestra una descripción del indicador activo + nota específica del municipio activo + fuente (`app/components/EditorialTooltip.vue:24-35`). Es una explicación en contexto, indicador por indicador — más cerca de "ayuda contextual" que de un glosario navegable (ver §3).

### 1.7 `/comparar` — herramienta real, no un mockup

`app/pages/comparar.vue` (652 líneas) es una herramienta de comparación funcional, no un placeholder: dos selectores (Municipio A/B) con botón de intercambio (`comparar.vue:37-41`), preselección automática del #1 y el #8 del ranking v3 al cargar (`comparar.vue:145-150`), una columna de "Diferencia A − B" por dimensión con la mayor brecha resaltada (`comparar.vue:56-91`), mini-mapas por municipio (`CompararMiniMapa`, `comparar.vue:101-111`) y enlaces directos a la ficha A4 de cada uno (`comparar.vue:53,97`, enlaza a `/brief/[slug]`, es decir sí conecta con la pieza exportable de §1.3 aunque el propio comparador no exporte nada). Carga `atlas_stats_v3.json`, `gap_analysis.json` e `isocronas_municipio.json` vía `useFetch(..., { server:false, lazy:true })` (`comparar.vue:131-133`), documentado en el propio código como necesario para evitar fallos de SSR en la función serverless (`comparar.vue:126-130`).

### 1.8 `/simulador` — la pieza más alineada con la pregunta del alcalde

`app/pages/simulador.vue` (629 líneas) responde literalmente a la pregunta "¿qué pasa con el bienestar si pongo un equipamiento aquí?" (subtítulo propio, `simulador.vue:11`): el usuario elige un tipo de equipamiento (salud o educación, `simulador.vue:52-68`), hace clic en el mapa para colocar un punto hipotético (`simulador.vue:26-32`), y el panel de resultados muestra manzanas beneficiadas, mejora promedio y mejora máxima de accesibilidad, con radio de influencia y velocidad efectiva asumida (`simulador.vue:90-114`). Cuando no hay mejora, explica por qué en vez de mostrar un estado vacío mudo ("el equipamiento más cercano ya queda igual o más cerca... prueba una zona roja/naranja", `simulador.vue:116-119`) — buen manejo de caso límite. Es, junto con la ficha de municipio, la funcionalidad que más directamente traduce el dato en una decisión accionable — pero comparte las mismas dos brechas que `/comparar`: sin estado en URL (§2.2) y sin exportación de resultado.

### 1.9 robots.txt permite indexación; sitemap.xml no existe
`https://uraba.tensor.lat/robots.txt` → `200`, contenido `User-Agent: *\nDisallow:` (permite todo, consultado 2026-07-07), coincide con `public/robots.txt:1-2`. Pero `https://uraba.tensor.lat/sitemap.xml` → `404` (2026-07-07). El sitio es indexable pero no ayuda a los rastreadores a descubrir `/comparar`, `/simulador`, `/cadena` ni las 8 rutas de `/brief/*`.

---

### 1.10 Experiencia mobile del mapa principal — bien resuelta, y es la única con filtros completos

`app/pages/index.vue:150-160` define breakpoints explícitos (`isMobile: w<640`, `isTablet: 640-1023`) y monta un componente dedicado, `MobileSheet.vue` (~1450 líneas), que reorganiza Índice/Diagnóstico/Capas/**Filtros** en un bottom sheet con pestañas (`MobileSheet.vue:655-660`). Irónicamente, como ya se documentó en §2.1, **esta es hoy la única superficie del producto donde existe una UI de filtro por score/zona** — mejor resuelta en mobile que en desktop, que es lo inverso de lo esperable para la audiencia principal (funcionarios en oficina, en laptop). El sidebar de escritorio (`SidePanel.vue`) no tiene pestaña de filtros equivalente a la de `MobileSheet.vue`.

En tablet (640-1023px), `SidebarToggle.vue` permite colapsar/expandir el sidebar (`index.vue:33-35`, `sidebarVisible` computado en `index.vue:156-160`), lo cual es razonable, pero en ese mismo rango tampoco hay acceso a filtros (`FilterBar.vue` sigue sin montarse para ningún breakpoint de escritorio/tablet).

### 1.11 `MapLegend.vue` — la leyenda principal SÍ es legible sin glosario, a diferencia de los filtros de zona

A diferencia de los códigos LISA (HH/LL/HL/LH/NS) sin explicación que se documentan como brecha en §2.3, la leyenda por defecto del "Índice Atlas" (la que ve el usuario la mayoría del tiempo, activa cuando no hay capa de prioridad de inversión) sí usa lenguaje llano: extremos rotulados "Crítico" / "Excelente" sobre el gradiente 0-100 (`MapLegend.vue:26-29`), más una lista de rangos con conteo de manzanas por rango (`MapLegend.vue:31-37`). Esto confirma que el criterio de "no usar jerga sin explicar" sí se aplicó en una parte del producto — el gap de §2.3 es específicamente sobre los códigos de zona LISA y la metodología del índice compuesto, no sobre toda la interfaz por igual.

### 1.12 Buscador de lugares — depende de Nominatim (OpenStreetMap) público, sin backend propio

`GeocoderSearch.vue:95-96` llama directo a `https://nominatim.openstreetmap.org/search` desde el navegador del usuario, acotado a un `viewbox` de Urabá y `countrycodes=co` — sin API key, sin proxy propio, sin caché de servidor. Es una elección pragmática razonable (cero costo, cero mantenimiento de infraestructura de geocoding), pero implica dos riesgos operativos a tener en cuenta si el uso crece: (a) la política de uso de Nominatim pide máximo ~1 solicitud/segundo y bloquea IPs que abusen, sin backoff visible en el código; (b) cada búsqueda del usuario (que puede incluir el nombre de una vereda o finca sensible) sale directo a un servidor de terceros sin intermediación — no es un problema de privacidad grave dado que es información pública de topónimos, pero vale la pena que quede documentado como dependencia externa no cacheada.

### 1.13 `DiagnosticoPanel.vue` — el panel que más habla el idioma del decisor

Es, literalmente por comentario de código, el panel diseñado "para tomadores de decisión" (`app/pages/index.vue:204`, wrapper de `DiagnosticoPanel`). Con `store.municipioActivo === 'Todos'` muestra un ranking regional de 8 municipios con línea de promedio de referencia superpuesta sobre cada barra (`DiagnosticoPanel.vue:20-58,44-45`) y una distribución de manzanas por nivel de bienestar (`DiagnosticoPanel.vue:70-90`). Al seleccionar un municipio, cambia a un diagnóstico de 6 bloques numerados (D1-D6): diagnóstico narrativo, KPIs, comparación contra Urabá/Antioquia (`DiagnosticoPanel.vue:242-293`), fortaleza vs. brecha prioritaria en formato de dos píldoras (`DiagnosticoPanel.vue:295-324`) y top-5 manzanas de mayor déficit (`DiagnosticoPanel.vue:326-...`). Emite `open-ficha` para enlazar hacia `FichaMunicipal.vue` (§1.3) cuando el usuario quiere el artefacto exportable (`index.vue:41,116`, `DiagnosticoPanel.vue` prop `@open-ficha="$emit('open-ficha')"` en `SidePanel.vue:205`).

Es, junto con el simulador (§1.8), el componente que mejor traduce "dato" en "lectura para decidir" sin que el usuario tenga que interpretar un mapa coroplético por sí solo. Su limitación es la ya cubierta en §2.1/§2.2: nada de lo que arma D1-D6 se puede compartir salvo abriendo la ficha (que sí es exportable) — el panel de diagnóstico en sí no tiene "copiar resumen" ni export propio.

## 2. Brechas de alto impacto (accionables)

### 2.1 [CRÍTICO] El filtro de score/zona no existe en desktop — solo en mobile

`FilterBar.vue` implementa sliders de rango de score (0-100) y botones de zona LISA (HH/LL/HL/LH), consumiendo `store.filterMin`, `store.filterMax`, `store.zonaFilter` (`app/components/FilterBar.vue:13-45`). Es exactamente la UI que alimenta el CSV filtrado (§1.2) y el permalink `smin/smax` (§1.1).

**Pero `FilterBar.vue` no está importado en ningún archivo de `app/pages` ni `app/components`** — verificado con `grep -rln "FilterBar" app/pages app/components` → sin resultados (2026-07-07). El único lugar donde el usuario puede tocar `filterMin/filterMax/zonaFilter` es dentro de `MobileSheet.vue` (pestaña "Filtros", líneas `app/components/MobileSheet.vue:218-256`), que por diseño **solo se muestra bajo el breakpoint mobile** (`app/pages/index.vue:150-160`: `isMobile = w < 640`; `sidebarVisible` para tablet/desktop no monta `MobileSheet`).

**Consecuencia real:** un alcalde o funcionario de DNP usando laptop/desktop (el dispositivo típico en una reunión de gabinete o una oficina de planeación) no tiene ninguna forma de responder "muéstrame solo las manzanas críticas (zona LL) con score bajo 40" — la pregunta más natural para priorizar inversión. Solo puede hacerlo si abre el sitio en un teléfono. El botón `ShareButton` también queda parcialmente muerto en desktop: sus parámetros `smin/smax` casi nunca tendrán un valor distinto de los default porque no hay forma de cambiarlos.

**Esfuerzo:** bajo. `FilterBar.vue` ya existe y funciona contra el store; solo falta montarlo condicionalmente para tablet/desktop (ej. en `SidePanel.vue` o como barra fija bajo `AppHeader`, análogo a como ya vive en `MobileSheet`). Nota de calidad menor adicional: los dos `<input type="range">` de `FilterBar.vue` no tienen `aria-label` ni `<label>` asociado (`FilterBar.vue:13-24`), y `.atlas-range { outline: none; }` (`FilterBar.vue:87`) suprime el foco de teclado sin sustituto visible — corregir al mismo tiempo que se monta el componente.

### 2.2 [ALTO] `/comparar`, `/simulador` y `/cadena` no tienen estado en la URL

Búsqueda de `URLSearchParams|history.replaceState|route.query` en las tres páginas → cero resultados (`grep -n ... app/pages/comparar.vue app/pages/simulador.vue app/pages/cadena.vue`, 2026-07-07). Las selecciones de municipio A/B en `comparar.vue` viven en refs locales (`const munA = ref(null)`, `const munB = ref(null)`, `app/pages/comparar.vue:143-144`) sin persistencia ni sincronización a la URL. Lo mismo aplica a cualquier selección en `simulador.vue`.

**Consecuencia real:** un funcionario de la Gobernación que arma "Turbo vs. Necoclí" en `/comparar` para enviarlo a un colega por WhatsApp solo puede compartir el link genérico `uraba.tensor.lat/comparar` — la otra persona llega a una página vacía y tiene que rehacer la selección. Rompe el flujo de "esto se comparte para tomar una decisión juntos", que es el caso de uso central de un atlas de decisión.

Nota adicional: ni `comparar.vue` ni `simulador.vue` tienen ningún mecanismo de exportación propio (CSV, print, imagen) — verificado, cero coincidencias de `download|csv|CSV|print|pdf|PDF` en ambos archivos (2026-07-07). El único artefacto exportable del sitio sigue siendo la ficha de municipio individual (§1.3), no la comparación ni la simulación, que son justamente las herramientas donde el decisor genera el insight que quiere llevarse.

**Esfuerzo:** medio. Requiere replicar en `comparar.vue`/`simulador.vue` el patrón `watch(...) → history.replaceState` que ya existe y funciona en `index.vue:216-222`.

### 2.3 [ALTO] No hay glosario ni página de metodología accesible al usuario

La única superficie de "fuentes" en el producto es la pestaña "Fuentes" del panel lateral, que es una lista plana de siglas de origen de datos sin explicación (`CNPV 2018 DANE · REPS MinSalud · SIMAT MEN · OSM Colombia · MGN DANE 2024 · Tensor 2025`, `app/components/SidePanel.vue:218-224`). No hay ninguna definición de:
- Qué significan las zonas LISA `HH/LL/HL/LH/NS` que aparecen como botones de filtro y como leyenda de mapa (`app/components/SidePanel.vue:252-258`, `app/components/FilterBar.vue:65-70`) — un decisor no georreferenciado no sabe qué es un análisis LISA (Local Indicators of Spatial Association) sin ayuda externa.
- Cómo se pondera el índice v3 (accesibilidad/ambiental/socioeconómico/seguridad) para llegar al `atlas_score`.
- Qué diferencia v1/v2/v3 del índice (el store expone `DIMENSIONES` y `DIMENSIONES_V2` como conjuntos separados, `app/stores/atlas.js:4-21`, sin que el usuario final vea una explicación de por qué hay versiones).

Confirmado también en vivo: no existen rutas `/metodologia`, `/about` ni `/en` (los tres devuelven `404`, consultado 2026-07-07). Búsqueda de "glosario|metodolog|methodology" en todo `app/` → cero resultados (2026-07-07).

`EditorialTooltip.vue` (§1.6) da contexto indicador-por-indicador cuando el usuario ya seleccionó una dimensión, pero no es navegable ni descubrible de antemano — no reemplaza una página de metodología.

**Consecuencia real:** un cooperante o funcionario de DNP que llega al sitio por primera vez y ve "LL · Crítico" en la leyenda tiene que inferir el significado sin apoyo. Para un instrumento cuya credibilidad depende de que el decisor confíe en la metodología (recalculado con OSRM real, GEE, etc. — precisamente el trabajo hecho en `ROADMAP.md` §"TRANSVERSAL A"), no exponer esa metodología de forma legible desperdicia el rigor ya invertido.

**Esfuerzo:** medio. No requiere nuevos datos — es redactar y montar una página `/metodologia` con lo que ya está en `ROADMAP.md` (fuentes, proxy vs. real, fórmula del índice) en lenguaje no técnico, más enlazarla desde el header y desde la pestaña "Fuentes".

### 2.4 [MEDIO] Sin versión en inglés — bloqueante para cooperación internacional

Cero infraestructura de i18n: sin módulo `@nuxtjs/i18n` en `package.json`, sin rutas `/en/*`, sin toggle de idioma en `AppHeader.vue` (`grep -rln "i18n|/en/|lang-toggle|idioma" app/ nuxt.config.ts` → sin resultados, 2026-07-07). `htmlAttrs: { lang: 'es' }` está fijo (`nuxt.config.ts:42`).

**Consecuencia real:** la audiencia objetivo declarada explícitamente incluye "cooperación internacional e inversionistas" — un oficial de programa de una agencia bilateral o un fondo de inversión de infraestructura que no lee español queda fuera del producto por completo, no solo de una traducción parcial.

**Esfuerzo:** alto (requiere decidir alcance: ¿todo el sitio, o solo brief + landing + glosario?). Recomendación de alcance mínimo viable: traducir la ficha de municipio (§1.3, ya es el artefacto que más se comparte externamente) y los metadatos OG/título, antes que el mapa interactivo completo.

### 2.5 [MEDIO] SEO/OG resuelto solo en la home; genérico o ausente en el resto

`nuxt.config.ts:39-70` define un bloque completo de OG/Twitter/canonical, pero es **global y estático** — no hay `useHead` con og:description/og:image por página en `comparar.vue` (solo `title`, `comparar.vue:293`) ni en `cadena.vue` (solo `title`, `cadena.vue:236`). `simulador.vue` no tiene ningún `useHead` — confirmado, `grep -n "useHead" app/pages/simulador.vue` sin resultados (2026-07-07); hereda el `<title>` global de `nuxt.config.ts:41`.

Verificado en vivo: `curl -s https://uraba.tensor.lat/simulador | grep -o '<title>[^<]*</title>'` devuelve el título genérico de la home, `Atlas Urabá — Bienestar Humano Territorial` (2026-07-07), no algo como "Simulador de inversión — Atlas Urabá". Lo mismo para `og:description`/`twitter:description` de `/comparar`, que devuelven la descripción genérica de la home (`curl -s https://uraba.tensor.lat/comparar | grep -o '<meta[^>]*description[^>]*>'` → descripción de home, 2026-07-07).

Adicionalmente, cada `brief/[municipio].vue` solo define `title` (`brief/[municipio].vue:227`, `useHead({ title: ... })`) — sin `og:description` ni `og:image` específicos del municipio. Cuando alguien comparte el link del brief de Necoclí en WhatsApp o LinkedIn, la vista previa (si toma algo) será la genérica de `og-image.png` de la home, no algo que muestre el score o el nombre de Necoclí.

**Esfuerzo:** bajo-medio. Es replicar el patrón `useHead(computed(...))` de `index.vue:225-236` en las 4 páginas restantes, con textos específicos por ruta/municipio.

### 2.6 [MEDIO] Accesibilidad: cobertura parcial de `aria-label`/`role`

Solo 5 de 35 archivos `.vue` en `app/components`+`app/pages` usan `aria-label` o `role` (`grep -rln "aria-label|role=" app/components app/pages | wc -l` → `5` de `35`, 2026-07-07). Los botones de zona LISA (`FilterBar.vue:33-44`, `MobileSheet.vue` equivalente) son códigos de 2 letras sin `aria-label`, apoyados solo en color + texto de 8px — problemático tanto para lectores de pantalla como para legibilidad visual de un usuario mayor sin lupa. El input de búsqueda del geocoder (`GeocoderSearch.vue:162-167`) y los sliders de filtro (§2.1) suprimen `outline` sin sustituto de foco visible.

Contraparte positiva: sí existe una regla `:focus-visible` global (`app/assets/css/main.css:153`), y varios controles clave (`AppHeader.vue:27`, iconos con `aria-hidden="true"` en los links de herramientas, `AppHeader.vue:38,45,52`) están bien etiquetados, igual que el modal `FichaMunicipal.vue` (`role="dialog" aria-modal="true"`, §1.3) y el geocoder, que sí maneja `Esc` y `Enter` por teclado (`GeocoderSearch.vue:21-22`) aunque no navegación con flechas entre resultados. La cobertura es dispareja, no ausente.

**Contraste de color — verificado con cálculo WCAG 2.1 sobre los pares hexadecimales del código** (fórmula de luminancia relativa estándar, `(L1+0.05)/(L2+0.05)`):

| Texto sobre fondo | Dónde | Ratio | WCAG AA texto normal (≥4.5:1) |
|---|---|---|---|
| `#E6EDF3` sobre `#0D1117` | Texto principal, mapa dark | 16.0:1 | ✅ pasa con margen |
| `#5F5F5B` sobre `#FFFFFF` | Texto muted, header claro (`AppHeader.vue`) | 6.4:1 | ✅ pasa |
| `#8B949E` sobre `#161B22` | Texto muted, paneles dark (`SidePanel`/`DownloadButton`) | 5.6:1 | ✅ pasa |
| `#8a8a85` sobre `#FFFFFF` | **Fecha y bloque de fuentes del brief A4** (`brief/[municipio].vue:247,268`) | **3.47:1** | ❌ **falla** (solo cumple el umbral "AA large text", que no aplica: el texto real mide 7.8-8.5px) |

El caso que falla es significativo porque es, literalmente, el pie de página de trazabilidad de fuentes del documento que un alcalde presenta como evidencia oficial (`.b-fuentes`, `brief/[municipio].vue:268`, `font-size: 7.8px`) — el bloque que dice "DANE CNPV 2018 · DANE/MADR EVA... verificar cifras críticas antes de uso oficial". Combina baja legibilidad tipográfica (7.8-8.5px, menor que el mínimo recomendado de ~9-10px para impresión) con contraste insuficiente, en la sección que más necesita ser leída para que el documento sea auditable.

**Esfuerzo:** bajo (contraste/tamaño del brief: cambiar `color: #8a8a85` a algo ≥`#6b6b66` y subir 1-2px de tamaño) a medio (pasada de `aria-label` en botones de icono/código corto + reemplazar los 2 `outline: none` detectados en `FilterBar.vue:87` y `GeocoderSearch.vue:167` por un estilo de foco visible).

### 2.7 [BAJO-MEDIO] Sin `sitemap.xml`

`https://uraba.tensor.lat/sitemap.xml` → `404` (2026-07-07), pese a que `robots.txt` permite indexación total. Con 8 rutas de brief prerrenderizadas más `/comparar`, `/simulador`, `/cadena`, un sitemap ayudaría a que un buscador o un cooperante que busca "Urabá inversión banano datos" encuentre directamente el brief del municipio relevante en vez de solo la home.

**Esfuerzo:** bajo. `@nuxtjs/sitemap` o un `public/sitemap.xml` estático con las 11 rutas conocidas (home + 3 herramientas + 8 briefs, todas ya listadas en `nuxt.config.ts:14-19`).

### 2.8 [BAJO] `atlas.geojson` completo (7.68 MB) se descarga en cada clic de "CSV"

`DownloadButton.vue:51` hace `fetch('/data/atlas.geojson')` sin caché aplicada por el propio componente cada vez que el usuario pulsa el botón (el navegador puede cachearlo vía `cache-control: public, max-age=86400` del servidor, `curl -sI` confirmado, pero no hay indicador de progreso más allá del texto "Preparando…", `DownloadButton.vue:22`). En una conexión rural típica de Urabá (el propio territorio que el atlas describe), 7.68 MB puede tardar de forma perceptible sin feedback de progreso real (solo un label estático, no una barra).

**Esfuerzo:** bajo. Ya existe `atlas_slim.geojson` (6.1 MB, `public/data/atlas_slim.geojson`) y `atlas.pmtiles` (3.2 MB) — evaluar si `atlas_slim` basta para los 8 campos que exporta el CSV (`FIELDS`, `DownloadButton.vue:33-43`) y usarlo en vez del geojson completo, o precomputar un CSV estático servible directo.

---

### 2.9 [BAJO] Tiempo de carga percibido: capas GeoJSON pesadas fuera del flujo de PMTiles

El repo tiene 73 archivos en `public/data`, 103 MB en total (`du -sh public/data` → `103M`, `find ... | wc -l` → `73`, 2026-07-07). El mapa base usa `atlas.pmtiles` (3.2 MB, vector tiles — carga incremental por tile, eficiente) como fuente principal, con `atlas.geojson` como *fallback* explícito si PMTiles falla (`app/composables/useAtlasMap.js:184-193`, comentado como manejo de "fallos de PMTiles ASÍNCRONOS", línea 168). Pero **todas las demás ~35 capas opcionales del `LayerPanel` se añaden como `addSource({ type: 'geojson', data: '/data/<archivo>.geojson' })` sin tileado** — confirmado literalmente en `useAtlasMap.js`, por ejemplo `catastro` (línea 1097), `clasificacion-suelo` (línea 769), `prioridad-inversion` (línea 796-798), `aislamiento` (línea 953), `conflicto-uso` (línea 971) y `atlas-enriquecido` (línea 998-1000). Cada una de esas capas se descarga completa la primera vez que el usuario la activa desde `LayerPanel.vue`, sin tileado incremental:

| Archivo | Tamaño |
|---|---|
| `catastro_igac_uraba.geojson` | 17.2 MB |
| `atlas_enriquecido.geojson` | 11.8 MB |
| `atlas.geojson` | 7.7 MB |
| `prioridad_inversion.geojson` | 7.5 MB |
| `clasificacion_suelo.geojson` | 7.5 MB |
| `atlas_slim.geojson` | 6.1 MB |
| `aislamiento_manzanas.geojson` | 6.0 MB |
| `conflicto_uso_manzanas.geojson` | 5.6 MB |

(`ls -la public/data/*.geojson | sort -rn`, 2026-07-07). Si el usuario activa "Catastro IGAC" desde el `LayerPanel`, dispara una descarga de 17.2 MB en un solo `fetch` de MapLibre; la conexión rural típica de Urabá (el propio territorio del atlas) lo va a notar, sin ningún indicador de progreso por capa — el único loader visible en el producto es el genérico de arranque (`LoadingState.vue`, activado por `store.cargando`, `index.vue:8`), que no se reactiva cuando se activa un toggle de capa adicional después de la carga inicial. `useAtlasMap.js:1112` sí captura errores de carga de catastro con `try/catch` (`console.warn`), pero no hay manejo de UI para "capa pesada cargando" — el usuario solo ve el mapa congelado brevemente sin explicación.

**Esfuerzo:** medio-alto. Las capas de mayor tamaño (catastro 17 MB, atlas_enriquecido 12 MB, prioridad_inversion/clasificación_suelo 7.5 MB c/u) son las mejores candidatas a convertir a PMTiles siguiendo el mismo patrón ya usado para `atlas.pmtiles`; mientras tanto, un indicador de progreso por capa (spinner en el botón de `LayerToggle.vue` mientras el `fetch` está en curso) sería una mejora de bajo esfuerzo y alto valor de percepción.

### 2.10 Contraste contra el propio `ROADMAP.md` — "TRANSVERSAL B: Producto de decisión"

El roadmap del repo declara una tabla de "Producto de decisión (lo que lo hace único)" (`ROADMAP.md`, sección "TRANSVERSAL B"). Verificando cada fila contra el código real:

| Capacidad (según `ROADMAP.md`) | Estado real verificado |
|---|---|
| Comparador de municipios | ✅ Construido y funcional (§1.7), pero sin permalink (§2.2) |
| Simulador de inversión | ✅ Construido y funcional (§1.8), pero sin permalink ni export (§2.2) |
| Ficha PDF server-side | ⚠️ Existe, pero **no es server-side** — es `window.print()` client-side sobre HTML (§1.3, `brief/[municipio].vue:225`). Funciona igual de bien para el usuario final, pero la descripción del roadmap no coincide con la implementación (no hay generación server-side de PDF en `server/api/`) |
| API pública REST | ⚠️ Existe como código (`server/api/**`, mencionado en `nuxt.config.ts:7-9`), pero el propio `nuxt.config.ts:9-12` documenta que el despliegue real usa `nuxt generate` (sitio estático) y por tanto **las rutas Nitro no responden en producción** — consistente con lo ya establecido en el contexto de este encargo, no es un hallazgo nuevo pero se confirma en código |
| Modo temporal (CNPV 2005↔2018, deforestación serie) | ❌ No se encontró ningún control de selección temporal/slider de años en `LayerPanel.vue`, `FilterBar.vue` ni `MobileSheet.vue` — no auditado a fondo por estar fuera del frente UX-decisor estricto, pero no apareció evidencia de su existencia en la búsqueda de componentes |
| Backend PostGIS + Martin (vector tiles dinámicos) | ❌ Confirmado ausente por diseño: el sitio es estático (`nuxt generate`), sirve `.pmtiles` estáticos desde `public/data`, no hay tiles dinámicos servidos por un backend |

Esto no es una crítica al roadmap (que ya marca estas filas como plan, no como hecho), sino una confirmación útil para priorizar: de las 6 capacidades listadas, 2 están sólidamente construidas (comparador, simulador) con la brecha de permalink como único faltante compartido, 1 está construida pero con una arquitectura distinta a la descrita (ficha PDF), y 3 siguen siendo aspiracionales.

---

## 3. Preguntas del decisor que el atlas NO puede responder hoy

Basado en los flujos reales disponibles (no en lo que "debería" existir):

1. **"Muéstrame solo las manzanas en zona crítica (LL) de mi municipio con score bajo 40, y bájamelas a Excel."** — Imposible en desktop: no hay UI de filtro (§2.1), y no hay export a Excel, solo CSV.
2. **"Envíame el link de la comparación que acabamos de armar entre Turbo y Necoclí."** — Imposible: `/comparar` no persiste estado en URL (§2.2).
3. **"¿Qué significa 'zona LL' / 'índice v3' / 'proxy vs. real'?"** — Sin respuesta in-product; solo inferible leyendo `ROADMAP.md` (que no es público en el sitio) o preguntando al equipo (§2.3).
4. **"Necesito esto en inglés para mi oficina regional."** — Imposible, cero i18n (§2.4).
5. **"Quiero una imagen del mapa con la capa de deforestación activa para pegar en una presentación."** — Imposible: no hay export de imagen del mapa en ningún componente (§1.2, §2.2).
6. **"¿Cuánto tarda esto en cargar desde una vereda con señal débil?"** — El atlas principal usa PMTiles (3.2 MB, eficiente), pero el flujo de descarga CSV fuerza 7.68 MB adicionales sin indicador de progreso (§2.8) — [hipótesis: no verificado con throttling real de red, solo por tamaño de payload].
7. **"¿Cómo presento esto en pantalla completa en la reunión del gabinete, sin la barra del navegador encima?"** — El código para esto existe (`PresentationMode.vue`) pero no está montado en ninguna página (§1.5) — inalcanzable hoy.

---

## 4. Priorización sugerida (impacto × esfuerzo)

| # | Hallazgo | Impacto | Esfuerzo | Notas |
|---|----------|---------|----------|-------|
| 2.1 | Montar `FilterBar.vue` en desktop/tablet | Alto | Bajo | Componente ya existe y funciona; falta solo montarlo |
| 1.5 | Montar `PresentationMode.vue` en `index.vue` | Medio | Bajo | Ídem: componente ya construido, órfano |
| 2.5 | `useHead` por página (comparar/simulador/cadena/brief) | Medio | Bajo | Patrón ya existe en `index.vue`, replicar |
| 2.7 | `sitemap.xml` | Bajo | Bajo | Rutas ya conocidas y prerrenderizadas |
| 2.3 | Página de metodología/glosario | Alto | Medio | Contenido ya existe en `ROADMAP.md`, falta traducir a UI |
| 2.2 | Estado en URL para `/comparar` y `/simulador` | Alto | Medio | Replicar patrón `watch→replaceState` de `index.vue` |
| 2.6 | Pasada de accesibilidad (`aria-label`, foco visible) | Medio | Medio | Dirigida a botones de icono/código y sliders |
| 2.8 | Reducir payload de exportación CSV | Bajo | Bajo | Evaluar `atlas_slim.geojson` |
| 2.9 | Convertir capas GeoJSON pesadas a PMTiles / indicador de progreso por capa | Medio | Medio-Alto | Catastro (17 MB) es la prioridad |
| 2.4 | Versión EN (mínimo: briefs) | Alto | Alto | Requiere decisión de alcance primero |

---

## 5. Matriz de rutas — estado consolidado

Vista de conjunto de las 5 rutas principales (excluyendo las 8 sub-rutas de `/brief/*`, que comparten el patrón de la fila "Brief"), construida a partir de las verificaciones de §1-§2:

| Ruta | HTTP en vivo | `useHead`/SEO propio | Permalink de estado | Export nativo | Filtro score/zona | Mobile |
|---|---|---|---|---|---|---|
| `/` (mapa) | `200` | Sí, dinámico por municipio (`index.vue:225-236`) | Sí (`mun`,`dim`,`smin`,`smax`) | CSV filtrado | Solo en `MobileSheet` (§2.1) | `MobileSheet.vue` dedicado |
| `/comparar` | `200` | Solo `title` estático (`comparar.vue:293`) | No (§2.2) | No | N/A | Parcial (2 `@media`, `comparar.vue`) |
| `/simulador` | `200` | Ninguno — hereda el de la home (§2.5) | No (§2.2) | No | N/A | Mínimo (1 `@media`, `simulador.vue`) |
| `/cadena` | `200` | Solo `title` estático (`cadena.vue:236`) | No auditado en detalle | No auditado en detalle | N/A | Mínimo (1 `@media`, `cadena.vue`) |
| `/brief/[municipio]` (×8) | `200` (verificado `apartado`) | Solo `title`, sin `og:description`/`og:image` por municipio (§2.5) | Sí, la propia URL de ruta ES el permalink | `window.print()` → PDF | N/A | Diseñado para A4, no para viewport móvil (`.brief-a4 { width: 210mm }` fijo, `brief/[municipio].vue:242`) |

Nota: `/cadena.vue` (266 líneas, integra EVA→SIPSA→FOB según la descripción del proyecto) se registra en esta matriz por paridad de estructura, pero no se auditó su interior con el mismo detalle que `/comparar` y `/simulador` porque los hallazgos de exportación/permalink (§2.2) generalizan igual a las tres herramientas — las tres comparten el mismo patrón de carga (`useFetch(..., {server:false, lazy:true})`) y ninguna sincroniza selección a la URL.

---

## 6. Metodología de esta auditoría

- Lectura de código: `app/pages/*.vue` (5 páginas), `app/components/*.vue` (28 componentes incl. `comparar/`), `app/stores/atlas.js`, `nuxt.config.ts`, `ROADMAP.md`. Todo con `Read`/`grep`/`find`, sin ejecutar el dev server.
- Verificación en vivo: `curl` contra `https://uraba.tensor.lat` y rutas `/comparar`, `/simulador`, `/cadena`, `/brief/apartado`, `/robots.txt`, `/sitemap.xml`, `/og-image.png`, `/data/atlas.geojson` (headers), y extracción de `<title>`/`<meta>` vía `grep -o`. No se ejecutó un navegador headless real, así que el comportamiento posterior a la hidratación de Vue (p. ej. si `FilterBar` se monta dinámicamente por JS en producción pese a no estar importado estáticamente) se infiere del grafo de imports estático — **[hipótesis con alta confianza, no 100% verificado con DOM renderizado]**: dado que Nuxt/Vite no incluye componentes no importados en el bundle, un componente sin ningún `import FilterBar` en el árbol de componentes no puede aparecer en el DOM final.
- Todas las cifras de tamaño de archivo (`du`, `ls -la`) son del checkout local del repo; se asume que coinciden con lo desplegado dado que `public/data/atlas.geojson` respondió el mismo tamaño exacto en `content-length` al consultar el sitio vivo (7,685,867 bytes en ambos).
- Fecha de consulta uniforme para todas las verificaciones en vivo: **2026-07-07**.

### Alcance explícitamente NO cubierto por esta auditoría

Para que el lector calibre la confianza de cada hallazgo:

- **No se midió performance real de red** (Lighthouse, WebPageTest, throttling 3G real) — las afirmaciones de §2.8/§2.9 se basan en tamaño de payload de archivo, no en tiempo de carga cronometrado en una conexión rural real.
- **No se probó con lector de pantalla real** (VoiceOver/NVDA) — los hallazgos de accesibilidad (§2.1, §2.6) son de auditoría estática de código (presencia/ausencia de `aria-label`, `role`, `outline`), no de una sesión de uso con tecnología asistiva.
- **No se interactuó con el mapa vía navegador real** (MapLibre requiere WebGL y JS ejecutado; esta auditoría usó `curl` para HTTP/HTML/meta-tags y lectura de código para todo lo que depende de interacción). Por tanto, comportamientos que solo aparecen tras hidratación completa de Vue (p. ej. un posible fallback dinámico no capturado por el grafo estático de imports) no están 100% descartados, aunque es improbable dado cómo funciona el bundling de Vite/Nuxt.
- **No se auditó el contenido de `/cadena.vue` con el mismo detalle** que `/comparar` y `/simulador` (ver nota en §5) — se generalizó el patrón de carga/URL por similitud de código, no por inspección línea a línea de sus ~150 líneas de lógica específica.
- **No se evaluó el rendimiento del backend/API Nitro** (`server/api/**`) porque el propio contexto del proyecto establece que no funciona en producción (sitio estático vía `nuxt generate`) — fuera de alcance para una auditoría de UX de producto.

---

## Verificación adversarial (undefined)

**Método:** re-lectura directa de cada `file:line` citado (`Read`/`grep -n` sobre el checkout local) y re-ejecución de cada `curl` contra `https://uraba.tensor.lat` en vivo, el mismo día (2026-07-07), con intención de refutar. Se recalculó de forma independiente el ratio de contraste WCAG 2.1 del hallazgo de tipografía. **Resultado: los 12 hallazgos sobreviven sin refutación** — todas las líneas citadas existen exactamente donde se afirma y contienen el código descrito; todos los `curl` reprodujeron el código HTTP afirmado.

| # | Hallazgo | Veredicto | Evidencia re-verificada |
|---|---|---|---|
| 1 | FilterBar no existe en desktop | **CONFIRMADO** | `FilterBar.vue:13-45` (sliders + botones zona) leído íntegro; `grep -rln "FilterBar" app/pages app/components` → vacío, reproducido; `MobileSheet.vue:214-260` confirma que el único montaje vive en la pestaña Filtros del sheet mobile; `index.vue:150-160`/`156-160` confirma `isMobile = w<640` y que `sidebarVisible` (desktop/tablet) no monta `MobileSheet`. Impacto/esfuerzo (alto/bajo) correctos: es un componente ya cableado al store, solo falta un `<FilterBar />` condicional. |
| 2 | PresentationMode.vue no montado | **CONFIRMADO** | `PresentationMode.vue:1-51` leído íntegro: fullscreen API + listener de `Escape` + limpieza en `onUnmounted`, funcional y autocontenido; `grep -rln "PresentationMode" app/pages app/components` → vacío, reproducido. Impacto/esfuerzo (medio/bajo) correctos. |
| 3 | `/comparar`, `/simulador`, `/cadena` sin estado en URL | **CONFIRMADO** | `comparar.vue:143-144` = exactamente `const munA = ref(null)` / `const munB = ref(null)` (línea por línea, sin desfase); `grep -n "URLSearchParams\|history.replaceState\|route.query"` sobre las 3 páginas → vacío, reproducido; el patrón correcto sí existe en `index.vue:214-222` (`watch(...)→URLSearchParams→history.replaceState`), confirmado línea por línea. Impacto/esfuerzo (alto/medio) correctos: es exactamente ese patrón el que falta replicar. |
| 4 | Sin glosario ni metodología accesible | **CONFIRMADO** | `SidePanel.vue:218-224` = bloque `fuentes-text` con lista plana de siglas, sin explicación, confirmado; `FilterBar.vue:65-70` = array `zonas` con solo claves de 2 letras y color, sin texto explicativo, confirmado (nota: el código `NS` vive en `SidePanel.vue:257`, no en `FilterBar.vue`, pero la afirmación del dossier sobre `FilterBar.vue:65-70` es sobre HH/LL/HL/LH ahí presentes, correcta); `curl -o /dev/null -w "%{http_code}" https://uraba.tensor.lat/metodologia` → `404` reproducido, igual `/about` → `404`, `/en` → `404`; `grep -rln "glosario\|metodolog" app/` → vacío, reproducido. Impacto/esfuerzo (alto/medio) correctos. |
| 5 | Sin versión en inglés | **CONFIRMADO** | `nuxt.config.ts:42` = exactamente `htmlAttrs: { lang: 'es' }`, confirmado carácter por carácter; `grep -rln "i18n\|/en/\|lang-toggle\|idioma" app/ nuxt.config.ts` → vacío, reproducido; `package.json` sin dependencia de i18n, confirmado. Impacto/esfuerzo (alto/alto) correctos — bloqueante binario, no cosmético, para la audiencia de cooperación internacional que el propio encargo declara. |
| 6 | SEO/OG solo en home | **CONFIRMADO** | `app/pages/simulador.vue` sin ninguna llamada a `useHead` (`grep -n "useHead"` → vacío, reproducido); `comparar.vue:293` = exactamente `useHead({ title: 'Comparador de municipios — Atlas Urabá' })`, solo título, sin OG; `brief/[municipio].vue:227` = exactamente `useHead({ title: \`Brief · ${nombre} · Atlas Urabá\` })`, solo título; `curl https://uraba.tensor.lat/simulador \| grep -o '<title>...'` → devuelve el título genérico de home, reproducido en vivo. Impacto/esfuerzo (medio/bajo) correctos. |
| 7 | Pie de fuentes del brief falla WCAG AA + tipografía diminuta | **CONFIRMADO, cálculo re-verificado de forma independiente** | `brief/[municipio].vue:247` = `.b-fecha { font-size: 8.5px; color: #8a8a85; }`; `:268` = `.b-fuentes { ...font-size: 7.8px; color: #8a8a85; ...}`, ambos confirmados carácter por carácter. Se recalculó el contraste `#8a8a85` sobre `#FFFFFF` con la fórmula de luminancia relativa WCAG 2.1 de forma independiente (sin partir del número del dossier): L≈0.2528, ratio = (1+0.05)/(0.2528+0.05) ≈ **3.47:1** — coincide exactamente con el valor citado, y confirma que falla el umbral AA de 4.5:1 para texto normal. Impacto/esfuerzo (medio/bajo) correctos. |
| 8 | Capas GeoJSON pesadas sin tileado | **CONFIRMADO** | Las 6 líneas citadas de `useAtlasMap.js` (184-193 patrón PMTiles+fallback, 1097 catastro, 769 clasificación-suelo, 796-798 prioridad-inversión, 953 aislamiento, 971 conflicto-uso, 998-1000 atlas-enriquecido) leídas íntegras: todas usan literalmente `addSource({ type: 'geojson', data: '/data/<archivo>.geojson' })` sin ningún parámetro de tileado, confirmado; `ls -la public/data/*.geojson \| sort -rn` reproducido con los mismos 8 tamaños exactos citados (catastro 17.153.478 B ≈17.2MB, atlas_enriquecido 11.765.536 B≈11.8MB, atlas 7.685.867B≈7.7MB, prioridad_inversion 7.531.017B≈7.5MB, clasificacion_suelo 7.458.604B≈7.5MB, atlas_slim 6.104.741B≈6.1MB, aislamiento 6.047.481B≈6.0MB, conflicto_uso 5.616.397B≈5.6MB). Impacto/esfuerzo (medio/alto) correctos — es trabajo de conversión a PMTiles, no un one-liner. |
| 9 | Dos implementaciones de "ficha municipal" | **CONFIRMADO** | `brief/[municipio].vue:125-134` confirma `useFetch` de `atlas_stats_v3.json`, `gap_analysis.json`, `benchmarks.json`, etc.; `FichaMunicipal.vue:251-283` confirma `fetch('/data/gap_analysis.json')` y `fetch('/data/benchmarks.json')` propios (mismos datasets, código de carga duplicado); `:419` confirma `function imprimir() { window.print() }` como su propio mecanismo de exportación, separado del de `brief/[municipio].vue:225` (`function descargarPdf() { window.print() }`). `wc -l` confirma 1037 líneas en `FichaMunicipal.vue` (exacto) y 277 en `brief/[municipio].vue` (el dossier dice 278, desfase de una línea, irrelevante). Impacto/esfuerzo (medio/medio) correctos. |
| 10 | Sin export PNG ni Excel | **CONFIRMADO** | `grep -rln "toDataURL\|getCanvas\|html2canvas\|screenshot" app/components/*.vue app/pages/*.vue` → vacío, reproducido; `package.json` sin `xlsx`/`pdf`/`canvas`, reproducido; `grep -n "download\|csv\|CSV\|print\|pdf\|PDF" app/pages/comparar.vue app/pages/simulador.vue` → vacío, reproducido. Impacto/esfuerzo (medio/medio) correctos. |
| 11 | Sin `sitemap.xml` pese a `robots.txt` abierto | **CONFIRMADO** | `curl .../robots.txt` → `200`, contenido exacto `User-Agent: *\nDisallow:` (coincide con `public/robots.txt`, confirmado); `curl .../sitemap.xml` → `404`, reproducido. Impacto/esfuerzo (bajo/bajo) correctos. |
| 12 | Roadmap vs. arquitectura real (ficha "server-side" y API REST) | **CONFIRMADO** | `ROADMAP.md` sección "TRANSVERSAL B" (línea 106 en adelante) lista literalmente "Ficha PDF server-side" y "API pública REST" como filas de la tabla, confirmado; `brief/[municipio].vue:225` = `function descargarPdf() { window.print() }`, client-side, confirmado — no hay generación de PDF en `server/api/`; `nuxt.config.ts:5-12` confirma comentario explícito "el proyecto en Vercel construye con `nuxt generate` (vercel-static)... las rutas dinámicas deben prerenderizarse... o darán 404 en producción"; `server/api/uraba/ranking.get.js` existe en el árbol de archivos (`find server -iname "*ranking*"` lo confirma) pero es inalcanzable bajo ese modo de despliegue. Impacto/esfuerzo (medio/bajo) correctos — es una corrección de documentación/expectativa, no una brecha de producto que requiera nueva ingeniería compleja. |

**Nota metodológica:** no se ejecutó un navegador con JS real (MapLibre/Vue hidratado) — igual que la auditoría original, esta verificación se apoyó en lectura de código fuente + `curl` HTTP. Esto es suficiente para refutar o confirmar los 12 hallazgos porque todos son binarios y verificables estáticamente (un componente sin `import` no puede aparecer en el DOM final vía bundling de Vite/Nuxt; un archivo de N bytes no cambia de tamaño en tránsito; un endpoint HTTP responde el código que responde). Ningún hallazgo de esta lista dependía de comportamiento dinámico post-hidratación no capturable por este método.
