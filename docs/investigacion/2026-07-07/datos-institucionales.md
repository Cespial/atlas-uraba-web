# Dossier — Datos institucionales descargables HOY (sin gestión)

**Frente:** Atlas Urabá · investigación de fuentes institucionales
**Fecha de consulta:** 2026-07-07
**Método:** verificación en vivo vía `WebFetch` contra los endpoints reales (Socrata `datos.gov.co`, portales
DANE/DNP/Superservicios/ANT/parquesnacionales), no de memoria. Cada hallazgo cita la URL exacta consultada
y, cuando aplica, el HTTP status observado. Donde el repo ya tiene la capa integrada, se contrasta contra
`public/data/*.geojson` (file:line de evidencia) para no duplicar trabajo.

> Nota metodológica: varios endpoints Socrata devolvieron `403 Forbidden` a través de `WebFetch` en ráfagas
> de consultas seguidas (probable *rate-limit* por ausencia de header `X-App-Token`, que `WebFetch` no puede
> inyectar). El usuario **sí tiene** `X-App-Token` de datos.gov.co (ver `CLAUDE.md` del repo/memoria) — para
> los datasets marcados "🟡 confirmar con token" la recomendación es repetir la consulta con `curl -H
> "X-App-Token: $SOCRATA_TOKEN"` antes de descartarlos como no disponibles.

---

## 0. Resumen ejecutivo

De las 12 fuentes encargadas, **7 se confirmaron descargables HOY sin gestión institucional** con endpoint
exacto y datos reales para los 8 municipios de Urabá (Apartadó, Turbo, Chigorodó, Carepa, Necoclí, Mutatá,
Arboletes, San Pedro de Urabá). **2 ya estaban integradas** en el repo y se revalidó su fuente. **2
requieren confirmación con `X-App-Token`** (bloqueadas por 403 anónimo, no por ausencia del dato). **1 no
tiene API pública utilizable** (TerriData DNP: sin API REST documentada, solo descarga interactiva) pero el
dato ya está en el repo vía datasets DNP/DANE individuales en Socrata.

El hallazgo de mayor impacto: el dataset de **IRCA (calidad de agua) del INS** sí tiene granularidad
municipal real —contradice lo que sugería la fila agregada `#TODOS`— y cubre los 8 municipios de Urabá con
serie 2018-2024. Es la fuente nueva de mayor valor para el decisor (hoy `sivigila_epidemiologia.geojson`
no tiene IRCA).

---

## 1. TerriData DNP

**Pedido:** API/descargas de indicadores por municipio.

**Verificado:**
- `https://terridata.dnp.gov.co/` → **200 OK**, pero la página no expone documentación de API REST ni
  endpoint de descarga masiva por código DIVIPOLA; solo un explorador interactivo (secciones
  "Descargas"/"Reportes"/"Fichas y Tableros") y un correo de contacto `terridata@dnp.gov.co`.
  → **NO hay API pública utilizable de TerriData como tal.**
- Sin embargo, el dato *sí* existe indirectamente: el repo ya tiene `public/data/terridata_full.geojson`
  con 9 features (8 municipios + probablemente un total), pobladas con NBI, IPM, cobertura educativa,
  deserción, Saber 11, finanzas municipales (`ingresos_totales`, `desempeño_fiscal`), mortalidad y
  cobertura en salud — evidencia: `public/data/terridata_full.geojson:1` (campo `terridata_fuente`
  presente en cada feature, truncado en la muestra pero apunta a "D[NP]...").
- Dataset DNP confirmado en catálogo Socrata que probablemente alimenta parte de esto:
  **"DNP - Medición del Desempeño Municipal"** → `id nkjx-rsq7`, dueño "Datos Abiertos DNP", actualizado
  2026-05-18 (`https://api.us.socrata.com/api/catalog/v1?domains=www.datos.gov.co&q=TerriData%20DNP`).
  Coincide con los campos `mdm_total`/`mdm_gestion`/`mdm_resultados` que ya están en
  `terridata_full.geojson`.
- El indicador `terridata_indicadores.geojson` (archivo hermano) está **vacío** (todos los campos `null`)
  — evidencia: `public/data/terridata_indicadores.geojson:1`. Parece un esquema legado/no usado; el archivo
  vivo es `terridata_full.geojson`.

**Estado:** ✅ Ya integrado (vía datasets DNP/DANE individuales en Socrata, no vía "API TerriData" que no
existe como tal). **Acción recomendada:** borrar o marcar como deprecado `terridata_indicadores.geojson`
para no confundir a futuras ingestas — es dead weight con 9 features 100% `null`.

**Indicador que desbloquea:** ya desbloqueado — NBI, IPM, desempeño fiscal, mortalidad, cobertura
educativa por municipio, actualizado a 2024/2025 en la mayoría de campos.

---

## 2. SUI Superservicios — cobertura acueducto/alcantarillado/energía

**Pedido:** cobertura de servicios públicos por municipio.

**Verificado:**
- El repo ya tiene `public/data/sui_servicios.geojson` con `pct_acueducto`, `pct_alcantarillado`,
  `pct_aseo` poblados (ej. Mutatá: 28.4% / 28.4% / 49.9%) pero **`pct_energia` es `null` en todas las
  features** — evidencia: `public/data/sui_servicios.geojson:1`. La fuente citada en el propio archivo:
  *"Superservicios-SUI Reporte de Estratificación y Coberturas (REC), publicado 2017-07-06; cobertura
  total (urbana+rural) de predios residenciales"* — es decir, **dato de 2016, no actualizado desde
  entonces.**
- Búsqueda de reemplazo/actualización 2026: `https://www.superservicios.gov.co/servicio-al-ciudadano/
  atencion-al-ciudadano/reporte-de-estratificacion-y-coberturas` → **404 Not Found** (la URL del REC
  cambió o fue removida del sitio de Superservicios).
- Búsqueda en catálogo Socrata de un dataset de % cobertura de energía por municipio (UPME/SSPD): **no se
  encontró ningún dataset con esa granularidad exacta** — los resultados más cercanos son tarifarios (EPM,
  CREG) o el registro ZNI de Superservicios (`qwe5-ycap` "Registro de Operación Diario ZNI",
  `p62q-r7ag` "Inf. Comercial para el Sector Residencial ZNI"), que **no dan % de cobertura**, sino
  operación diaria de plantas en Zonas No Interconectadas.
- El RUPS (Registro Único de Prestadores) `id 4qkq-csdn` (SSPD, actualizado 2026-05-18) lista
  **empresas prestadoras**, no % de cobertura — sería insumo para "quién presta el servicio en cada
  municipio" pero no para el indicador de brecha que pide el ROADMAP.

**Estado:** 🔴 **NO disponible** un dataset actualizado de % cobertura eléctrica por municipio. El proxy
que ya existe en el repo (`ipse_zni.json`, datos de energía activa/reactiva por localidad ZNI, con series
mensuales hasta 2026-01) es el mejor sustituto disponible hoy — confirma qué corregimientos/veredas están
en Zona No Interconectada (proxy inverso de cobertura eléctrica de red).

**Indicador que desbloquea:** ninguno nuevo — el gap de `pct_energia` sigue abierto. Recomendación:
mantener el proxy IPSE ZNI y marcar `pct_energia` explícitamente como "sin fuente pública vigente" en el
tooltip del mapa (actualmente aparece como `null` silencioso).

---

## 3. SIVICAP / IRCA — calidad de agua potable (INS)

**Pedido:** riesgo sanitario del agua por municipio.

**Verificado — HALLAZGO DE MAYOR VALOR de este dossier:**
- Dataset: **"Calidad del Agua para Consumo Humano en Colombia"**, `id nxt2-39c3`, dueño INS (vía catálogo
  Socrata datos.gov.co), actualizado 2026-05-18.
- `https://www.datos.gov.co/resource/nxt2-39c3.json?departamento=Antioquia&$where=municipio in
  ('Turbo','Necoclí','Mutatá','San Pedro de Urabá','Apartadó','Chigorodó','Carepa','Arboletes')&$order=a_o
  DESC&$limit=50` → **200 OK**, confirma **los 8 municipios de Urabá con serie anual 2018-2024**, ejemplo
  de valores IRCA 2024: Carepa 1.4, Chigorodó 0.8, Turbo 1.4, San Pedro de Urabá 1.0, Necoclí 3.1, Apartadó
  2.9, Arboletes 0.0, Mutatá 0.7 (todos "sin riesgo"/"riesgo bajo" salvo picos históricos: Necoclí llegó a
  IRCA 22.6 en 2021 y 24.4 en 2020 — riesgo medio, dato con narrativa fuerte para un brief).
- Campos: `departamentocodigo`, `departamento`, `municipiocodigo`, `municipio`, `a_o`, `irca`,
  `nivel_de_riesgo`, `ircaurbano`, `nivel_de_riesgo_urbano`, `ircarural`, `nivel_de_riesgo_rural` — es
  decir, **viene desagregado urbano/rural**, que es más fino que lo que el ROADMAP pedía.
- Nota: la primera consulta sin filtro trae una fila agregada por departamento con `municipio="#TODOS"` —
  no confundir esa fila con "no hay dato municipal"; el dataset sí tiene filas reales por municipio, solo
  hay que filtrar explícitamente.

**Estado:** 🟢 **DISPONIBLE HOY, sin auth, formato JSON vía Socrata.** No hay ninguna capa `.geojson` en
`public/data/` que use esto todavía (búsqueda: `sivigila_epidemiologia.geojson` es de otro tema —
epidemiología, no IRCA).

**Indicador que desbloquea:** riesgo sanitario del agua por municipio y por zona urbana/rural, con serie
histórica 2018-2024 — permite mostrar deterioro/mejora año a año (ej. Necoclí pasó de riesgo medio en
2020-2021 a sin riesgo en 2024, narrativa de "la inversión funcionó"). Granularidad: **municipal**, no
manzana (SIVICAP reporta por acueducto/municipio, no por predio).

**Esfuerzo de integración:** bajo — 1 llamada Socrata, join por nombre de municipio a `municipios.geojson`.

---

## 4. MinTIC — banda ancha / internet fijo (datos.gov.co Socrata)

**Pedido:** brecha digital, velocidad media por municipio.

**Verificado:**
- Dataset: **"Internet Fijo Accesos por tecnología y segmento"**, `id n48w-gutb`, dueño "OficinaTI"
  (MinTIC), catálogo Socrata `datos.gov.co`.
- `https://www.datos.gov.co/resource/n48w-gutb.json?$where=upper(municipio) like '%APARTAD%'&$limit=10` →
  **200 OK**, confirma registros reales para **APARTADÓ** (Antioquia) con proveedor (EDATEL, UNE EPM,
  DIRECTV), tecnología (xDSL, cable, satelital, inalámbrica), segmento (residencial por estrato,
  corporativo), velocidad de bajada/subida en Mbps y número de accesos.
- Campos: `anno`, `trimestre`, `proveedor`, `cod_departamento`, `departamento`, `cod_municipio`,
  `municipio`, `segmento`, `tecnologia`, `velocidad_bajada`, `velocidad_subida`, `no_de_accesos`.
- **Vigencia verificada:** `$select=max(anno)` → **`max_anno = 2023`**. Es decir, el dataset llega hasta
  2023, no hasta 2026 (posible discontinuidad de reporte reciente en el catálogo público, o el dataset
  activo se renombró — no se encontró una versión 2024-2026 en la búsqueda del catálogo).

**Estado:** 🟢 **DISPONIBLE, formato JSON Socrata, granularidad municipal, desagregado por proveedor/
tecnología/segmento** — esto es sustancialmente más rico que el esquema vacío que ya existe en el repo:
`public/data/tic_cobertura.geojson` tiene `pct_4g`, `pct_5g`, `pct_lte`, `tic_anio` **todos `null`** —
evidencia: `public/data/tic_cobertura.geojson:1`. Esta capa está creada pero nunca poblada.

**Indicador que desbloquea:** brecha digital real (número de accesos residenciales por estrato y
tecnología, no solo un % agregado). Con `no_de_accesos` + población se puede derivar penetración de
internet fijo por estrato — indicador que hoy no existe en el atlas.

**Esfuerzo de integración:** medio — agregar por municipio/año/tecnología y calcular tasa de penetración
(requiere denominador poblacional, ver hallazgo #5).

---

## 5. DANE — proyecciones de población municipal 2018-2035/2042

**Pedido:** denominador para todas las tasas per cápita.

**Verificado:**
- Página oficial: `https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/
  proyecciones-de-poblacion` → **200 OK**.
- Descarga directa confirmada: `https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/
  Municipal/PPED-AreaMun-2018-2042_VP.xlsx` → **200 OK, content-type xlsx, ~3.8 MB**, archivo binario real
  descargado y verificado (no HTML de error). Cobertura: **2018-2042** (más años que los 2018-2035
  pedidos), desagregado por área (cabecera/centro poblado y rural disperso).
- Existe también la variante con sexo y edad: `.../Municipal/PPED-AreaSexoEdadMun-2018-2042_VP.xlsx`
  (mismo dominio, misma verificación de página, no descargada en este dossier pero misma ruta = mismo
  riesgo de disponibilidad, alta probabilidad de estar viva).
- El dataset municipal en Socrata que aparece en el catálogo (`stc8-i9y9`,
  "PROYECCIÓN DE POBLACIÓN MUNICIPAL DE CHIQUINQUIRÁ 2018 A 2035 CNPV 2018 DANE") **es engañoso por su
  nombre**: se verificó con `$limit=3` que **solo contiene el municipio de Chiquinquirá** (Boyacá), subido
  individualmente por esa alcaldía — **NO sirve como fuente nacional/Urabá.**

**Estado:** 🟢 **DISPONIBLE HOY, descarga directa xlsx sin autenticación**, es la fuente correcta (no el
dataset de Socrata con nombre confuso). **Confirma un vacío real:** `public/data/municipios.geojson` no
tiene ningún campo de población — evidencia: `public/data/municipios.geojson:1` (propiedades = solo
`municipio`, `departamen`, `cod_dane_mpio`).

**Indicador que desbloquea:** denominador poblacional 2018-2042 por municipio y por área (urbano/rural) —
habilita **todas** las tasas per cápita que hoy el atlas no puede calcular correctamente (homicidios por
100k hab., médicos por 10k hab., cobertura de internet per cápita, etc.). Es probablemente el hallazgo
**más apalancado** de este dossier porque desbloquea recálculos en cascada de otras capas ya existentes.

**Esfuerzo de integración:** bajo — 1 descarga xlsx, filtrar por código DIVIPOLA de los 8 municipios de
Urabá (05045, 05837, 05172 [Chigorodó — verificar código exacto], 05147 [Carepa], 05490 [Necoclí], 05480
[Mutatá], 05051 [Arboletes], 05665 [San Pedro de Urabá] — confirmar cada código contra el archivo, no
asumir).

---

## 6. DANE — pobreza monetaria / IPM municipal

**Pedido:** pobreza monetaria e IPM por municipio.

**Verificado:**
- **IPM (Índice de Pobreza Multidimensional) municipal 2018**: ya está en el repo, viene del censo CNPV
  2018 vía TerriData/DNP — `public/data/terridata_full.geojson` tiene `ipm_total`, `ipm_total_anio: 2018`
  y `poblacion_miseria` — evidencia: `public/data/terridata_full.geojson:1` (Mutatá: `ipm_total: 57.8`).
  **Esto ya cubre el IPM pedido.**
- **Pobreza monetaria** (distinta del IPM): en Colombia el DANE **solo publica pobreza monetaria a nivel
  departamental/13 ciudades principales**, no municipal — la Gran Encuesta Integrada de Hogares (GEIH) no
  tiene tamaño de muestra para desagregar a municipios pequeños como los de Urabá. Se buscó explícitamente
  un dataset de pobreza monetaria municipal en el catálogo Socrata
  (`q=DANE pobreza monetaria departamental`) y **los resultados no incluyen ningún dataset municipal real
  para Urabá** (solo "POBREZA CUNDINAMARCA" de otro departamento, GEIH nacional/departamental).

**Estado:** 🟡 IPM municipal → ✅ ya integrado. Pobreza monetaria municipal → 🔴 **NO existe como dato
público a esa granularidad** (limitación metodológica del DANE, no un problema de acceso). No es
"gestionable" con derecho de petición tampoco — el DANE no la calcula a nivel municipal por diseño
muestral de la GEIH.

**Indicador que desbloquea:** ninguno nuevo más allá del IPM ya integrado. Recomendación: no perseguir
pobreza monetaria municipal; documentar la limitación en el atlas si se pregunta.

---

## 7. ANT — resguardos indígenas y consejos comunitarios (Ley 70)

**Pedido:** territorios étnicos con resolución legal.

**Verificado:**
- El repo ya tiene `public/data/resguardos_ant.geojson` (35 resguardos, según ROADMAP §1.5, marcado ✅) y
  ya reemplazó el backup de OSM (`resguardos_indigenas_osm_backup.geojson` sigue en el repo como
  respaldo).
- Catálogo Socrata confirma la existencia de datasets oficiales ANT vigentes: **"Resguardo Indígena
  Formalizado"** (`id pyj2-wbse`, dueño "Agencia Nacional de Tierras", actualizado 2026-05-18) y
  **"Consejo Comunitario Titulado"** (`id 6k7a-ched`, mismo dueño, actualizado 2026-05-18; hay también una
  copia espejo más reciente vía MinTIC-Datos Abiertos, `id 766s-gj6w`, actualizada 2026-07-03 — **hace 4
  días**, la más fresca de todo este dossier).
- 🟡 **Confirmar con token**: las consultas de contenido (`.json?$limit=2`) a `pyj2-wbse` y `6k7a-ched`
  devolvieron **403 Forbidden** en este dossier — consistente con *rate-limit* anónimo de Socrata tras
  ~15 llamadas seguidas sin `X-App-Token`, no con que el dataset esté caído (el catálogo sí los devuelve
  como activos y actualizados esta semana). Repetir con `curl -H "X-App-Token: $TOKEN"
  https://www.datos.gov.co/resource/6k7a-ched.json?$limit=5` antes de concluir que no sirven.

**Estado:** ✅ Resguardos ya integrado (35 polígonos). Consejos comunitarios Ley 70 — **fuente oficial
identificada y viva (`6k7a-ched` / `766s-gj6w`), pendiente de confirmar contenido con token** antes de
descargar. Dado que el ROADMAP §1.6 ya lo marca "✅ descarga", probablemente ya se haya bajado en una
sesión anterior con token — verificar si existe una capa de consejos comunitarios en el repo (no se
encontró un `.geojson` explícito con ese nombre en `public/data/`, solo resguardos).

**Indicador que desbloquea:** territorios colectivos afro — diferenciador único de Urabá (ROADMAP lo
llama así explícitamente). Si no está integrado aún, es una brecha real pese al ✅ del ROADMAP.

---

## 8. RUNAP — Registro Único Nacional de Áreas Protegidas (WFS)

**Pedido:** todas las AP + DRMI Golfo, reemplaza SINAP con 3 polígonos.

**Verificado:**
- El repo ya tiene `public/data/runap_areas.geojson` (capa activa, según listado de `public/data/`) y
  también `sinap_areas_protegidas.geojson` (el que se reemplaza, ROADMAP dice 3 polígonos).
- Se intentó verificar el WFS oficial de parquesnacionales.gov.co (`runap.parquesnacionales.gov.co/
  geoserver/ows?service=wfs...`) → **sin respuesta útil vía WebFetch** (contenido vacío / no XML
  parseable por la herramienta; no necesariamente el servicio está caído, WFS/XML no siempre es legible
  para un fetcher orientado a HTML/JSON).
- Alternativa en catálogo Socrata: **"runap - Registro Unico Nacional AP"** (`id n9kx-xwgg`, dueño
  "Ministerio de TIC - Datos Abiertos", actualizado 2026-04-09) y **"Cartografía del Registro Unico
  Nacional de Áreas Protegidas"** (`id k7kn-depg`, dueño "Adriana Bernal", actualizado 2026-06-22 — muy
  reciente). Ambos devolvieron **403 Forbidden** en la consulta de contenido (mismo patrón de rate-limit
  que ANT).

**Estado:** ✅ Ya integrado en el repo (fuente original probablemente el WFS directo de
parquesnacionales, consistente con el ✅ del ROADMAP §1.7). 🟡 Para refrescar/ampliar: usar
`k7kn-depg` (actualizado hace 15 días) con `X-App-Token`, es la copia más fresca encontrada en Socrata.

**Indicador que desbloquea:** ya desbloqueado (capa activa). Oportunidad: refrescar con `k7kn-depg` si el
polígono del DRMI Golfo de Urabá no está completo en la versión actual.

---

## 9. INVÍAS — red vial nacional

**Pedido:** estado de pavimento + categoría, reemplaza fallback OSM.

**Verificado:**
- Dataset: **"Red Vial"**, dos IDs activos en catálogo: `id ie7y-asdn` y `id t27e-ckxb`, ambos dueño
  "Instituto Nacional de Vías - INVIAS", **actualizados 2026-07-01** (hace 6 días — el más fresco de los
  datasets de infraestructura en este dossier).
- `https://www.datos.gov.co/resource/ie7y-asdn.json?$limit=2` → **200 OK**, confirma geometría real:
  campo `multiline` tipo `MultiLineString` con coordenadas, más atributos `categoria`, `superficie`
  (tipo de pavimento), `nombre_ruta`, `nombre_tramo`, `sector`, `administrador`, `territorial`,
  `codigo_tramo`, `fuente: "IGAC (Contrato 2932/2008)"`.
- El repo ya tiene `public/data/red_vial_invias.geojson` (344 tramos según ROADMAP §4.1, marcado ✅) y
  también `red_vial_primaria.geojson` — no se pudo confirmar en este dossier si la versión actual del
  repo usa `ie7y-asdn` o una descarga shapefile anterior; dado que el dataset se actualizó hace 6 días,
  **vale la pena re-sincronizar** para capturar cambios recientes (ej. avance de obras Toyo/Mar 1-2).
- INVÍAS también publica **"Puentes"** (`id yw62-kuai`) y **"Postes de Referencia"** (`id hkfu-563n` /
  `ufg7-is7r`), ambos actualizados 2026-07-01 — no pedidos explícitamente pero son complemento directo
  (puentes críticos en la vía al Urabá, kilometraje exacto).

**Estado:** ✅ Ya integrado, con oportunidad de refresco (dataset fuente actualizado hace 6 días).

**Indicador que desbloquea:** ya desbloqueado. Nuevo indicador posible con "Puentes" (`yw62-kuai`):
estado/tipo de puentes en la vía al mar — relevante porque la conexión Medellín-Urabá tiene puentes
críticos de un solo carril en varios tramos.

---

## 10. RUNT — parque automotor municipal

**Pedido:** motorización por municipio.

**Verificado:**
- Dataset: **"CRECIMIENTO DEL PARQUE AUTOMOTOR RUNT2.0"**, `id u3vn-bdcy`, dueño "RUNT 2.0",
  **actualizado 2026-06-03**.
- `https://www.datos.gov.co/resource/u3vn-bdcy.json?$where=upper(nombre_municipio) like
  '%APARTAD%'&$limit=10` → **200 OK**, confirma 2 registros reales para APARTADO (Antioquia): vehículo
  particular clase AUTOMOVIL y vehículo público clase CAMION, ambos `estado_del_vehiculo: "ACTIVO"`,
  publicación mayo 2026.
- Campos: `nombre_departamento`, `nombre_municipio`, `nombre_servicio` (particular/público),
  `estado_del_vehiculo`, `nombre_de_la_clase` (automóvil, camión, campero...), `fecha_de_registro`,
  `cantidad`, `mes_de_publicacion`, `a_o_de_publicacion`.
- **Advertencia de calidad de dato:** el campo `fecha_de_registro` en varios registros muestra valores
  como `"1900"` o `"1946"` — sospechoso de ser un valor por defecto/placeholder del sistema RUNT y no la
  fecha real de matrícula. No usar ese campo para antigüedad del parque automotor sin validación adicional
  (usar solo `cantidad` agregada por clase/municipio, que sí parece confiable).

**Estado:** 🟢 **DISPONIBLE HOY**, formato JSON Socrata, granularidad municipal, sin capa aún en
`public/data/` (no existe `runt*.geojson` ni similar).

**Indicador que desbloquea:** motorización (vehículos por habitante, requiere el denominador del hallazgo
#5), y mezcla particular/público por municipio — proxy de actividad económica formal.

**Esfuerzo de integración:** bajo — agregar `cantidad` por municipio/clase, unir a `municipios.geojson` por
nombre.

---

## 11. SIEDCO / Policía Nacional — delitos (datos abiertos)

**Pedido:** delitos por municipio.

**Verificado:**
- Catálogo confirma varios datasets activos del dueño **"DIJIN"** (Policía Nacional) en `datos.gov.co`:
  Delitos sexuales (`fpe5-yrmw`), Homicidios en accidente de tránsito (`ha6j-pa2r`), Violencia
  intrafamiliar (`vuyt-mqpw`), **Hurto por modalidades** (`d4fr-sbn2`), Terrorismo (`37p5-impc`), todos
  actualizados 2026-05-18.
- Verificación de contenido: `https://www.datos.gov.co/resource/d4fr-sbn2.json?$where=upper(departamento)
  ='ANTIOQUIA' AND upper(municipio) like '%APARTAD%'&$limit=5` → **200 OK**, **5 registros confirmados**
  para Apartadó, Antioquia, 2018-2023, tipo "HURTO ABIGEATO" (robo de ganado — dato muy relevante para
  zona bananera/ganadera).
- Campos: `departamento`, `municipio`, `codigo_dane`, `armas_medios`, `fecha_hecho`, `genero`,
  `grupo_etario`, `tipo_de_hurto`, `cantidad`.
- No se verificó homicidios comunes/general (dataset específico no localizado en esta búsqueda — el
  catálogo de DIJIN en datos.gov.co tiene decenas de datasets segmentados por modalidad de delito;
  requiere una segunda pasada dedicada si se quiere el set completo de "seguridad" del ROADMAP).

**Estado:** 🟢 **DISPONIBLE HOY**, formato JSON Socrata, granularidad municipal con `codigo_dane` (permite
join limpio), serie histórica multianual. No hay ninguna capa de seguridad/delitos en `public/data/` hoy
(se buscó "siedco" y no aparece en el repo).

**Indicador que desbloquea:** un indicador de seguridad completamente nuevo para el atlas — hoy no existe
ninguna capa de criminalidad. Relevante para inversionistas y cooperación internacional (percepción de
riesgo).

**Esfuerzo de integración:** medio — hay que decidir qué subconjunto de delitos traer (5+ datasets DIJIN
distintos) y agregarlos por municipio/año antes de sumar al índice v3.

---

## 12. MEN — matrícula y deserción escolar

**Pedido:** matrícula/deserción por municipio.

**Verificado — segundo hallazgo de alto valor:**
- Dataset: **"MEN_ESTADISTICAS_EN_EDUCACION_EN_PREESCOLAR, BÁSICA Y MEDIA_POR_MUNICIPIO"**,
  `id nudc-7mev`, dueño "Ministerio de Educación Nacional", actualizado 2026-05-18.
- `https://www.datos.gov.co/resource/nudc-7mev.json?$where=upper(municipio) in ('APARTADÓ','TURBO',
  'CHIGORODÓ','CAREPA','NECOCLÍ','MUTATÁ','ARBOLETES','SAN PEDRO DE URABÁ') AND a_o='2024'` → **200 OK**,
  confirmó **7 de 8 municipios de Urabá con datos 2024** (San Pedro de Urabá no apareció en esa consulta
  puntual — verificar variante de escritura del nombre antes de concluir ausencia real). Ejemplo:
  Apartadó cobertura neta 88.46% / deserción 4.8%; Necoclí cobertura neta 105.67% (sobrecobertura, típico
  de municipios receptores de migración) / deserción 5.23%; Mutatá deserción 7.37% (la más alta de la
  subregión).
- Campos: `a_o`, `c_digo_municipio`, `municipio`, `c_digo_departamento`, `departamento`, `c_digo_etc`,
  `etc`, `poblaci_n_5_16`, `tasa_matriculaci_n_5_16`, `cobertura_neta` (+ desagregado por
  transición/primaria/secundaria/media), `cobertura_bruta` (ídem), `deserci_n` (ídem),
  `aprobaci_n`/`reprobaci_n`/`repitencia` (ídem).
- Esto es **más granular por nivel educativo** que lo que ya está en `terridata_full.geojson` (que solo
  trae `cob_neta_total`/`desercion_oficial` agregados, sin desagregar transición/primaria/secundaria/
  media) — evidencia: `public/data/terridata_full.geojson:1`.

**Estado:** 🟢 **DISPONIBLE, ya parcialmente redundante** con TerriData (que trae el agregado), pero
**más rico** si se quiere desagregar por nivel educativo (ej. mostrar que la deserción se concentra en
media, no en primaria).

**Indicador que desbloquea:** deserción/cobertura desagregada por nivel (transición/primaria/secundaria/
media), no solo el total que ya existe.

---

## 13. Tabla resumen

| # | Fuente | Estado hoy | URL/endpoint verificado | Formato | Granularidad | Fecha máx. dato |
|---|--------|-----------|--------------------------|---------|---------------|-------------------|
| 1 | TerriData DNP | ✅ ya integrado (vía Socrata individual, no API TerriData) | `terridata.dnp.gov.co` (sin API); `nkjx-rsq7` Socrata | GeoJSON en repo / JSON Socrata | municipal | 2024-2025 según campo |
| 2 | SUI coberturas | 🔴 energía no disponible; acueducto/alcant. ya integrado pero de 2016 | REC 404 hoy; sin dataset % cobertura energía | GeoJSON en repo | municipal | 2016 (desactualizado) |
| 3 | SIVICAP/IRCA | 🟢 nuevo, disponible hoy | `datos.gov.co/resource/nxt2-39c3.json` | JSON Socrata | municipal (+urbano/rural) | 2024 |
| 4 | MinTIC banda ancha | 🟢 nuevo, disponible hoy | `datos.gov.co/resource/n48w-gutb.json` | JSON Socrata | municipal, por proveedor/tecnología | 2023 |
| 5 | DANE proyecciones población | 🟢 nuevo, disponible hoy | `dane.gov.co/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaMun-2018-2042_VP.xlsx` | XLSX descarga directa | municipal, por área | 2018-2042 |
| 6 | DANE pobreza monetaria/IPM | IPM ✅ ya integrado; pobreza monetaria 🔴 no existe a nivel municipal | IPM en `terridata_full.geojson` | GeoJSON en repo | municipal (IPM) | 2018 |
| 7 | ANT resguardos/consejos | Resguardos ✅ integrado; Consejos 🟡 confirmar con token | `6k7a-ched` / `766s-gj6w` (403 anónimo) | JSON Socrata (pendiente confirmar) | polígono | act. 2026-07-03 |
| 8 | RUNAP WFS | ✅ ya integrado; refresco 🟡 con token | `k7kn-depg` (403 anónimo) | GeoJSON en repo | polígono | act. 2026-06-22 |
| 9 | INVÍAS red vial | ✅ ya integrado; refresco recomendado | `datos.gov.co/resource/ie7y-asdn.json` | JSON Socrata (MultiLineString) | tramo vial | act. 2026-07-01 |
| 10 | RUNT parque automotor | 🟢 nuevo, disponible hoy | `datos.gov.co/resource/u3vn-bdcy.json` | JSON Socrata | municipal | act. 2026-06-03 |
| 11 | SIEDCO/Policía delitos | 🟢 nuevo, disponible hoy | `datos.gov.co/resource/d4fr-sbn2.json` (+4 datasets DIJIN más) | JSON Socrata | municipal, con DIVIPOLA | 2018-2023 |
| 12 | MEN matrícula/deserción | 🟢 nuevo (desagregado por nivel), ya parcial en TerriData | `datos.gov.co/resource/nudc-7mev.json` | JSON Socrata | municipal, por nivel educativo | 2024 |

---

## 14. Recomendaciones priorizadas

1. **IRCA/SIVICAP (hallazgo #3)** — integrar primero. Cero fricción técnica, cubre 8/8 municipios, serie
   2018-2024, narrativa fuerte (Necoclí: pico de riesgo medio en 2020-2021, resuelto a 2024).
2. **DANE proyecciones de población (hallazgo #5)** — segunda prioridad porque es el denominador que
   desbloquea recalcular tasas per cápita en capas que **ya existen** (SIEDCO, RUNT, MinTIC, incluso
   equipamientos REPS/SIMAT ya cargados). Sin esto, los nuevos hallazgos 3/4/10/11 solo dan cifras
   absolutas, no tasas comparables entre municipios de tamaño distinto.
3. **RUNT + SIEDCO + MinTIC (hallazgos #4, #10, #11)** — mismo patrón de integración (Socrata JSON,
   filtro por municipio, join por nombre o `codigo_dane`), se pueden hacer en un solo sprint de scripting.
4. **Confirmar con `X-App-Token`** los 3 datasets que devolvieron 403 (`6k7a-ched`/`766s-gj6w` consejos
   comunitarios, `k7kn-depg` RUNAP, `n9kx-xwgg` RUNAP alterno) antes de asumir que no sirven — el catálogo
   los muestra activos y actualizados en las últimas 2 semanas.
5. **Limpieza:** `terridata_indicadores.geojson` y los campos `null` en `tic_cobertura.geojson` deberían
   poblarse (con hallazgo #4) o eliminarse — hoy son esquemas vacíos que pueden confundir a quien audite
   el repo pensando que ya están cubiertos.
6. **Cobertura eléctrica (hallazgo #2)** sigue siendo un vacío real sin salida vía datos abiertos — no
   perseguir más en esta vía; el IPSE ZNI ya integrado es el mejor proxy disponible. Si se necesita el
   dato duro, es candidato a derecho de petición ante UPME/SSPD (no ante los municipios).
7. **Pobreza monetaria municipal (hallazgo #6)** — no es gestionable ni por API ni por petición; es una
   limitación estructural del diseño muestral de la GEIH. Documentar y descartar del roadmap de gestión
   institucional (mover fuera de la sección "peticiones").

---

## 15. Advertencias de honestidad de dato (para no violar los principios del atlas)

- El campo `fecha_de_registro` de RUNT (hallazgo #10) tiene valores sospechosos (`"1900"`, `"1946"`) que
  parecen placeholders del sistema — **no usar para "antigüedad del parque automotor"** sin auditoría
  adicional del dataset completo.
- El SUI de `pct_energia=null` (hallazgo #2) debe seguir marcado como `null`/"sin fuente" explícito, no
  como 0% — evitar que el frontend lo interprete como "0% de cobertura eléctrica" en algún cálculo de
  índice.
- El dataset MinTIC de internet fijo (hallazgo #4) llega solo hasta 2023 — si se integra, marcar
  explícitamente el año de corte en el tooltip, no asumir vigencia 2026.
- IPM (hallazgo #6) es dato censal 2018 (CNPV), no una encuesta anual — no tratarlo como si tuviera
  actualización reciente.

---

*Fin del dossier. Todas las URLs de esta investigación fueron consultadas en vivo el 2026-07-07 vía
`WebFetch`; los HTTP status reportados (200/403/404) corresponden a la respuesta observada en ese momento,
no a documentación de terceros.*

---

## Verificación adversarial (undefined)

**Método:** re-consulta en vivo (`curl`) de cada endpoint citado el 2026-07-08, lectura directa de los
`.geojson` en `public/data/` con Python, y grep contra el repo para reclamos sobre archivos. 11 hallazgos
evaluados, **9 confirmados** (algunos con corrección de detalle), **1 refutado** en su afirmación central
(TerriData indicadores), **1 con corrección de evidencia que no cambia el veredicto** (SUI energía).

### 1. IRCA / calidad de agua (INS) — ✅ CONFIRMADO, corregido a 9/9 (mejor de lo afirmado)
Re-consulta exacta del endpoint confirma los 8 municipios pedidos con IRCA 2024 idéntico al citado
(Necoclí 3.1, Apartadó 2.9, Arboletes 0.0, etc.) y el pico histórico de Necoclí (IRCA 24.4 en 2020, 22.6
en 2021) — cifras exactas verificadas. **Corrección:** la lista de municipios usada en el hallazgo omite
**San Juan de Urabá**, que sí es un municipio propio del atlas (`public/data/municipios.geojson` tiene 9
features, no 8: Mutatá, Chigorodó, Carepa, Apartadó, Turbo, San Pedro de Urabá, Necoclí, San Juan de
Urabá, Arboletes). Se verificó que el dataset INS **también** cubre San Juan de Urabá (IRCA 2024 = 3.2),
así que la cobertura real es **9/9**, no 8/8 — el hallazgo se queda corto, no sobreestima. Impacto/esfuerzo
sin cambios (alto/bajo).

### 2. DANE proyecciones de población — ✅ CONFIRMADO sin cambios
`HEAD` a la URL exacta devuelve `200 OK`, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
`Content-Length: 3,948,350` bytes (~3.8 MB) — coincide con lo reportado. Confirmado también que
`municipios.geojson` no tiene ningún campo de población (`{'municipio','departamen','cod_dane_mpio'}`
únicamente). Impacto/esfuerzo sin cambios (alto/bajo).

### 3. SIEDCO/DIJIN — ✅ CONFIRMADO sin cambios
Re-consulta exacta reproduce los 5 registros de hurto abigeato en Apartadó citados. `200 OK`. Impacto/
esfuerzo razonables (alto/medio) — se mantiene.

### 4. MinTIC internet fijo → `tic_cobertura.geojson` — ⚠️ CONFIRMADO PERO CORREGIDO A LA BAJA
El endpoint MinTIC (`n48w-gutb`) responde `200 OK` con datos reales. Pero la premisa **"todos sus campos
(pct_4g, pct_5g, pct_lte) están en null"** es **falsa**: al leer las 9 features de
`public/data/tic_cobertura.geojson` directamente, **5 de 9 municipios ya tienen `pct_4g` poblado** con
`tic_anio: 2023` (Carepa 78.6, Apartadó 86.4, Turbo 80.8, San Juan de Urabá 92.3, Arboletes 100.0) —
exactamente el año de corte (2023) que el propio hallazgo identifica como `max_anno` de la fuente MinTIC,
lo que indica que la capa **ya fue poblada desde esta misma fuente en algún momento**. Solo 4 municipios
(Mutatá, Chigorodó, San Pedro de Urabá, Necoclí) siguen 100% `null`. Este es un gap de **relleno parcial**,
no una integración desde cero. **Corrección:** esfuerzo baja de medio a **bajo** (es completar 4 filas, no
construir la capa), impacto baja de medio a **medio-bajo**. Nota adicional no capturada por el hallazgo
original: la URL de evidencia usa `like '%APARTAD%'`, que también matchea "LA APARTADA" (Córdoba) — no
afecta la conclusión pero conviene filtrar por departamento al integrar los 4 municipios faltantes.

### 5. RUNT parque automotor — ✅ CONFIRMADO, evidencia corregida
Con la URL exacta citada en el hallazgo (`like '%APARTAD%'` sin filtro de departamento), los 5 registros
devueltos son en realidad de **"LA APARTADA" (Córdoba)**, no de Apartadó (Antioquia) — la URL de evidencia,
tal como está escrita, **no confirma lo que dice confirmar**. Al agregar `upper(nombre_departamento)=
'ANTIOQUIA'`, sí aparecen registros reales de Apartadó, Antioquia, y el primero de ellos tiene
`fecha_de_registro: "1946"` — coincide exactamente con la advertencia de calidad de dato del hallazgo. El
hallazgo central (dataset vivo, sin capa `runt*.geojson` en el repo, advertencia de `fecha_de_registro`
sospechosa) queda **confirmado**, pero la URL de evidencia debe corregirse a:
`https://www.datos.gov.co/resource/u3vn-bdcy.json?$where=upper(nombre_departamento)='ANTIOQUIA' AND upper(nombre_municipio) like '%APARTAD%'&$limit=10`.
Impacto/esfuerzo sin cambios (medio/bajo).

### 6. MEN matrícula/deserción — ✅ CONFIRMADO con nota de nombre
Re-consulta exacta reproduce las cifras citadas (Apartadó cobertura neta 88.46%/deserción 4.8%, Mutatá
deserción 7.37%). **Corrección menor:** "San Pedro de Urabá" aparece en el dataset como **"San Pedro de
Uraba"** (sin tilde, código `05665`) — con el filtro `IN (...)` exacto del hallazgo no matchea por eso, no
porque falte el dato; ya lo advertía el propio hallazgo como algo a verificar, y aquí se confirma la causa
exacta. También se confirmó que **San Juan de Urabá** sí está en este dataset (deserción 2.03%, la más
baja de la subregión) — el 9º municipio, coherente con la corrección del hallazgo #1. Impacto/esfuerzo sin
cambios (medio/bajo).

### 7. INVÍAS red vial — ✅ ENDPOINT CONFIRMADO, referencia de archivo CORREGIDA
`https://www.datos.gov.co/resource/ie7y-asdn.json?$limit=2` → `200 OK` con geometría `MultiLineString`
real, confirmado. **Corrección de hecho:** el hallazgo afirma que el repo "ya tiene
`red_vial_invias.geojson` (344 tramos)" — falso. `red_vial_invias.geojson` tiene **11 features** (fuente
declarada en el propio archivo: `"Archivo SHP suministrado por la ANI"`, no Socrata). El archivo con
**344 tramos** es en realidad **`red_vial_primaria.geojson`** (confirmado contra `ROADMAP.md:15`: "red
vial 344"). Como ninguno de los dos archivos declara como fuente el dataset Socrata `ie7y-asdn`/`t27e-ckxb`
citado, la recomendación de "re-sincronizar" sigue siendo válida en espíritu (el dataset fuente sí se
actualizó hace 6 días) pero debe aclararse que **no se confirmó** que la capa actual del repo provenga de
ese endpoint — podría requerir una integración nueva, no un refresco. Impacto/esfuerzo sin cambios (medio/
bajo).

### 8. SUI energía — ✅ CONCLUSIÓN CONFIRMADA, evidencia de "404" CORREGIDA
Al re-consultar `https://www.superservicios.gov.co/.../reporte-de-estratificacion-y-coberturas` con
`curl -sL`, el servidor responde **`200 OK`**, no `404` — el contenido real es una página de reto
anti-bot de Incapsula (`Request unsuccessful. Incapsula incident ID...`), es decir, el sitio está detrás de
un WAF que bloquea a `curl`/`WebFetch`, no que la página fue eliminada. **No se puede concluir "404"** con
la evidencia disponible; lo correcto es "inaccesible por protección anti-bot, no se pudo confirmar
contenido". Dicho esto, la conclusión de fondo del hallazgo (no existe en el catálogo Socrata un dataset
de % cobertura eléctrica por municipio) se **re-verificó de forma independiente**: búsqueda en el catálogo
(`q=cobertura energia electrica municipio`) no devuelve ningún dataset con esa granularidad — solo
tarifarios y reportes ZNI, igual que documentó el hallazgo. **Veredicto: conclusión sostenida, cita de
evidencia corregida.** Impacto/esfuerzo sin cambios (medio/alto), `disponible_ya: false` se mantiene.

### 9. Pobreza monetaria municipal DANE — ✅ CONFIRMADO
Búsqueda independiente en el catálogo Socrata (`q=pobreza monetaria municipal`) devuelve únicamente
"POBREZA CUNDINAMARCA" y un dataset de Renta Ciudadana — ningún dataset municipal para Urabá. Confirma la
limitación estructural de diseño muestral de la GEIH. Impacto/esfuerzo sin cambios (bajo/alto).

### 10. TerriData DNP / `terridata_indicadores.geojson` — ❌ REFUTADO en su afirmación central
El hallazgo afirma que `terridata_indicadores.geojson` es **"un esquema hermano 100% null"** que "debería
limpiarse". Falso: al leer las 9 features del archivo, **solo Mutatá está 100% null**; las otras 8
(Chigorodó, Carepa, Apartadó, Turbo, San Pedro de Urabá, Necoclí, San Juan de Urabá, Arboletes) tienen
valores reales de `nbi_pct`, `analfabetismo`, `cobertura_salud`, `icbf_desnutricion`, `saber11_ptje`. Peor
aún — y esto **no lo detectó el hallazgo original**: esos valores **no coinciden** con los campos
equivalentes de `terridata_full.geojson` para el mismo municipio. Ejemplo, Chigorodó:
`nbi_total` = 21.19 en `terridata_full.geojson` vs `nbi_pct` = 31.8 en `terridata_indicadores.geojson`;
`analfabetismo` = 9.54 (2018) vs 7.1 en el archivo hermano. Es decir, **hay dos archivos activos con cifras
distintas para el mismo indicador y municipio** — un riesgo real de integridad de dato (¿cuál usa cada
componente del frontend?) que el hallazgo original no vio porque asumió que el archivo estaba vacío sin
leerlo completo. **Recomendación corregida:** NO borrar `terridata_indicadores.geojson` sin antes
auditar qué fuente originó cada archivo y reconciliar las cifras; borrar a ciegas podría eliminar el dato
"bueno" y dejar el "malo", o viceversa. Cerrar también el `null` de Mutatá. Impacto sube de **bajo a
medio** (es un riesgo de integridad de dato, no solo limpieza cosmética); esfuerzo sube de **bajo a
medio** (requiere investigar procedencia de cada archivo antes de tocar nada).

### 11. Consejos comunitarios / RUNAP — ✅ CONFIRMADO el bloqueo 403, matiz sobre el token
Re-consulta confirma `403 Forbidden` en ambos endpoints (`6k7a-ched`, `k7kn-depg`) — consistente con
rate-limit anónimo, dataset activo según catálogo. **Matiz:** el propio dossier cita "ver `CLAUDE.md` del
repo/memoria" como fuente de que el usuario tiene `X-App-Token` — se buscó en todo el repo
(`/Users/cristianespinal/atlas-uraba-web`) y **no existe ningún `CLAUDE.md`**, ni ninguna referencia a
`SOCRATA_TOKEN`/`X-App-Token` fuera del propio dossier. Esto no refuta que el usuario tenga el token (puede
vivir en `~/.claude` u otro entorno fuera de este repo, consistente con la memoria de sesión), pero **no
está verificado dentro de este repo** — la recomendación de "repetir con `curl -H X-App-Token`" es válida,
solo que su premisa de disponibilidad del token no se pudo confirmar con evidencia local. Impacto/esfuerzo
sin cambios (medio/bajo), `disponible_ya: false` se mantiene correcto (bloqueado hoy).

### Resumen del veredicto
- **Verificados / sostenidos:** 9 de 11 (#1, #2, #3, #5, #6, #7, #8, #9, #11) — algunos con corrección de
  evidencia o de alcance, pero la conclusión central se mantiene.
- **Confirmado con downgrade de impacto/esfuerzo:** #4 (MinTIC/tic_cobertura) — la capa ya está 56%
  poblada, no 0%.
- **Refutado en su afirmación central:** #10 (TerriData indicadores) — el archivo no está vacío, tiene
  datos reales que además **contradicen** a su archivo hermano; la recomendación de borrarlo es
  contraproducente sin antes reconciliar.
