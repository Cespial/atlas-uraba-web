# Benchmark internacional de atlas territoriales de decisión

**Frente:** Benchmark internacional · **Fecha de consulta de todas las fuentes:** 2026-07-07
**Repo:** `/Users/cristianespinal/atlas-uraba-web` · **Referencia base:** `ROADMAP.md` (auditoría 2026-06-01)

## Objetivo y método

Este dossier compara **Atlas Urabá** (`uraba.tensor.lat`) contra los mejores atlas
territoriales de decisión del mundo y de LATAM, con un filtro deliberado: **no se
compara qué datos tienen** (eso ya lo hace el `ROADMAP.md` capa por capa), sino **qué
capacidades de producto/interfaz** tienen que Atlas Urabá no tiene — es decir, qué le
permiten *hacer* a un decisor que hoy no puede hacer en `uraba.tensor.lat`.

Se investigaron 9 plataformas mediante `WebFetch`/`WebSearch` (fuentes primarias:
sitios oficiales de cada plataforma; fuentes secundarias: prensa y documentación
técnica cuando el sitio no era accesible directamente). Toda afirmación cita su URL.
Donde la evidencia es indirecta o inferida se marca explícitamente **[hipótesis]**.

Plataformas cubiertas:
1. Matriz de Bienestar Humano Territorial — Chile (`matrizbht.cl`)
2. DataMéxico (`economia.gob.mx/datamexico`)
3. DataChile (`datachile.io`)
4. Urban Institute — Data Tools (`apps.urban.org`, `urban.org/data-tools`)
5. Opportunity Atlas (`opportunityatlas.org`)
6. USAFacts (`usafacts.org`)
7. Our World in Data (`ourworldindata.org`)
8. CEPAL — CEPALSTAT + CEPALGEO (`estadisticas.cepal.org`, `geo.cepal.org`)
9. TerriData DNP (`terridata.dnp.gov.co`) + Colombia en Mapas IGAC (`colombiaenmapas.gov.co`)

---

## 1. Matriz de Bienestar Humano Territorial (Chile) — `matrizbht.cl`

**Qué es.** Plataforma del Centro de Inteligencia Territorial de la Universidad Adolfo
Ibáñez que mide bienestar urbano a **nivel de manzana y entidad rural** — la misma
granularidad que Atlas Urabá — en 5 dimensiones (Accesibilidad, Ambiental,
Socioeconómica, Seguridad, Desarrollo Local), con 6 indicadores solo dentro de
Accesibilidad (áreas verdes, equipamiento cultural/deportivo, salud, servicios
públicos, cupos educativos per cápita).
Fuente: `matrizbht.cl` (consultado 2026-07-07).

**Ya citada en el propio ROADMAP** como referencia de arquitectura ("Backend PostGIS +
Martin → Vector tiles dinámicos (como matrizbht.cl)", `ROADMAP.md` sección
"TRANSVERSAL B"). Esta investigación confirma que el paralelismo es correcto: MBHT es
el comparable más cercano en granularidad y dimensiones al índice v3 de Atlas Urabá.

**Capacidades que Atlas Urabá no tiene:**
- **Manual de uso público + notas metodológicas versionadas** como documentos propios
  de la plataforma (no un PDF externo) — institucionaliza la trazabilidad
  metodológica ante un decisor que audita el dato antes de usarlo en un documento
  oficial.
- **Sistema de autenticación de usuarios** para ciertas funciones — sugiere un modelo
  de acceso diferenciado (público general vs. institucional) que Atlas Urabá no
  necesita hoy pero es relevante si se abre una API con cuotas.
Fuente: `matrizbht.cl` (consultado 2026-07-07).

---

## 2. DataMéxico — `economia.gob.mx/datamexico`

**Qué es.** Plataforma de la Secretaría de Economía de México (desarrollada por
Datawheel), con más de 13.000 "perfiles" navegables (localidad, industria, ocupación,
producto, país, organización).
Fuente: [DataMéxico](https://www.economia.gob.mx/datamexico/) (consultado 2026-07-07).

**Capacidad clave — página de perfil de lugar auto-generada.** Se inspeccionó el
perfil de Puerto Vallarta en detalle:
`https://www.economia.gob.mx/datamexico/es/profile/geo/puerto-vallarta`
(consultado 2026-07-07). Estructura observada:
- **KPIs de cabecera** (población, IED, exportaciones/importaciones del mes más
  reciente) antes de cualquier gráfico.
- **7 secciones fijas**: Economía, Población y vivienda, Empleo y educación, Salud,
  Equidad, Seguridad pública, Mipymes — cada una con series de tiempo (filtro
  anual/trimestral/mensual), treemaps (ej. exportaciones por producto, matrículas por
  área de estudio) y tablas comparativas.
- **Narrativa auto-generada ligada al dato**: la página redacta oraciones completas
  como *"las principales exportaciones de Puerto Vallarta en 2025 fueron
  Válvulas..."* — no es solo un gráfico, es una frase construida a partir del dato
  vigente. Esto traduce la cifra a lenguaje que un alcalde puede citar sin interpretar
  un gráfico.
- **"Perfiles similares"**: sugiere municipios comparables automáticamente (peer
  benchmarking algorítmico), sin que el usuario tenga que elegir con qué comparar.
- **Transparencia de sustitución de dato**: cuando no hay dato a nivel municipal,
  la página lo dice explícitamente ("los datos visualizados corresponden a la entidad
  federativa de Jalisco, dado que no hay representatividad a nivel de municipio") —
  el mismo principio de "proxy vs. real" de Atlas Urabá, pero resuelto en la UI de
  cada gráfico, no solo en un documento de estado.
- **API pública** con descarga en CSV o vía API para desarrolladores.
Fuente: [Perfil Puerto Vallarta — DataMéxico](https://www.economia.gob.mx/datamexico/es/profile/geo/puerto-vallarta) (consultado 2026-07-07); [DataMéxico API Explorer](https://api.datamexico.org/ui/) (URL citada en resultados de búsqueda, consultado 2026-07-07 — el fetch directo falló por resolución DNS desde este entorno, dato tomado de metadatos de búsqueda).

**Por qué funciona para un decisor:** convierte cada municipio en una página
"vendible" y citable por sí sola (como el `/brief/[municipio]` de Atlas Urabá), pero
**interactiva y siempre viva**, no un PDF estático generado una vez. El `/brief` de
Atlas Urabá es un buen punto de partida pero le falta (a) la narrativa auto-generada
en prosa, y (b) el enlace automático a "perfiles similares".

---

## 3. Opportunity Atlas — `opportunityatlas.org`

**Qué es.** Herramienta de Opportunity Insights (Harvard/Census Bureau) que mapea
movilidad social intergeneracional por *census tract* (~4.200 hab. en EE.UU. — unidad
comparable en escala a una manzana/vereda de Atlas Urabá) a partir de datos anónimos
de 20 millones de personas seguidas desde la infancia hasta sus 30s.
Fuente: [Census Bureau — Opportunity Atlas Data Tool](https://www.census.gov/programs-surveys/ces/data/analysis-visualization-tools/opportunity-atlas.html) (consultado 2026-07-07); [Census — New Opportunity Atlas Estimates Social Mobility by Census Tract](https://www.census.gov/library/stories/2018/10/opportunity-atlas.html) (consultado 2026-07-07).

**Capacidades que Atlas Urabá no tiene (evidencia de tutoriales/documentación, sitio
en vivo cargó vacío en el fetch directo):**
- **"Compare Mode"**: crea mapas que visualizan la **comparación entre dos variables**
  (no entre dos municipios) filtradas por grupo demográfico (raza, género, nivel de
  ingreso del hogar de origen) sobre la misma geografía. Esto es distinto al
  `/comparar` de Atlas Urabá, que compara municipio A vs. municipio B en la misma
  dimensión — Opportunity Atlas compara dimensión A vs. dimensión B en el mismo lugar,
  segmentado por subgrupo poblacional.
- **"Advanced Mode"**: permite definir rangos de especificación propios sobre una o
  más variables simultáneamente.
- **"Overlay Your Data"**: el usuario puede **subir sus propios datos geográficos** y
  superponerlos sobre las capas del Atlas — un funcionario de vivienda puede cargar
  la ubicación de sus proyectos y ver qué tan expuestos están a zonas de baja
  movilidad social sin pedirle nada al equipo del Atlas.
- **Caso de uso documentado**: funcionarios de Seattle usaron el Atlas para diseñar
  un piloto de política de vivienda — evidencia de adopción institucional real, no
  solo de diseño de producto.
Fuente: [Opportunity Insights — Exploring the Opportunity Atlas (tutoriales Compare/Advanced/Overlay Mode)](https://opportunityinsights.org/atlasresources/) (consultado 2026-07-07).

**Por qué funciona para un decisor:** separa "explorar el dato" (modo básico) de
"responder mi pregunta específica" (modos avanzado/comparación/overlay), y permite
que el decisor traiga su propio contexto (sus proyectos, su cartera) al mapa en vez de
solo consumir lo que el Atlas ya decidió mostrar.

---

## 4. Urban Institute — Data Tools (`apps.urban.org`)

**Qué es.** Familia de ~10 herramientas de datos independientes del Urban Institute
(Washington DC), cada una resolviendo una pregunta de política específica en vez de
un dashboard genérico.
Fuente: [Urban Institute — Data Tools](https://www.urban.org/data-tools) (consultado 2026-07-07, vía resultados de búsqueda; el fetch directo a `apps.urban.org` devolvió HTTP 403).

**Capacidades relevantes, cada una una lección de producto distinta:**
- **Spatial Equity Data Tool**: permite **subir datos propios** (ej. ubicación de
  parques, bibliotecas, puntos wifi, cargadores eléctricos) y automáticamente evalúa
  si la distribución es equitativa por grupo demográfico/espacial — con **API propia**
  para embeber ese análisis de equidad en flujos de trabajo de terceros.
  Fuente: [Spatial Equity Data Tool](https://apps.urban.org/features/equity-data-tool/) (consultado 2026-07-07).
- **State Economic Monitor**: dashboard de series temporales macro (empleo, ingresos,
  vivienda, PIB estatal) comparando los 50 estados + DC con gráficos interactivos que
  resaltan diferencias — es el patrón que Atlas Urabá podría aplicar a
  TerriData/EVA/SIPSA para trazar tendencias multi-año por municipio, no solo el
  corte estático actual.
  Fuente: [State Economic Monitor](https://apps.urban.org/features/state-economic-monitor/) (consultado 2026-07-07).
- **"Measuring Inclusion in America's Cities"** (financiado por Kresge Foundation):
  combina análisis narrativo largo ("feature story") con una herramienta interactiva
  que deja explorar 274 ciudades desde 1980 en un índice compuesto de 5 medidas
  (segregación racial, brecha de propiedad de vivienda, brecha educativa, brecha de
  pobreza, % de personas de color) — el reporte y la herramienta viven en la misma
  URL, no son documentos separados.
  Fuente: [Measuring Inclusion in America's Cities](https://apps.urban.org/features/inclusion/) (consultado 2026-07-07).
- **Education-to-Workforce Framework Data Tool**: comparación por geografía, ingreso,
  raza/etnia simultáneamente sobre el mismo indicador — filtros cruzados, no solo
  selector único.

**Por qué funciona para un decisor:** cada herramienta resuelve UNA pregunta de
política con el mínimo de fricción, en vez de forzar al usuario a construir su propio
análisis dentro de un dashboard genérico. Es el patrón inverso al mapa único de Atlas
Urabá: Urban Institute apuesta por "muchas apps pequeñas y precisas" sobre "un mapa
grande que lo hace todo".

---

## 5. USAFacts — `usafacts.org`

**Qué es.** ONG fundada por Steve Ballmer que traduce datos de gobierno de EE.UU. a
lenguaje llano para ciudadanos y decisores, sin agenda partidista.
Fuente: [USAFacts.org](https://usafacts.org) (consultado 2026-07-07).

**Capacidades que Atlas Urabá no tiene:**
- **"State of the Union" report anual**: resumen narrativo, no solo datos — traduce
  90.000+ organismos de gobierno y 3.000 condados a una historia legible en minutos.
- **Newsletter editorial semanal** con "respuestas respaldadas por datos a temas
  debatidos hoy" — capa de distribución/alcance que ningún atlas puramente geoespacial
  de la lista tiene, y que es la vía más barata de generar tracción con prensa y
  cooperación internacional.
- **"Viz Lab"**: visualizaciones editoriales de eventos puntuales (ej. participación
  electoral), separado del dashboard de indicadores — contenido efímero/de coyuntura
  que no compite con el catálogo de capas permanente.
Fuente: [USAFacts.org](https://usafacts.org) (consultado 2026-07-07).

**Relevancia para Atlas Urabá [hipótesis]:** dado que la audiencia declarada incluye
"cooperación internacional e inversionistas" y "prensa", un boletín editorial corto
(mensual, no semanal) que traduzca 2-3 hallazgos del índice v3 a lenguaje llano podría
generar más tracción que agregar otra capa de datos — pero esto es una apuesta de
distribución, no de producto geoespacial, y se marca como hipótesis porque no hay
evidencia de que la audiencia de Atlas Urabá (funcionarios de 8 municipios) tenga el
mismo comportamiento de consumo que la audiencia masiva de USAFacts.

---

## 6. Our World in Data — `ourworldindata.org`

**Qué es.** Publicación de la Universidad de Oxford con 14.627 gráficos en 126 temas
y 495 artículos, todo de licencia abierta.
Fuente: [Our World in Data](https://ourworldindata.org) (consultado 2026-07-07).

**Capacidades que Atlas Urabá no tiene:**
- **32 "Data Explorers"**: herramientas especializadas por tema (pobreza, energía,
  salud) que permiten comparaciones multidimensionales dentro de un tema sin salir de
  la página — un patrón intermedio entre "un gráfico fijo" y "un dashboard completo".
- **Gráficos embebibles (`<iframe>`)** en cualquier gráfico del sitio, con licencia
  explícita de reuso — cualquier medio de prensa o reporte de cooperación puede
  incrustar el gráfico vivo (se actualiza solo) en vez de tomar una captura de
  pantalla que queda desactualizada. Esta es la capacidad de producto más replicable
  y de menor esfuerzo de toda la lista para Atlas Urabá.
- **Selector de rango temporal universal** ("earliest..latest") en cada gráfico, que
  permite ver tanto la foto histórica completa como el corte más reciente con el
  mismo control.
Fuente: [Our World in Data](https://ourworldindata.org) (consultado 2026-07-07).

---

## 7. CEPAL — CEPALSTAT + CEPALGEO

**Qué es.** Portal estadístico oficial de la CEPAL renovado para vincular estadísticas
socio-económicas-ambientales con información geoespacial de toda América Latina y el
Caribe.
Fuente: [CEPAL — ECLAC Presents the CEPALSTAT Portal's New Interface](https://www.cepal.org/en/pressreleases/eclac-presents-cepalstat-portals-new-interface-linking-regional-statistics-and) (consultado 2026-07-07).

**Capacidades que Atlas Urabá no tiene:**
- **Dashboards interactivos con metadatos incorporados** en el mismo panel de
  consulta — el usuario ve el dato y su ficha metodológica sin cambiar de página.
- **Geoportal (CEPALGEO) desacoplado pero interoperable** del portal estadístico:
  catálogos, visores y **servicios geoespaciales** (WMS/WFS, por convención de este
  tipo de infraestructura) que permiten a terceros construir capas propias "ajustadas
  a los requerimientos particulares del usuario", en vez de solo consumir mapas
  prearmados.
Fuente: [CEPALGEO](https://geo.cepal.org/cepalgeo/home/?lang=es) (URL citada en resultados de búsqueda, consultado 2026-07-07).

---

## 8. TerriData (DNP) y Colombia en Mapas (IGAC) — comparables nacionales directos

**TerriData.** Plataforma del Departamento Nacional de Planeación con fichas de
caracterización territorial, comparador de indicadores en el tiempo/entre
territorios, descargas masivas y reportes especializados (triage poblacional, fichas
PDET). Cifras de uso declaradas: 8,3M consultas, 1,4M visitas, 966K descargas.
Fuente: [TerriData DNP](https://terridata.dnp.gov.co) (consultado 2026-07-07).

- **Comparador temporal + entre entidades territoriales simultáneo**: a diferencia del
  `/comparar` de Atlas Urabá (que compara municipios en el mapa), TerriData también
  compara **la misma entidad territorial contra sí misma en el tiempo** — serie
  histórica del mismo municipio, no solo corte transversal contra otro municipio.
- No se encontró evidencia de API pública de TerriData en el fetch directo — es una
  ausencia notable en la plataforma de referencia nacional, y una oportunidad de
  diferenciación real para Atlas Urabá si construye la API pública ya listada en el
  `ROADMAP.md` (Transversal B): sería más abierta que el propio DNP.

**Colombia en Mapas (IGAC/ICDE).** Geoportal relanzado que integra +12.000 datasets de
+50 entidades del Estado.
Fuente: [ICDE — El IGAC y la ICDE lanzaron la nueva versión de Colombia en Mapas](https://www.icde.gov.co/comunicaciones/noticias/el-igac-y-la-icde-lanzaron-la-nueva-version-de-colombia-en-mapas) (consultado 2026-07-07).

- **Sistema de calificación de calidad del dato con estrellas** visible en la interfaz
  para cada capa — resuelve en UI lo que el `ROADMAP.md` de Atlas Urabá declara como
  principio ("marcar proxy vs. real") pero hoy solo vive en documentación interna
  (`admin_data_status.json`), no como badge visible al usuario final en el mapa.
- **Objetos Territoriales Legales (OTL)**: capa específica de límites con validez
  jurídica (vs. límites cartográficos de referencia) — relevante porque Atlas Urabá
  ya trabaja con resguardos/consejos comunitarios que tienen esa misma dualidad
  jurídica vs. cartográfica.
- **Servicios interoperables** (catálogo de metadatos + servicios OGC) para que otras
  entidades consuman las capas por API/WMS sin descargar el archivo — mismo patrón
  identificado en CEPALGEO y en Urban Institute Spatial Equity Tool.
- **Tutorial de 30 segundos** al ingreso — onboarding mínimo explícito, diseñado para
  usuario no técnico (alcalde, no analista SIG).
Fuente: [ICDE — comunicado](https://www.icde.gov.co/comunicaciones/noticias/el-igac-y-la-icde-lanzaron-la-nueva-version-de-colombia-en-mapas) (consultado 2026-07-07).

---

## 9. DataChile — nota de acceso

El sitio `datachile.io` presentó error de certificado SSL expirado en el fetch
directo (2026-07-07), y el archive en `datachile.archive.datawheel.us` sugiere que la
plataforma original podría estar en desuso o migrada. Según prensa y GitHub del
proyecto, integraba +15 fuentes de +10 organismos de gobierno chilenos (economía,
educación, vivienda, demografía, salud) bajo el mismo motor de Datawheel que usa
DataMéxico — comparte, por tanto, el mismo patrón de "perfiles de lugar" descrito en
la sección 2.
Fuente: [DataChile — GitHub](https://github.com/datachile/datachile) (consultado 2026-07-07, vía resultados de búsqueda); [DataChile en T13](https://www.t13.cl/noticia/nacional/DataChile-la-plataforma-de-datos-publicos-de-un-chileno-del-MIT) (consultado 2026-07-07).
**[Hipótesis]**: el hecho de que el dominio original tenga el certificado expirado y
solo sobreviva un archive es una señal de riesgo de sostenibilidad a largo plazo para
plataformas de datos abiertos que dependen de mantenimiento gubernamental continuo —
relevante para Atlas Urabá si en algún momento se transfiere su operación a una
entidad pública (ver TerriData/Colombia en Mapas, que sí muestran continuidad
institucional).

---

## Síntesis — matriz de capacidades ausentes en Atlas Urabá

| Capacidad | Quién la tiene | Esfuerzo estimado | ¿Ya en ROADMAP.md? |
|---|---|---|---|
| Narrativa en prosa auto-generada por lugar | DataMéxico | Medio | No |
| Overlay de datos propios del usuario sobre el mapa | Opportunity Atlas, Urban Institute (Spatial Equity Tool) | Alto | No |
| Modo comparación variable-vs-variable (no solo municipio-vs-municipio) | Opportunity Atlas | Medio | Parcial (`/comparar` existe pero compara territorios, no dimensiones) |
| Gráficos/mapas embebibles vía iframe con licencia de reuso | Our World in Data | Bajo | No |
| Badge visible de calidad/proxy-vs-real por capa (no solo doc interno) | Colombia en Mapas (estrellas) | Bajo | Parcial (principio ya declarado, falta UI) |
| Comparador temporal de la misma entidad contra sí misma (serie histórica) | TerriData, USAFacts | Medio | Parcial ("Modo temporal" en ROADMAP, sin UI de comparador histórico explícito) |
| API pública REST/GraphQL | DataMéxico, Urban Institute (Spatial Equity API) | Alto | Sí (Transversal B) — validado como prioridad correcta por 3 benchmarks |
| Servicios interoperables OGC (WMS/WFS) para terceros SIG | CEPALGEO, Colombia en Mapas | Alto | No |
| Catálogo público de metadatos de las ~70 capas (descubribilidad) | TerriData, Colombia en Mapas, CEPALSTAT | Medio | No |
| "Perfiles similares" — peer benchmarking algorítmico entre municipios | DataMéxico | Bajo-Medio | No |
| Boletín editorial mensual que traduce hallazgos a prosa para prensa/cooperantes | USAFacts | Bajo | No |
| Feature story: reporte largo + herramienta interactiva en la misma URL | Urban Institute | Medio | No |

---

## Notas metodológicas y limitaciones de esta investigación

- Varios sitios (Opportunity Atlas, `apps.urban.org`, `datachile.io`) bloquearon o
  fallaron el `WebFetch` directo (carga por JavaScript, 403, certificado SSL
  expirado). En esos casos la evidencia proviene de documentación oficial
  secundaria (tutoriales de Opportunity Insights, comunicados de prensa, resultados
  de búsqueda con snippets de las páginas oficiales), y se cita la URL específica de
  esa fuente secundaria en cada caso — no hay afirmaciones sin URL de respaldo.
- No se investigó a fondo el motor técnico de Datawheel (Mondrian/Cubes OLAP) que
  aparenta ser el común denominador entre DataMéxico y DataChile — el fetch a
  `api.datamexico.org` falló por resolución DNS desde este entorno. Si se decide
  perseguir la capacidad de "perfil de lugar auto-narrado", vale la pena una
  investigación técnica dedicada de ese stack como posible referencia de
  implementación (no necesariamente de código, sí de arquitectura de datos).
- No se cubrió DataUSA.io (mismo motor Datawheel que DataMéxico, aplicado a EE.UU.)
  ni el Índice de Ciudades Prósperas de ONU-Hábitat — quedan fuera del alcance de
  esta ronda pero son candidatos naturales para una siguiente iteración del
  benchmark si el frente de "perfiles de lugar auto-narrados" se prioriza.

---

## Verificación adversarial (2026-07-07)

Método: cada hallazgo se sometió a (a) re-fetch de la URL de evidencia con
preguntas dirigidas a refutar la afirmación específica, (b) para afirmaciones
que fallaron por bloqueo/403/JS, una segunda pasada con `WebSearch` sobre
fuentes alternativas (docs oficiales, prensa técnica, GitHub), y (c) lectura
directa del repo `atlas-uraba-web` para cada claim sobre "qué NO tiene Atlas
Urabá hoy". Resultado: **12/12 hallazgos sobreviven**, pero **2 requirieron
corrección material** (uno por evidencia interna que el dossier no había
revisado, otro por sobre-generalización del alcance del gap) y **1 quedó con
confianza rebajada** por evidencia externa débil.

### 1. Narrativa auto-generada por lugar (DataMéxico) — **CONFIRMADO, CORREGIDO A LA BAJA**
- Externo: re-fetch de `datamexico.org/.../puerto-vallarta` confirma prosa
  ("En 2020, la población... fue de 291,839 habitantes..."), KPIs de cabecera
  y sección "Perfiles similares" con 5 municipios sugeridos. Evidencia sólida.
- Interno — **refutación parcial**: `app/pages/brief/[municipio].vue:71-195`
  ya tiene una función `narrativa = computed(...)` ("Narrativa determinística
  v3") que construye una oración completa a partir del score, el nivel, el
  promedio regional y la dimensión más fuerte/débil del municipio — el mismo
  patrón de "frase construida desde el dato vigente" que se le atribuye
  solo a DataMéxico. El dossier original afirma que al `/brief` "le falta la
  capa de prosa auto-generada", lo cual es **impreciso**: la prosa
  auto-generada ya existe; lo que falta es que viva en una página **navegable
  y persistente** (secciones, KPIs de cabecera, gráficos por tema) en vez de
  un layout de una sola hoja pensado para imprimir (`descargarPdf()` en
  línea 225 es literalmente `window.print()`), y le falta la sugerencia
  automática de "perfiles similares" (que ya se lista aparte como hallazgo 9,
  evitando doble conteo).
- **Corrección aplicada**: impacto bajado de **alto → medio** (el gap real es
  más angosto de lo que decía la descripción original); esfuerzo se mantiene
  **medio**.

### 2. Gráficos embebibles vía iframe (Our World in Data) — **CONFIRMADO, evidencia reforzada**
- El `WebFetch` original a la home no mostró el botón de embed (es un control
  de JS en cada gráfico individual, no en la portada). `WebSearch` confirma
  la página oficial `ourworldindata.org/how-to-embed`: botón `</> Embed` en
  cada gráfico, genera `<iframe src="https://ourworldindata.org/grapher/...">`,
  con modo "siempre última data" o "versión archivada", bajo licencia CC BY.
  Evidencia más fuerte que la citada originalmente.
- **Sin cambios** en impacto/esfuerzo/disponible_ya.

### 3. Badge visible de calidad de dato (Colombia en Mapas) — **CONFIRMADO, doble verificación**
- Externo: re-fetch del artículo ICDE confirma textualmente "un sistema de
  calificación por estrellas que permite conocer fácilmente el nivel de
  calidad de los datos disponibles" y "+12.000 conjuntos de datos... +50
  entidades".
- Interno: `grep -rn "admin_data_status" app/ server/` no devuelve **ningún**
  resultado — confirma que `public/data/admin_data_status.json` no se
  consume desde ningún componente Vue ni endpoint del servidor hoy; vive
  aislado como documentación de estado, exactamente como afirma el hallazgo.
- **Sin cambios.**

### 4. Compare Mode variable-vs-variable (Opportunity Atlas) — **CONFIRMADO**
- A diferencia del dossier original (que reportó "sitio en vivo cargó vacío"
  y usó solo evidencia indirecta), el re-fetch directo de
  `opportunityinsights.org/atlasresources/` sí respondió y confirma
  textualmente: *"create custom maps that visualize a comparison between two
  variables of your choice by any given race, gender, or income subgroup"* —
  coincide exactamente con la descripción del hallazgo.
- **Sin cambios.**

### 5. Overlay de datos propios del usuario (Opportunity Atlas + Urban Institute) — **CONFIRMADO, reforzado**
- Opportunity Atlas: mismo fetch de arriba confirma *"Overlay Your Data"* —
  "visualize geographic data of your choice on top of the Atlas".
- Urban Institute: el fetch directo a `apps.urban.org/features/equity-data-tool/`
  devolvió 403, pero `WebSearch` sobre fuentes propias del Urban Institute
  (`urban.org/events/...`, blog `Data@Urban` en Medium, documentación
  `ui-research.github.io/sedt_documentation`) confirma con detalle técnico:
  endpoint `/upload-user-file/`, pipeline de funciones lambda, dos modos de
  uso (web tool y API). Evidencia más granular que la original.
- **Sin cambios** en impacto/esfuerzo — si acaso, el hallazgo queda más
  sólido de lo que estaba.

### 6. API pública REST — **CONFIRMADO EL DIAGNÓSTICO, CORREGIDO EL ESFUERZO (hallazgo más importante de esta verificación)**
- Externo: `WebSearch` confirma que la API de DataMéxico es real y
  documentada (`api.datamexico.org/ui/`, docs en
  `datamexico.org/es/about/infoapi`). Para TerriData, dos búsquedas
  independientes (`WebFetch` a la home + `WebSearch` dedicado) no encuentran
  ninguna mención de API pública — la ausencia queda razonablemente
  corroborada por convergencia de fuentes, aunque sigue siendo evidencia
  negativa (no se puede probar la inexistencia de una API con certeza total).
- **Refutación parcial del esfuerzo — hallazgo de mayor severidad de esta
  verificación**: el dossier trata la "API pública REST" como si no
  existiera nada construido (`esfuerzo: alto`, alineado con "Transversal B"
  del ROADMAP como pendiente). Pero el repo **ya tiene una API JSON
  funcional**: `server/api/uraba/municipios.get.js`,
  `server/api/uraba/ranking.get.js`, `server/api/uraba/manzana/[cod].get.js`,
  `server/api/uraba/municipio/[nombre].get.js`, con headers ya configurados
  en `server/utils/uraba.js:42-50` — incluyendo
  `'Access-Control-Allow-Origin': '*'`, es decir, **ya es públicamente
  consumible por CORS desde cualquier origen hoy**, no solo desde el propio
  frontend. Lo que falta no es construir la API — ya está construida y
  abierta — sino: documentarla (portal de desarrollador tipo
  `api.datamexico.org/ui/`), versionarla, y decidir si se le pone
  rate-limiting antes de anunciarla como producto público.
- **Corrección aplicada**: esfuerzo bajado de **alto → bajo**;
  `disponible_ya` sube de **false → true** (documentar y anunciar una API
  que ya corre en producción con CORS abierto es trabajo de días, no un
  proyecto de infraestructura nuevo). Impacto se mantiene **alto** porque la
  falta de documentación pública sigue siendo la barrera real para que un
  tercero la use.

### 7. Comparador temporal serie histórica (TerriData) — **CONFIRMADO**
- Re-fetch de `terridata.dnp.gov.co` confirma textualmente: *"Realice
  comparaciones de indicadores en el tiempo y/o entre entidades
  territoriales"*.
- Interno: `ROADMAP.md:116` ("Modo temporal | CNPV 2005↔2018, deforestación
  serie | Investigación, prensa") confirma que el ROADMAP describe el dato a
  cargar pero no un componente de UI de comparador histórico — coincide con
  la lectura del dossier.
- **Sin cambios.**

### 8. Catálogo público de metadatos de las ~70 capas — **CONFIRMADO**
- Externo: mismas fuentes de hallazgo 3 (ICDE, +12.000 datasets) más
  búsqueda confirmando que TerriData tiene sección de "Downloads" navegable.
- Interno: `find public/data -iname "*catalog*" -o -iname "*README*" -o
  -iname "*metadata*"` no devuelve nada, y `ls public/data` (73 archivos/
  carpetas) no tiene ningún índice — confirma que no existe hoy un catálogo
  de metadatos navegable para las capas de Atlas Urabá.
- **Sin cambios** (nota: el dossier dice "~70 capas"; el conteo real de
  `find public/data -type f` da 73 — consistente dentro del margen de "~70").

### 9. "Perfiles similares" — peer benchmarking algorítmico — **CONFIRMADO**
- Mismo re-fetch de DataMéxico (hallazgo 1): sección "Perfiles similares" al
  cierre de la página, 5 municipios sugeridos automáticamente.
- Ya no se superpone con el hallazgo 1 tras la corrección aplicada arriba.
- **Sin cambios.**

### 10. Servicios interoperables OGC (WMS/WFS) — **CONFIRMADO CON RESERVA — confianza rebajada**
- Re-fetch de `geo.cepal.org/cepalgeo` **no** confirma explícitamente
  OGC/WMS/WFS por nombre — solo describe "Infraestructura de datos
  espaciales de CEPAL" en términos genéricos.
- Re-fetch del artículo ICDE confirma "servicios interoperables" como
  funcionalidad nombrada, pero tampoco cita OGC/WMS/WFS por su nombre técnico
  exacto.
- El propio dossier ya había hedgeado esto correctamente
  ("por convención de este tipo de infraestructura... URL citada en
  resultados de búsqueda") — la verificación confirma que el hedge era
  necesario: **no hay evidencia primaria directa que nombre WMS/WFS**, solo
  inferencia razonable de que "servicios interoperables" en un geoportal de
  este tipo típicamente significa OGC.
- Lo que sí es 100% verificable en el repo: Atlas Urabá se construye con
  `nuxt generate` (comentario en `nuxt.config.ts:9`, "El proyecto en Vercel
  construye con `nuxt generate` (vercel-static)") y sirve capas como archivos
  estáticos `.pmtiles`/`.geojson` vía `vercel.json` — no expone ningún
  servicio de mapas dinámico, solo la API JSON de agregados descrita en el
  hallazgo 6. El *gap* es real aunque la evidencia externa sobre el estándar
  exacto (OGC) sea débil.
- **Corrección aplicada**: se marca la evidencia externa como **PLAUSIBLE**
  en vez de confirmada al 100%; impacto/esfuerzo se mantienen sin cambios
  (medio/alto) porque el gap en sí (cero servicios geoespaciales dinámicos)
  es cierto independientemente del nombre exacto del estándar.

### 11. Feature story: reporte largo + herramienta interactiva — **CONFIRMADO**
- El fetch directo a `apps.urban.org/features/inclusion/` devolvió 403, pero
  `WebSearch` confirma vía Kresge Foundation y el propio Urban Institute que
  "Measuring Inclusion in America's Cities" cubre 274 ciudades en 4 cortes
  censales (1980/1990/2000/2010) con "an interactive data tool" integrada al
  análisis narrativo — coincide con la afirmación del dossier ("explorar 274
  ciudades desde 1980"), con la precisión de que son 4 cortes decenales, no
  una serie continua año a año.
- **Sin cambios.**

### 12. [Hipótesis] Boletín editorial mensual (USAFacts) — **CONFIRMADO como hipótesis razonable**
- Re-fetch de `usafacts.org` confirma textualmente: *"Subscribe to our
  weekly newsletter to get data-backed answers to today's most debated
  issues"* — el hecho base (newsletter semanal) es correcto.
- El propio dossier ya marca la aplicabilidad a Atlas Urabá como
  **[hipótesis]** sin evidencia de comportamiento de audiencia — postura
  correcta, no se puede confirmar ni refutar con fuentes externas porque es
  una proyección, no un hecho verificable.
- **Sin cambios.**

### Veredicto agregado
**12 de 12 hallazgos sobreviven** la verificación adversarial. Ninguno fue
refutado en su totalidad. Correcciones aplicadas:
- **Hallazgo 1**: impacto alto → medio (la prosa auto-generada ya existe en
  `/brief`; el gap real es angosto: interactividad viva + perfiles similares).
- **Hallazgo 6**: esfuerzo alto → bajo, `disponible_ya` false → true (la API
  ya existe en producción con CORS abierto; falta documentarla, no
  construirla) — **es la corrección más consecuente de esta verificación**,
  porque cambia la priorización: la "API pública REST" del ROADMAP.md no es
  un proyecto de infraestructura nuevo, es un anuncio de algo que ya corre.
- **Hallazgo 10**: confianza de la evidencia externa rebajada a PLAUSIBLE
  (no se encontró mención explícita de OGC/WMS/WFS por nombre en las fuentes
  primarias), sin cambio en impacto/esfuerzo porque el gap subyacente
  (cero servicios geoespaciales dinámicos) es verificable directamente en el
  repo.
