# INFORME DE SÍNTESIS — Investigación Atlas Urabá

**Fecha:** 2026-07-07 · **Insumos:** 6 dossiers verificados adversarialmente en este directorio
(`ux-decisores.md`, `benchmark-atlas.md`, `datos-institucionales.md`, `agro-cadena.md`,
`social-seguridad.md`, `tecnico-arquitectura.md`) · **Hallazgos supervivientes:** 71
**Criterio de priorización:** valor para el tomador de decisiones (alcalde, DNP/OCAD, cooperación, gremio), no completitud.

---

## 1. Resumen ejecutivo — las 5 apuestas que más elevan el atlas

1. **Publicar la API que ya está construida.** `server/api/uraba/**` existe con CORS abierto (`server/utils/uraba.js:42-50`) pero da 404 en producción porque el build es `nuxt generate`. Agregar las rutas a `nitro.prerender.routes` (patrón ya probado con los 8 `/brief/*`, commit `85b4eb4`) la convierte en producto público en días — sería más abierta que TerriData del propio DNP, que no tiene API.
2. **Seguridad con fuente trazable.** El 20% del índice v3 ("seguridad") es una caja negra sin script generador en el repo. El dataset MinDefensa `m8fd-ahd9` (verificado: Turbo 2023 = 67 homicidios) + proyecciones DANE 2018-2042 (el denominador poblacional que hoy no existe) permiten tasas por 100k hab. citables ante OCAD PAZ esta misma semana.
3. **Cortar los ~82 MB de carga eager.** `useAtlasMap.js` registra 40 fuentes GeoJSON incondicionales al montar el mapa (catastro 16 MB incluido). Mover `addSource` a lazy-on-first-toggle (patrón ya existente en el propio archivo, línea 197) es el fix de mayor retorno/esfuerzo de todo el proyecto — crítico para la conectividad rural del propio territorio que describe.
4. **La superficie de decisión en desktop está incompleta.** El filtro score/zona (`FilterBar.vue`) solo existe en mobile; un alcalde en laptop no puede responder "muéstrame las manzanas críticas bajo 40". Montarlo + badge visible proxy-vs-real (patrón Colombia en Mapas, `admin_data_status.json` ya existe y nadie lo consume) cierra las dos brechas de confianza más baratas.
5. **/cadena a nivel due-diligence.** Cinco piezas verificadas y listas: Puerto Antioquia YA opera (feb-2026, el ROADMAP está desactualizado), Urabá zona libre Foc R4T (Res. ICA 095026/2021), margen FOB/kg calculable con datos del repo, precio internacional Pink Sheet descargable, y la corrección metodológica SIPSA≠FOB que evita publicar una comparación inválida.

**Bloqueante de integridad antes de cualquier entrega:** la subregión PDET "Urabá Antioqueño" oficial (Decreto 893/2017, XLSX parseado) NO incluye Arboletes ni San Juan de Urabá y SÍ incluye Dabeiba — el atlas no puede etiquetar "los 9 municipios son PDET" sin que un evaluador OCAD lo detecte de inmediato.

---

## 2. Matriz de oportunidades (71 hallazgos supervivientes)

Leyenda: **I** = impacto decisor · **E** = esfuerzo · **Ya** = disponible ya sin gestión.

### Frente UX / decisores

| Hallazgo | I | E | Ya | Evidencia |
|---|---|---|---|---|
| FilterBar (score/zona) no existe en desktop, solo mobile | Alto | Bajo | Sí | `FilterBar.vue:13-45`; sin import en pages/components |
| PresentationMode.vue construido pero no montado | Medio | Bajo | Sí | `PresentationMode.vue:1-51`; grep sin resultados |
| /comparar, /simulador, /cadena sin estado en URL (no compartibles) | Alto | Medio | No | `comparar.vue:143-144`; patrón correcto en `index.vue:214-222` |
| Sin glosario ni página de metodología (LISA HH/LL, pesos v3) | Alto | Medio | No | `/metodologia` → 404; `SidePanel.vue:218-224` |
| Sin versión en inglés — excluye cooperación internacional | Alto | Alto | No | `nuxt.config.ts:42`; cero i18n en package.json |
| SEO/OG solo en home; /simulador sin useHead propio | Medio | Bajo | No | `simulador.vue` sin useHead; `comparar.vue:293` |
| Pie de fuentes del brief A4 falla WCAG AA (3.47:1, 7.8px) | Medio | Bajo | Sí | `brief/[municipio].vue:247,268` |
| ~35 capas GeoJSON pesadas sin tileado ni loader por capa | Medio | Alto | No | `useAtlasMap.js:1097` (catastro 17 MB) |
| Dos implementaciones de ficha municipal (riesgo divergencia) | Medio | Medio | No | `brief/[municipio].vue` vs `FichaMunicipal.vue` (1037 líneas) |
| Sin export PNG del mapa ni Excel en todo el producto | Medio | Medio | No | grep toDataURL/html2canvas/xlsx vacío |
| Sin sitemap.xml pese a robots.txt abierto | Bajo | Bajo | Sí | `curl /sitemap.xml` → 404 |
| ROADMAP describe "PDF server-side" y "API REST" que no coinciden con lo desplegado | Medio | Bajo | No | `ROADMAP.md:106+`; `brief:225` = window.print() |

### Frente Benchmark internacional

| Hallazgo | I | E | Ya | Evidencia |
|---|---|---|---|---|
| API pública: **documentar y anunciar**, no construir (ya existe el código) | Alto | Bajo | Sí* | `server/api/uraba/*.get.js`; `server/utils/uraba.js:42-50`. *Requiere prerender (frente técnico) para responder en prod |
| Badge visible de calidad de dato proxy-vs-real (patrón IGAC estrellas) | Alto | Bajo | Sí | `admin_data_status.json` existe, cero consumo en UI |
| Overlay de datos propios del usuario (Opportunity Atlas / Urban SEDT) | Alto | Alto | No | opportunityinsights.org/atlasresources |
| Perfil de lugar navegable con narrativa viva (la prosa ya existe en /brief) | Medio | Medio | Sí | DataMéxico; `brief/[municipio].vue:71-195` |
| Gráficos embebibles vía iframe con licencia (OWID) | Medio | Bajo | Sí | ourworldindata.org/how-to-embed |
| Compare Mode variable-vs-variable en la misma geografía | Medio | Medio | No | Opportunity Atlas |
| Comparador temporal del municipio contra sí mismo (serie histórica) | Medio | Medio | No | TerriData; `ROADMAP.md:116` |
| Catálogo público de metadatos de las ~70 capas | Medio | Medio | Sí | `public/data` = 73 archivos sin índice |
| "Perfiles similares" — peer benchmarking algorítmico | Medio | Bajo | Sí | DataMéxico; índice v3 ya calculado |
| Servicios OGC WMS/WFS para terceros SIG (evidencia externa PLAUSIBLE) | Medio | Alto | No | CEPALGEO/Col. en Mapas; repo 100% estático |
| Feature story: reporte largo + herramienta en la misma URL | Bajo | Medio | Sí | Urban Institute / Kresge |
| [Hipótesis] Boletín editorial mensual para prensa/cooperantes | Bajo | Bajo | Sí | usafacts.org |

### Frente Datos institucionales

| Hallazgo | I | E | Ya | Evidencia |
|---|---|---|---|---|
| IRCA calidad de agua (INS): 9/9 municipios, serie 2018-2024, urbano/rural | Alto | Bajo | Sí | Socrata `nxt2-39c3` (cifras re-verificadas) |
| Proyecciones población DANE 2018-2042 — el denominador que falta | Alto | Bajo | Sí | XLSX DANE 200 OK (3.9 MB); `municipios.geojson` sin población |
| SIEDCO/DIJIN delitos por municipio con código DANE | Alto | Medio | Sí | Socrata `d4fr-sbn2` (verificado Apartadó) |
| MinTIC internet fijo: completar 4/9 municipios faltantes (5 ya poblados) | Medio | Bajo | Sí | `tic_cobertura.geojson` 5/9 con pct_4g 2023 |
| RUNT parque automotor (filtrar por departamento; fecha_registro sospechosa) | Medio | Bajo | Sí | Socrata `u3vn-bdcy` |
| MEN matrícula/deserción por nivel educativo (más fino que TerriData) | Medio | Bajo | Sí | Socrata `nudc-7mev` (cifras verificadas) |
| INVÍAS red vial fresco (2026-07-01); aclarar qué archivo corresponde | Medio | Medio | Sí | `ie7y-asdn`; 344 tramos = `red_vial_primaria.geojson`, no `red_vial_invias` |
| SUI energía: NO existe dataset público municipal (WAF, catálogo vacío) | Medio | Alto | No | Incapsula; catálogo Socrata sin resultados |
| Pobreza monetaria municipal: limitación estructural GEIH — no perseguir | Bajo | Alto | No | Catálogo Socrata sin dataset; IPM 2018 ya integrado |
| `terridata_indicadores.geojson` NO está vacío y CONTRADICE a `terridata_full` | Medio | Medio | No | Chigorodó nbi 21.19 vs 31.8 — auditar antes de tocar |
| TerriData: sin API REST; la vía real es Socrata por dataset | Bajo | Bajo | Sí | terridata.dnp.gov.co sin API documentada |
| Consejos comunitarios Ley 70 + RUNAP fresco: bloqueados por rate-limit anónimo | Medio | Bajo | No | `6k7a-ched`/`k7kn-depg` → 403; reintentar con X-App-Token |

### Frente Agro / cadena

| Hallazgo | I | E | Ya | Evidencia |
|---|---|---|---|---|
| Puerto Antioquia YA opera (feb-2026); ROADMAP desactualizado | Alto | Bajo | Sí | Infobae/El Tiempo, Res. 20263040003075; `ROADMAP.md:57` |
| Foc R4T: Urabá zona libre (Res. ICA 095026/2021), riesgo ausente del atlas | Alto | Bajo | Sí | ica.gov.co |
| Margen FOB/kg calculable con datos del repo (2019: 0,460 → 2025: 0,547 US$/kg) | Alto | Bajo | Sí | `expo_banano_fob.json`, recalculado independiente |
| SIPSA (bocadillo/criollo) NO comparable con FOB (Cavendish) — error latente | Alto | Bajo | Sí | `sipsa_precios.json` solo variedades domésticas |
| Pink Sheet World Bank: precio internacional descargable (verificado con openpyxl) | Alto | Bajo | Sí | CMO-Historical-Data-Monthly.xlsx, columnas Banana Europe/US |
| Augura 2025: récord US$1.309M, Urabá 32.465 ha, riesgo -5% 2026 (1.200 ha inundadas) | Alto | Bajo | Sí | Portafolio (verificado textual) |
| SIPSA: repo tiene 1 año de un catálogo 2013-2024 | Medio | Medio | Sí | microdatos.dane.gov.co catálogo 776 |
| EVA 2025 preliminar ya publicado por UPRA; Socrata del repo en 2024 | Medio | Bajo | Sí | upra.gov.co/es-co/eva/eva-2025 |
| Abandono de ~2.000 ha bananeras por rentabilidad (no enfermedad) | Medio | Bajo | Sí | Agrolatam (verificado textual) |
| Fairtrade: Martha María y Agrosiete válidas; "Bananeras de Urabá" perdió certificación 2020 | Medio | Bajo | Sí | El Espectador / Fairtrade UK |
| FAO Banana Market Review: comparar Colombia vs Ecuador/Guatemala/Costa Rica | Medio | Medio | Sí | PDF descargado y verificado (1.86 MB) |

### Frente Social / seguridad

| Hallazgo | I | E | Ya | Evidencia |
|---|---|---|---|---|
| score_seguridad v3 sin fuente trazable — caja negra total (ni script v2 existe) | Alto | Medio | No | `recalc_v3.py:139,228`; grep sin generación |
| Homicidios MinDefensa/SIEDCO por municipio-año-modalidad | Alto | Bajo | Sí | `m8fd-ahd9`; Turbo 2023=67 re-verificado |
| Víctimas RUV por hecho y municipio (reemplaza uariv_desplazamiento) | Alto | Bajo | Sí | `9qih-4vkc`; limitación año-corriente confirmada |
| Discrepancia composición PDET: oficial = 8 municipios CON Dabeiba, SIN Arboletes/San Juan | Alto | Bajo | Sí | MunicipiosPDET.xlsx parseado (Decreto 893/2017) |
| Nota metodológica "hechos reportados, no violencia total" (subregistro) | Alto | Bajo | Sí | Coherencia con granularidad honesta del ROADMAP |
| Educación MEN por municipio-año; sin solapamiento con SIMAT (solo presencia) | Medio | Bajo | Sí | `nudc-7mev`; `simat.geojson` sin desempeño |
| Saber 11 ICFES: calidad educativa geolocalizable por colegio (7,1M filas) | Medio | Medio | Sí | `kgxf-xxbe` count verificado 7.109.704 |
| Mortalidad infantil/materna desde microdato DANE EEVV | Medio | Medio | Sí | catálogo 878 (requiere registro gratuito) |
| Coca no estructural en Urabá (61 ha Turbo) — cifra exacta sigue [VERIFICAR] | Medio | Bajo | Sí | PDF UNODC HEAD 200, contenido no verificado |
| MinDefensa vs Medicina Legal en contraste; `vtub-3de2` verificado municipal | Medio | Bajo | Sí | owner Medicina Legal confirmado vía API |
| Otros delitos: `2u9p-fa2g` válido (delitos sexuales); `88i8-sunb` DESCARTADO | Medio | Medio | Sí | verificados vía API |
| TerriData como atajo de seguridad tasada — sin confirmar | Medio | Bajo | No | Sin API confirmada |

### Frente Técnico / arquitectura

| Hallazgo | I | E | Ya | Evidencia |
|---|---|---|---|---|
| Carga eager de 40 fuentes GeoJSON = 85.935.690 bytes en cada visita | Alto | Medio | Sí | `useAtlasMap.js:166-1254`; recuento independiente |
| Fix mínimo: lazy-on-first-toggle (patrón ya existe en línea 197) | Alto | Bajo | Sí | `useAtlasMap.js:197`, `toggleLayer:1274-1343` |
| /api/uraba/** 404 en prod — SSR declarado vs nuxt generate real | Alto | Bajo | No | curl 404 reproducido; `HANDOFF.md:30-34` |
| Opción recomendada: prerender estático de la API en nuxt generate | Alto | Medio | Sí | `nitro.prerender.routes` ya usado (commit 85b4eb4) |
| catastro_igac (16 MB) el más pesado, se carga siempre; tippecanoe instalado | Alto | Medio | Sí | `useAtlasMap.js:1097` |
| atlas_enriquecido (11 MB) alimenta 5 sub-capas — 1 conversión cubre 5 | Medio | Medio | Sí | `useAtlasMap.js:998-1001` |
| vercel.json sin cache para .json/.csv (max-age=0 en stats/isócronas) | Medio | Bajo | Sí | curl reproducido |
| CompararMiniMapa y useSimulador re-descargan atlas.geojson (7.3 MB) | Medio | Medio | Sí | `CompararMiniMapa.vue:62`; `useSimulador.js:115-116` |
| 3 capas con promoteId (18.4 MB) = plantilla PMTiles; clasificacion_suelo sin promoteId | Medio | Medio | Sí | grep promoteId líneas 799,953,971 |
| 7 archivos huérfanos en public/data = 14 MB de peso muerto | Bajo | Bajo | Sí | grep ejecutado: atlas_slim, conflictos_uso, etc. |
| Sin app/error.vue de marca | Bajo | Bajo | Sí | find sin resultados |
| Manejo de errores del mapa bien resuelto — NO requiere acción | — | — | — | try/catch + ErrorState + fallback PMTiles + timeout 8s |

---

## 3. Plan de integración en 3 olas

### OLA 1 — implementable esta semana (alto impacto · bajo/medio esfuerzo · disponible ya)

**1.1 Lazy-on-first-toggle: cortar los ~82 MB de carga eager.**
`app/composables/useAtlasMap.js`: mover cada `addSource()` de capa opcional (líneas 700-1254) desde `loadAtlasLayer()` a dentro de `toggleLayer()` (1274-1343), detrás de `if (!map.value.getSource(id))` — el patrón ya existe en la línea 197 para `municipios-score`. Cero cambios de datos, solo reordenar; cada capa se descarga solo cuando el usuario la activa.

**1.2 Publicar la API pública: prerender estático + página de documentación.**
`nuxt.config.ts`: agregar a `nitro.prerender.routes` las rutas `/api/uraba`, `/api/uraba/municipios`, `/api/uraba/ranking` y las 9 de `/api/uraba/municipio/[nombre]` (generar la lista de 7.028 manzanas por script solo si el build de prueba lo aguanta; empezar sin ellas). Crear `app/pages/api.vue` documentando endpoints y ejemplos curl. Corregir `ROADMAP.md` (Transversal B): la API está construida, faltaba desplegarla y anunciarla.

**1.3 Montar FilterBar en desktop + PresentationMode.**
`app/components/SidePanel.vue` (o barra bajo `AppHeader`): importar y montar `<FilterBar />` (ya cableado al store); agregar `aria-label` a los sliders y restaurar foco visible (`FilterBar.vue:87`). Montar `<PresentationMode />` en `app/pages/index.vue`. Con esto el permalink `smin/smax` de `ShareButton` cobra sentido en laptop.

**1.4 Seguridad trazable v1: homicidios tasados + denominador poblacional.**
Script nuevo (`scripts/fetch_seguridad.py`): query SoQL a `m8fd-ahd9` (ya probada en el dossier social §13) por los 9 códigos DANE, serie 2018-2025. Descargar `PPED-AreaMun-2018-2042_VP.xlsx` del DANE y poblar `public/data/municipios.geojson` (o JSON nuevo `poblacion_municipios.json`) con población por año. Producir `seguridad_municipios.json` con tasas por 100k hab., rotulado "hechos reportados a autoridad (SIEDCO/MinDefensa)". No tocar todavía el score v3 — primero exponer la capa/serie en `/brief` y `DiagnosticoPanel`.

**1.5 Corrección PDET (bloqueante de integridad).**
Donde el atlas o los briefs afirmen condición PDET: usar la composición oficial (Apartadó, Carepa, Chigorodó, Dabeiba, Mutatá, Necoclí, San Pedro de Urabá, Turbo — Decreto 893/2017). Agregar campo `es_pdet` a `public/data/municipios.geojson` y nota en `app/pages/brief/[municipio].vue` para Arboletes y San Juan de Urabá ("no PDET"). Sin esto, cualquier entrega ante OCAD PAZ es refutable de inmediato.

**1.6 IRCA calidad de agua (INS): la capa nueva de mayor valor/fricción.**
Script `scripts/fetch_irca.py` contra Socrata `nxt2-39c3` (9/9 municipios, 2018-2024, urbano/rural) → `public/data/irca_municipios.json`. Exponer en `brief/[municipio].vue` (KPI + narrativa: Necoclí pasó de riesgo medio 2020-21 a sin riesgo 2024) y como capa municipal en `useAtlasMap.js`/`LayerPanel.vue`.

**1.7 Sprint /cadena: cinco correcciones y adiciones verificadas.**
`app/pages/cadena.vue`: (a) anotación "Puerto Antioquia entra en operación — feb 2026" (fuentes Infobae/El Tiempo, NO la URL ANI 2022); (b) tabla de FOB/kg implícito desde `expo_banano_fob.json` etiquetada "precio FOB implícito HS 0803"; (c) re-etiquetar bloque SIPSA como "variedades domésticas (bocadillo/criollo) — no comparable con FOB Cavendish"; (d) 4º bloque con Pink Sheet (script build-time que parsea `CMO-Historical-Data-Monthly.xlsx`, columnas Banana Europe/US → `public/data/banano_internacional.json`); (e) hitos Augura 2025 + riesgo 2026 como contexto citado. Actualizar `ROADMAP.md:57`. Badge Foc R4T ("zona libre, Res. ICA 095026/2021") en `brief/[municipio].vue`.

**1.8 Badge de calidad de dato proxy-vs-real en la UI.**
`app/components/LayerPanel.vue`: consumir `public/data/admin_data_status.json` (hoy huérfano) y mostrar por capa un badge (real/proxy/año de corte), estilo estrellas de Colombia en Mapas. Convierte el principio declarado del proyecto en confianza visible para el decisor.

**1.9 Quick wins de confianza y compartibilidad (medio impacto, coste casi nulo).**
`vercel.json`: regla de cache `/data/(.*)\.(json|csv)` → `max-age=86400` + CORS. `app/pages/brief/[municipio].vue:247,268`: subir `#8a8a85` a ≥`#6b6b66` y tamaño a ≥9px (pie de fuentes del documento oficial). `useHead` con og:description/og:image por página en `simulador.vue`, `comparar.vue`, `cadena.vue`, `brief/[municipio].vue`. `public/sitemap.xml` estático con las 12 rutas conocidas. Borrar (o mover fuera de `public/`) los 7 huérfanos confirmados (14 MB) — EXCEPTO `terridata_indicadores.geojson`, que se audita en Ola 2.

### OLA 2 — requiere cómputo, descarga mayor o diseño (semanas)

- **PMTiles para capas pesadas** (catastro 16 MB → P0, atlas_enriquecido 11 MB cubre 5 sub-capas, luego las 3 con promoteId 18.4 MB y clasificacion_suelo): tippecanoe ya instalado; replicar el patrón HEAD-check de `useAtlasMap.js:176-194`. `CompararMiniMapa.vue` a `atlas.pmtiles`.
- **Estado en URL + export para /comparar y /simulador**: replicar `watch→history.replaceState` de `index.vue:214-222`; sin esto las dos herramientas más "de decisión" no se pueden compartir por WhatsApp.
- **Página /metodologia + glosario** (LISA HH/LL/HL/LH/NS, pesos v3, proxy vs real): contenido ya existe en ROADMAP; enlazar desde header y pestaña Fuentes. Incluir catálogo de metadatos de las ~70 capas (mismo contenido alimenta el badge de 1.8).
- **Serie histórica de víctimas RUV** (`9qih-4vkc` año corriente + exportación manual RNI para 2012-2025) → reemplaza `uariv_desplazamiento.geojson` con año y tipo de hecho — la narrativa "tendencia posacuerdo" que más pesa ante cooperación.
- **Reconstrucción documentada de score_seguridad v3**: con 1.4 en producción, decidir fórmula (homicidios tasados ± otros delitos `2u9p-fa2g`), documentarla en `atlas_stats_v3.json._meta` y correr `recalc_v3.py`. Contraste MinDefensa vs Medicina Legal (`vtub-3de2`) en la nota metodológica.
- **Saber 11 agregado por colegio** (7,1M filas → agregación por `cole_cod_dane_establecimiento`, cruce con las 180 sedes SIMAT): primera capa de calidad educativa geolocalizada. MEN `nudc-7mev` por nivel educativo (ojo: "San Pedro de Uraba" sin tilde). EEVV DANE (mortalidad infantil/materna, registro gratuito).
- **SIPSA serie 2013-2024 + EVA 2025** (verificar en build si `uejq-wxrr` ya trae 2025; si no, preliminar UPRA con salvedad). RUNT (con filtro departamento) y relleno MinTIC de los 4 municipios faltantes.
- **Auditar y reconciliar `terridata_full` vs `terridata_indicadores`** (cifras en conflicto para el mismo municipio, ej. Chigorodó NBI 21.19 vs 31.8): rastrear procedencia antes de borrar nada.
- **Unificar ficha municipal**: hacer de `FichaMunicipal.vue` (modal, 1037 líneas) y `brief/[municipio].vue` una sola fuente de narrativa/datos; agregar `?ficha=1` al permalink. "Perfiles similares" (distancia sobre el índice v3, patrón DataMéxico) al cierre del brief. Iframes embebibles de gráficos (patrón OWID) como capacidad de menor esfuerzo del benchmark.
- **FAO Banana Market Review**: sección comparativa Colombia vs Ecuador/Guatemala/Costa Rica en `/cadena`.

### OLA 3 — requiere gestión institucional o decisión de arquitectura

- **Versión en inglés** (decisión de alcance primero; mínimo viable: briefs + landing + metodología para cooperación internacional).
- **Consejos comunitarios Ley 70 + RUNAP fresco**: reintentar `6k7a-ched`/`k7kn-depg` con `X-App-Token` (la premisa de disponibilidad del token no está verificada en este repo).
- **Cobertura eléctrica SUI**: no existe dataset público municipal — derecho de petición ante UPME/SSPD; mientras tanto, mantener proxy IPSE ZNI y marcar `pct_energia` como "sin fuente" explícito.
- **Inversión PDET estructurada** (Central PDET/ART): dashboard sin API confirmada; inspección de red o solicitud a ART.
- **Capa geolocalizada de fincas certificadas**: gestión con Augura/certificadoras (con la salvedad Bananeras de Urabá, ver §4). Precio de contrato productor-exportador: solo vía Augura.
- **Overlay bring-your-own-data** (patrón Opportunity Atlas/Urban SEDT) y **servicios OGC WMS/WFS**: ambos implican salir del modelo 100% estático — decisión de arquitectura junto con la Opción A (SSR real) del frente técnico, solo si la API estática de 1.2 se queda corta.
- **Comparador temporal** (mismo municipio contra sí mismo): depende de cargar las series históricas de Ola 2 (CNPV 2005-2018, deforestación, SIPSA 12 años, RUV).

---

## 4. Riesgos y descartes (para no re-investigar)

**Refutado / no perseguir:**
- **Pobreza monetaria municipal DANE**: no existe por diseño muestral de la GEIH; no es gestionable ni por petición. El IPM censal 2018 ya integrado es el sustituto correcto.
- **Dataset SUI de % cobertura eléctrica municipal**: no existe en el catálogo público (verificado por dos vías); la página REC no está caída, está tras WAF Incapsula — no re-testear como "404".
- **`88i8-sunb` ("Estadísticas delictivas Tasas")**: sin columna de municipio — descartado como candidato de seguridad.
- **Cita "precio de contrato anual en octubre / tomadores de precio" atribuida a Agrolatam**: no está en la fuente; retirada. La conclusión (no hay precio de referencia público) puede ser cierta pero carece de fuente primaria.
- **"Bananeras de Urabá" como ejemplo Fairtrade vigente**: perdió la certificación en 2020 (restitución de tierras, señalamientos paramilitares) — citarla como vigente sería un error reputacional serio. Usar Martha María y Agrosiete.
- **Dataset Socrata `stc8-i9y9` de proyecciones de población**: solo contiene Chiquinquirá pese al nombre — usar el XLSX nacional del DANE.
- **Bundle JS del cliente**: ya está bien manejado (dynamic import MapLibre + code-splitting) — no requiere acción.
- **Manejo de errores del mapa**: maduro (try/catch + ErrorState + fallback PMTiles + timeout ajustado con datos reales) — no requiere acción.

**Correcciones materiales a hallazgos previos (no repetir el error):**
- La "API pública ya corre en producción" del benchmark es **parcialmente falsa**: el código existe con CORS abierto pero responde 404 en prod (build estático). La verdad reconciliada: falta *desplegarla* (prerender, Ola 1.2), no construirla.
- `terridata_indicadores.geojson` NO está vacío: 8/9 features con datos que **contradicen** a `terridata_full.geojson` — NO borrar sin reconciliar procedencia.
- Los "344 tramos INVÍAS" están en `red_vial_primaria.geojson`, no en `red_vial_invias.geojson` (11 features, fuente ANI) — verificar procedencia antes de "re-sincronizar".
- `tic_cobertura.geojson` está 56% poblado (no 0%): es relleno de 4 municipios, no integración desde cero.
- El atlas cubre **9** municipios (incluye San Juan de Urabá), no 8 — varios dossiers arrastraron el error; toda query nueva debe usar los 9 códigos DANE (`05045, 05051, 05147, 05172, 05480, 05490, 05659, 05665, 05837`).
- `clasificacion_suelo.geojson` NO usa promoteId — sigue siendo candidato PMTiles pero por tamaño, no por precedente.

**Sigue [VERIFICAR] — no citar como confirmado:**
- Cifra exacta de coca "61 ha en Turbo" (PDF UNODC existe pero no se pudo parsear la tabla).
- Cifra Forensis 2023 "14.260 homicidios" (fallos DNS/TLS de medicinalegal.gov.co).
- GLOBALG.A.P. "42.500 ha certificadas Colombia" (snippet sin fuente primaria).
- Inversión Puerto Antioquia (US$300M vs US$764M — citar ambas con fecha, no promediar).
- Si Socrata `uejq-wxrr` (EVA) ya incluye 2025 — comprobar en build-time.
- Disponibilidad real del `X-App-Token` de datos.gov.co (no hay evidencia local en este repo).
