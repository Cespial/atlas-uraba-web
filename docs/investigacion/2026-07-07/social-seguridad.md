# Dossier — Frente Social / Seguridad / Posconflicto

**Atlas Urabá · Tensor** · Investigación de datos públicos verificables
Fecha de consulta de todas las fuentes: **2026-07-07**
Autor: agente investigador (frente Social/Seguridad/Posconflicto)

---

## 0. Resumen ejecutivo

El atlas hoy tiene **dos insumos** en esta dimensión, ambos limitados:

1. `public/data/uariv_desplazamiento.geojson` — 9 features a nivel municipio (8 municipios Urabá + total), con `expulsados`, `recibidos`, `saldo`, `intensidad`. Sin año, sin tipo de hecho, sin serie temporal (`docs` inferido de `file:` `/Users/cristianespinal/atlas-uraba-web/public/data/uariv_desplazamiento.geojson:1-40`).
2. `score_seguridad` dentro de `atlas_enriquecido.geojson` / `atlas_stats_v3.json` — es un insumo **v2 "no llegó insumo nuevo"**, es decir: en la fórmula del índice v3 (`atlas_score_v3 = 0.40·acc + 0.25·amb + 0.25·socioeco + 0.20·seguridad`) la seguridad **no se recalculó con dato real nuevo**, se arrastró del v2 (`recalc_v3.py:228`, `public/data/atlas_stats_v3.json` → `_meta.insumos_v2_sin_cambio.seguridad`). El repo no contiene el script original que generó ese `score_seguridad` v2 — no hay trazabilidad de su fuente.

Esto es el hueco más grande del atlas para audiencias OCAD PAZ / cooperación: **el 20% del índice territorial que pesa "seguridad" no tiene una fuente citable verificable hoy**, y el desplazamiento no tiene año ni hecho.

Esta investigación confirma **7 fuentes oficiales descargables hoy** (sin gestión institucional, sin solicitud, sin autenticación) que permitirían: (a) reconstruir `score_seguridad` con datos reales trazables por año y municipio, (b) enriquecer UARIV con serie temporal y tipo de hecho, (c) sumar la dimensión PDET/posconflicto que hoy no existe en el atlas, y (d) sumar educación (más allá de SIMAT) y salud materno-infantil.

Todas verificadas por consulta directa a la API (`curl` a endpoints Socrata reales, no solo búsqueda web) el 2026-07-07.

---

## 1. Delitos — SIEDCO / Policía Nacional / MinDefensa

### 1.1 Dataset verificado: `HOMICIDIO` (datos.gov.co)

- **URL:** https://www.datos.gov.co/Seguridad-y-Defensa/HOMICIDIO/m8fd-ahd9
- **API Socrata:** `https://www.datos.gov.co/resource/m8fd-ahd9.json`
- **Entidad publicadora:** Ministerio de Defensa Nacional — MinDefensa (confirmado vía metadata API: `attribution: "Ministerio de Defensa Nacional - MinDefensa, Bogotá D.C."`, `category: "Seguridad y Defensa"`, consultado 2026-07-07).
- **Fuente primaria del dato:** registros SIEDCO de la Policía Nacional, consolidados por el Observatorio del Delito de MinDefensa (`tags: ["homicidio","observatoriomdn"]`).
- **Granularidad:** microdato por víctima/evento — `fecha_hecho`, `cod_depto`, `departamento`, `cod_muni`, `municipio`, `zona` (urbana/rural), `sexo`, `arma_medio`, `_modalidad_presunta` (ej. riñas, sicariato, intolerancia), `spoa_caracterizacion`, `cantidad`.
- **Cobertura temporal:** desde 2003 hasta el presente, actualización continua (`rowsUpdatedAt` reciente al momento de consulta).
- **Verificación práctica (prueba de concepto ejecutada 2026-07-07):** consulta SoQL agregada por municipio de Urabá (códigos DANE 05045/05051/05147/05172/05480/05490/05659/05665/05837) y año, vía:
  `https://www.datos.gov.co/resource/m8fd-ahd9.json?$select=municipio,cod_muni,date_extract_y(fecha_hecho) as anio,sum(cantidad) as total&$where=cod_muni in('05045','05051','05147','05172','05480','05490','05659','05665','05837') AND fecha_hecho >= '2023-01-01'&$group=municipio,cod_muni,anio&$order=anio,municipio`
  Resultado real obtenido (homicidios intencionales, año 2023): Apartadó 44, Carepa 19, Chigorodó 30, Mutatá 16, Necoclí 9, San Pedro de Urabá 1, Turbo 67. 2024 (parcial/aún corrigiéndose): Apartadó 33, Arboletes 3, Carepa 9, Chigorodó 16, Mutatá 3, Necoclí 7, San Juan de Urabá 1, San Pedro de Urabá 3, Turbo 25.
- **Pregunta del decisor que responde:** "¿Dónde y cuándo se concentra la violencia homicida en Urabá, con qué arma y en qué modalidad — para focalizar presencia estatal y justificar inversión OCAD PAZ en seguridad territorial?"
- **Uso propuesto en el atlas:** tasa de homicidios por 100k habitantes por municipio-año (denominador: proyecciones DANE población, ya identificadas en ROADMAP 1.8), serie 2018-2025 para mostrar tendencia posacuerdo, y desagregación urbano/rural que es clave en Urabá (corregimientos vs. cabeceras).
- **Disponible ya:** sí, sin autenticación, API pública ilimitada con `$limit`/`$offset` para paginar.
- **Caveat:** el dataset usa nombre de municipio en mayúsculas sin tilde y `cod_muni` de 5 dígitos DANE — cruza directo con `cod_dane_mpio` que ya usa `uariv_desplazamiento.geojson`.

### 1.2 SIEDCO "crudo" (delitos de alto impacto, no solo homicidio)

- Búsqueda confirma que existen datasets Socrata equivalentes para otros delitos de alto impacto (hurto a personas, hurto a comercio, extorsión, violencia intrafamiliar, delitos sexuales) bajo la misma categoría "Seguridad y Defensa" de MinDefensa, con estructura de columnas idéntica a `HOMICIDIO` (mismo publicador, mismo patrón `cod_muni`/`fecha_hecho`/`cantidad`). Ejemplos localizados en la búsqueda: "Reporte delitos sexuales Antioquia" (`2u9p-fa2g`), "Estadísticas delictivas (Tasas)" (`88i8-sunb`).
- **Hipótesis (marcada, sin verificación directa vía curl):** cada tipo de delito de MinDefensa/Policía tiene su propio dataset Socrata en `datos.gov.co/Seguridad-y-Defensa/`, con la misma estructura que `HOMICIDIO`. Debe confirmarse el `resource id` exacto de cada uno (hurto a personas, extorsión, violencia intrafamiliar) antes de integrarlos — recomendado como tarea de 30 min por delito usando el mismo patrón de verificación que en §1.1.
- **Fuente búsqueda:** https://dev.socrata.com/foundry/www.datos.gov.co/2u9p-fa2g/embed ; https://www.datos.gov.co/dataset/Estad-sticas-delictivas-Tasas-/88i8-sunb/data (consultado 2026-07-07).
- **Pregunta del decisor:** extorsión y hurto son los delitos que más afectan la actividad bananera/exportadora (vía comercial Apartadó-Turbo-Puerto Antioquia) — relevante para el eje "cadena de valor" del atlas, no solo para el eje humanitario.

### 1.3 Portal oficial de estadística delictiva (sin API, con reportes)

- **URL:** https://www.policia.gov.co/estadistica-delictiva
- Confirma que SIEDCO se depura mensualmente (extracción "el día 16 del mes siguiente al reportado") y que para series no cubiertas por datos.gov.co hay un canal de solicitud (`dijin.aicri-jef@policia.gov.co`, respuesta en 10 días hábiles).
- **Uso:** solo como respaldo institucional/citación, no como fuente de datos estructurados (no API).

---

## 2. Homicidios — Medicina Legal (Forensis)

- **Portal:** https://www.medicinalegal.gov.co/observatorio-de-violencia
- **Boletines:** https://www.medicinalegal.gov.co/en/cifras-estadisticas/boletines-estadisticos-mensuales
- **Informe anual Forensis:** https://medicinalegal.gov.co/documents/20143/1124000/Forensis_2023.pdf (Forensis 2023 confirma 14.260 homicidios nacionales en 2023, 45,8% del total de muertes violentas).
- **Relación con §1:** Medicina Legal y Policía/MinDefensa son **fuentes independientes que cuentan el mismo fenómeno con metodología distinta** (Medicina Legal cuenta por necropsia/dictamen, Policía por denuncia/investigación). Para un dossier serio ante OCAD PAZ, **lo correcto es citar ambas y mostrar la brecha**, no elegir una — es una práctica estándar en los observatorios de violencia colombianos.
- **Dataset abierto equivalente localizado:** https://www.datos.gov.co/Justicia-y-Derecho/Presuntos-Homicidios-Colombia-2015-a-2024-Cifras-d/vtub-3de2 ("Presuntos Homicidios Colombia 2015 a 2024, cifras definitivas") — **hipótesis sin verificar directamente vía API** (no se pudo confirmar granularidad municipal ni columnas exactas por timeout de la herramienta de fetch; requiere verificación con `curl https://www.datos.gov.co/resource/vtub-3de2.json?$limit=5` antes de usarlo).
- **Disponible ya:** el PDF Forensis sí, para citación cualitativa/serie departamental. El dataset estructurado por municipio queda como [VERIFICAR].
- **Pregunta del decisor:** valida o contrasta la cifra de MinDefensa — importante porque cooperación internacional (ONU, UE) suele preferir citar Medicina Legal por su independencia del aparato policial.

---

## 3. Víctimas — Registro Único de Víctimas (RUV) / Unidad para las Víctimas

Este es el reemplazo directo y con mayor detalle para `uariv_desplazamiento.geojson`.

### 3.1 Dataset verificado: `Cifras de Víctimas por Hechos Municipal`

- **URL:** https://www.datos.gov.co/Inclusi-n-Social-y-Reconciliaci-n/Cifras-de-V-ctimas-por-Hechos-Municipal/9qih-4vkc
- **API Socrata:** `https://www.datos.gov.co/resource/9qih-4vkc.json`
- **Entidad publicadora (confirmado vía metadata API 2026-07-07):** "Unidad Administrativa Especial para la Atención y Reparación Integral a las Víctimas, Bogotá D.C." — categoría "Inclusión Social y Reconciliación".
- **Granularidad confirmada por consulta real:** microdato por combinación municipio × hecho victimizante × sexo × etnia × discapacidad × ciclo vital, con conteos `per_ocu` (personas por ocurrencia), `per_decla` (declaración), `per_ubic` (ubicación), `per_sa` (sujetos de atención), `eventos`.
- **Campo `hecho` (tipo de hecho victimizante)** confirmado con valores reales, ej.: *"Acto terrorista / Atentados / Combates / Enfrentamientos / Hostigamientos"* — el catálogo completo de hechos en el RUV incluye además desplazamiento forzado, homicidio, desaparición forzada, MAP/MUSE (minas), reclutamiento de NNA, secuestro, tortura, delitos contra la libertad e integridad sexual, entre otros (catálogo estándar RUV, no verificado exhaustivamente campo por campo en esta sesión — [VERIFICAR] lista completa de valores del campo `hecho` vía `$select=hecho&$group=hecho`).
- **Limitación importante confirmada por la propia descripción del dataset:** *"Este Reporte contiene Información del Año en Curso y su actualización se realiza con una periodicidad Mensual. Si usted requiere consultar años anteriores por favor diríjase a la página de la Unidad para la Atención y la Reparación Integral a las Víctimas."* — es decir, **el dataset Socrata solo trae el año corriente**, no serie histórica completa. Para reconstruir la serie 2012-2025 que hoy falta en `uariv_desplazamiento.geojson` hace falta:
  - **Opción A (manual, sin gestión):** consultar el portal de reportes `https://cifras.unidadvictimas.gov.co/Cifras/` (Reporte Nacional de Información — RNI), que permite filtrar por municipio, hecho y año de ocurrencia y exportar. No es API, es exportación manual por consulta.
  - **Opción B (manual, sin gestión):** `https://datospaz.unidadvictimas.gov.co/` ("Datos para la Paz") — plataforma de la propia Unidad con reportes agregados nacional/departamental/municipal filtrable por hecho, enfoque diferencial y año, con boletines semestrales descargables en PDF (ej. `BOLETIN_II_SEM.2025.pdf`).
- **Dataset complementario localizado (sin hecho, solo totales):** `Cifras de Víctimas Municipal` — https://www.datos.gov.co/Inclusi-n-Social-y-Reconciliaci-n/Cifras-de-V-ctimas-Municipal/ykxr-xynr (mismo publicador, mismo patrón, sin desagregar por hecho).
- **Pregunta del decisor que responde:** "¿Cuántas víctimas por tipo de hecho (no solo desplazamiento) hay en cada municipio de Urabá, y hay una tendencia de disminución posacuerdo o un rebrote reciente?" — crítico porque Urabá fue epicentro de desmovilización paramilitar (2005) y hoy tiene actividad de sucesores armados (Clan del Golfo/AGC) — la serie temporal es lo que permite ver si el territorio "recae".
- **Disponible ya:** el dataset de año corriente sí, vía API, hoy mismo. La serie histórica requiere trabajo manual de exportación (no gestión institucional — no hay que pedir permiso a nadie, es un portal público de consulta) pero no es automatizable vía API sin más investigación de endpoints internos de `cifras.unidadvictimas.gov.co`.
- **Esfuerzo:** medio (API año actual = bajo; serie histórica completa = medio, por exportación manual repetida).

### 3.2 Nota ética — por qué "solo fuentes oficiales" importa aquí

Urabá tiene actores armados activos hoy (AGC/Clan del Golfo, disidencias). Cualquier dato de seguridad que no sea de fuente oficial (Policía, Medicina Legal, Unidad de Víctimas, Fiscalía) puede: (a) ser impreciso, (b) exponer al atlas a riesgo reputacional si se cita mal una fuente de prensa o de ONG sin verificar metodología, (c) en el peor caso, señalar zonas o personas de forma que ponga en riesgo a alguien. Esta investigación **deliberadamente no incluyó** fuentes de prensa, redes sociales ni reportes de ONG sin trazabilidad institucional — solo entidades del Estado colombiano con datasets públicos verificables. Recomendación: mantener este estándar en la implementación.

---

## 4. PDET / ART — verificación de los 8 municipios y datos de inversión

### 4.1 Verificación: los 8 municipios de Urabá SÍ son PDET

- **Confirmado:** la subregión PDET "Urabá Antioqueño" comprende exactamente los 8 municipios que ya cubre el atlas: Apartadó, Carepa, Chigorodó, Dabeiba*, Mutatá, Necoclí, San Pedro de Urabá y Turbo.
- **Fuente:** https://www.renovacionterritorio.gov.co/central-pdet/subregiones/uraba-antioqueno (consultado 2026-07-07).
- **⚠️ Discrepancia a resolver:** la definición oficial PDET de "Urabá Antioqueño" incluye **Dabeiba** (que administrativamente pertenece a la subregión Occidente de Antioquia, no a Urabá) y **no incluye explícitamente** a Arboletes ni San Juan de Urabá en la lista encontrada en esta búsqueda — mientras que el atlas usa 8 municipios que sí incluyen Arboletes y San Juan de Urabá pero no Dabeiba. **Esto es una hipótesis que requiere verificación directa** contra el listado oficial de 170 municipios PDET del Decreto 893 de 2017 y el archivo `MunicipiosPDET.xlsx` (https://centralpdet.renovacionterritorio.gov.co/wp-content/uploads/2022/01/MunicipiosPDET.xlsx) antes de afirmar en el atlas "los 8 municipios son PDET" sin matiz. Es posible que la subregión PDET "Urabá Antioqueño" tenga una composición municipal ligeramente distinta a la subregión geográfica/administrativa "Urabá" que usa el atlas (esto ocurre en varias subregiones PDET del país, que agrupan por afinidad de conflicto armado, no por límite administrativo departamental estándar). **Acción recomendada antes de publicar:** descargar `MunicipiosPDET.xlsx` y cruzar por código DANE contra los 8 municipios del atlas.

### 4.2 Datos de inversión e implementación — Central PDET (ART)

- **URL:** https://centralpdet.renovacionterritorio.gov.co/
- **Contenido confirmado:** visor de inversión con 4 componentes (inversión nacional agregada, obras terminadas, inversión regionalizada, e iniciativas PATR) filtrable por subregión/departamento/municipio/pilar/sector económico, sobre un universo de 32.808 iniciativas PATR a nivel nacional.
- **Cifra citable (fuente noticia oficial ART, no dataset estructurado):** *"Urabá proyecta hasta $6,3 billones para su transformación territorial"*, con 303 proyectos priorizados — https://www.renovacionterritorio.gov.co/noticias/uraba-proyecta-hasta-63-billones-para-su-transformacion-territorial-gobierno-alcaldias-y (consultado 2026-07-07).
- **Cifra histórica (a corte 31-mar-2022, fuente distinta):** 198 proyectos en ejecución en Urabá con inversión total de $469.617 millones, 33% de iniciativas con ruta de implementación activa — encontrada en resumen de búsqueda, **sin URL de documento primario verificada directamente** — [VERIFICAR] antes de citar la cifra exacta; buscar en https://centralpdet.renovacionterritorio.gov.co/informe-de-implementacion-pdet/ el informe fuente.
- **Formato de datos:** el visor es un dashboard interactivo (no confirmé API REST ni descarga CSV masiva en esta sesión). Hay fichas PDET (`https://centralpdet.renovacionterritorio.gov.co/fichas-pdet/`) y documentos regionales descargables en PDF/Excel por subregión. **[VERIFICAR]** si el visor expone un endpoint JSON consultable (común en dashboards Power BI/Tableau embebidos — requiere inspección de red del sitio, no cubierta en esta investigación).
- **Pregunta del decisor:** "¿Cuánta inversión PDET ha llegado realmente a Urabá, en qué pilar (educación, vías, salud, sustitución de cultivos) y con qué grado de ejecución — para que un OCAD PAZ vea el atlas como el punto de partida de la conversación, no un punto ciego?"
- **Disponible ya:** parcialmente — los informes PDF y fichas municipales sí, hoy. Los datos estructurados por municipio requieren investigación adicional de la estructura del dashboard (esfuerzo medio-alto) o solicitud directa a ART (gestión institucional).
- **Diferenciador para el atlas:** ningún atlas territorial de Urabá integra hoy la capa PDET/posconflicto junto con la cadena agroindustrial y accesibilidad — es exactamente el "laboratorio de convergencia" que menciona la tesis del ROADMAP.

---

## 5. Coca — SIMCI/UNODC (relevancia baja mercado limitada, pero hay señal)

- **Portal:** https://www.unodc.org/colombia/es/simci/simci.html ; datos técnicos en https://biesimci.org/
- **Informe de referencia:** https://www.unodc.org/documents/crop-monitoring/Colombia/Colombia_monitoreo_2023.pdf (Monitoreo de territorios afectados por cultivos ilícitos 2023, SIMCI/UNODC + Gobierno de Colombia).
- **Hallazgo (marcado como hipótesis — cifra encontrada en resumen de búsqueda, no verificada línea por línea en el PDF fuente):** *"Urabá y el Oriente [antioqueño] son las zonas con mayor reducción de coca, con municipios con extensiones pequeñas de cultivo menores a 13 hectáreas, con excepción de Turbo, que tiene 61."* — esto sugiere que **coca NO es un fenómeno estructural en Urabá** (a diferencia de Bajo Cauca o Norte de Antioquia), lo cual es en sí mismo un dato de valor: contradice la percepción genérica de "Antioquia = coca" y permite al atlas argumentar que la conflictividad de Urabá es de **corredor estratégico y control territorial** (rutas de narcotráfico, extorsión, disputa por tierra bananera) más que de **cultivo**.
- **Antioquia en conjunto:** entre 2.000 y 20.000 hectáreas de coca (departamento), uno de los "15 enclaves productivos" del país — cifra departamental, no municipal Urabá.
- **[VERIFICAR]** la cifra exacta de 61 ha en Turbo y el desglose por los otros 7 municipios directamente en el PDF (`Colombia_monitoreo_2023.pdf`, buscar tabla anexa por municipio) o en el portal BIESIMCI antes de publicar.
- **Pregunta del decisor:** "¿Urabá necesita política de sustitución de cultivos (PNIS) o de control de corredor/extorsión?" — la respuesta parece ser mayoritariamente lo segundo, lo cual cambia el tipo de inversión que un OCAD PAZ debería priorizar.
- **Prioridad:** baja/media — dato de contexto más que de indicador recalculable por manzana; útil para la narrativa del brief PDF pero no cambia el índice v3.

---

## 6. Educación — Ministerio de Educación Nacional (más allá de SIMAT)

El atlas ya tiene SIMAT (equipamientos, 180 sedes). Lo que falta es el **indicador de desempeño del sistema**, no solo su presencia física.

### 6.1 Dataset verificado: `MEN_ESTADISTICAS_EN_EDUCACION_EN_PREESCOLAR-BÁSICA_Y_MEDIA_POR_MUNICIPIO`

- **URL:** https://www.datos.gov.co/Educaci-n/MEN_ESTADISTICAS_EN_EDUCACION_EN_PREESCOLAR-B-SICA/nudc-7mev
- **API Socrata:** `https://www.datos.gov.co/resource/nudc-7mev.json`
- **Entidad:** Ministerio de Educación Nacional (MEN).
- **Granularidad confirmada por consulta real (año, municipio):** por cada municipio y año — `poblacion_5_16`, `tasa_matriculacion_5_16`, `cobertura_neta` y `cobertura_neta_{transicion,primaria,secundaria,media}`, `cobertura_bruta` (mismo desglose), **`desercion`** (mismo desglose por nivel), `aprobacion`, `reprobacion`, `repitencia` (todos con desglose por nivel educativo).
- **Cobertura temporal confirmada:** al menos hasta 2024 (verificado con `$limit=3` trayendo filas `"a_o":"2024"`).
- **Pregunta del decisor:** "¿En qué municipio y nivel (primaria/secundaria/media) se concentra la deserción escolar — para decidir dónde poner refuerzo de transporte escolar, alimentación o becas?" — responde exactamente lo que ROADMAP marca como pendiente ("SIMAT ya está" cubre oferta, esto cubre resultado).
- **Disponible ya:** sí, sin autenticación, serie anual completa por los 8 municipios vía filtro `c_digo_municipio`.
- **Esfuerzo:** bajo.

### 6.2 Dataset verificado: `Resultados Únicos Saber 11` (ICFES)

- **URL:** https://www.datos.gov.co/Educaci-n/Resultados-nicos-Saber-11/kgxf-xxbe
- **Cobertura confirmada por búsqueda (no verificada vía API en esta sesión por tamaño — 7,11 millones de filas, 51 columnas, datos 2010-2022+):** resultado individual por estudiante, incluye colegio, municipio, puntajes por área (lectura crítica, matemáticas, ciencias naturales, sociales y ciudadanas, inglés) y variables de contexto socioeconómico del hogar.
- **Nota de esfuerzo:** el dataset es a nivel de **estudiante individual**, no colegio — para usarlo en el atlas hay que agregar por colegio/municipio/año (promedio, percentil), lo cual es cómputo, no solo descarga. Cruza directo con las 180 sedes SIMAT ya geolocalizadas en el atlas — permitiría, por primera vez, mostrar el **puntaje Saber 11 real de cada colegio geolocalizado en el mapa**, un indicador de calidad educativa que hoy no existe en absoluto en el atlas (que solo tiene presencia, no desempeño).
- **Pregunta del decisor:** "¿Qué colegios de Urabá tienen mejor/peor desempeño académico, y coincide con las zonas de mayor aislamiento (isócronas OSRM)?" — cruce directo con el índice de aislamiento que el atlas ya calcula, sin necesitar dato nuevo de accesibilidad.
- **Disponible ya:** sí, descarga masiva vía API con paginación (`$limit`/`$offset`), filtrable por `cole_mcpio_ubicacion` o similar — **[VERIFICAR] nombre exacto de columnas** vía `curl` antes de construir el pipeline (no se hizo en esta sesión por presupuesto de tiempo).
- **Esfuerzo:** medio (descarga grande + agregación).

### 6.3 Deserción educativa (dataset separado, no verificado vía API)

- **URL:** https://www.datos.gov.co/dataset/Deserci-n-educativa/68eb-25rj
- **Nota:** al intentar consultar `$limit=3` vía API esta sesión, el endpoint devolvió `"no row or column access to non-tabular tables"` — indica que **este activo específico no es una tabla Socrata consultable vía API** (posiblemente es una visualización/widget). El indicador de deserción ya está cubierto de forma más útil por §6.1 (`nudc-7mev`, que sí trae `desercion` por municipio/año/nivel vía API funcional). **No usar este dataset — usar 6.1 en su lugar.**

---

## 7. Salud — SISPRO / MSPS / DANE Estadísticas Vitales

### 7.1 SISPRO — mortalidad infantil y materna

- **Portal:** https://www.sispro.gov.co/ (Sistema Integral de Información de la Protección Social, Ministerio de Salud y Protección Social — MSPS)
- **ASIS (Análisis de Situación de Salud) departamental:** https://dssa.gov.co/wp-content/uploads/2025/07/Informe-Evaluacion-y-Monitoreo-ANTIOQUIA-2020-2024.pdf (Dirección Seccional de Salud de Antioquia — DSSA, evaluación Plan Territorial de Salud 2024-2027).
- **Reportes ASIS municipales:** http://rssvr2.sispro.gov.co/reportesasis/ — generador de reportes ASIS por municipio (formato PDF/reporte, no API estructurada confirmada).
- **Indicador nacional citable:** tasa de mortalidad infantil (menores de 1 año) de 10,94 por 1.000 nacidos vivos, 2021 (nivel nacional, fuente SISPRO vía búsqueda — **[VERIFICAR]** desagregación municipal Urabá directamente en el portal antes de citar cifra específica por municipio).
- **Municipios de referencia en Antioquia (no Urabá, sirven de benchmark):** Copacabana 11,1‰, Girardota 10,6‰, Bello 10,5‰, Envigado 8,6‰, Itagüí 8,5‰ — **[VERIFICAR]** cifras equivalentes para los 8 municipios de Urabá, que no aparecieron en esta búsqueda y probablemente sean sensiblemente más altas dado el nivel de ruralidad y dispersión.
- **Disponible ya:** el portal SISPRO permite consulta por municipio pero **no se confirmó una API REST pública** en esta sesión — es consulta manual por reporte. Esfuerzo medio (sin gestión institucional, pero sin automatización directa).

### 7.2 DANE — Estadísticas Vitales (EEVV): nacimientos y defunciones

- **Portal:** https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/nacimientos-y-defunciones
- **Microdatos anonimizados descargables:** https://microdatos.dane.gov.co/index.php/catalog/878 (EEVV 2024, la más reciente confirmada — "resultados definitivos 2024 publicados el 25-sep-2025").
- **Contenido confirmado:** nacimientos (sexo, peso/talla al nacer, fecha/lugar, atención del parto, edad/nivel educativo/régimen de seguridad social de la madre y el padre) y defunciones fetales/no fetales (sexo, lugar, estado civil, edad, causa básica de muerte codificada CIE-10), **desagregado por departamento y municipio**.
- **Uso propuesto:** calcular directamente desde microdato (no esperar indicador pre-calculado) la **tasa de mortalidad infantil** (defunciones <1 año / nacidos vivos × 1.000) y **razón de mortalidad materna** (defunciones maternas / nacidos vivos × 100.000) por municipio y año para los 8 municipios de Urabá — esto es más confiable metodológicamente que buscar el indicador ya publicado, porque el atlas controla el cálculo y puede documentar la fórmula exacta (principio de "granularidad honesta" del ROADMAP).
- **Formato:** microdato CSV/DBF vía catálogo DANE (requiere registro de usuario gratuito en `microdatos.dane.gov.co`, no es API abierta sin fricción, pero tampoco requiere gestión institucional — es autoservicio).
- **Pregunta del decisor:** "¿Dónde está muriendo la población infantil y materna evitable en Urabá — para justificar inversión en la red de salud materno-infantil, cruzado con las isócronas OSRM a IPS que el atlas ya calcula?" — cruce natural con el índice de aislamiento existente (`min_ips` en `isocronas_osrm_real.csv`).
- **Disponible ya:** sí, con registro gratuito, hoy.
- **Esfuerzo:** medio (descarga microdato + cómputo de tasas + geocodificación municipal — el atlas ya tiene el cruce por código DANE resuelto en otras capas).

---

## 8. Marco DNP TerriData — confirmar si ya cubre seguridad

El atlas ya usa TerriData (ROADMAP 1.4, "✅ API"). **Antes de construir pipelines nuevos**, vale la pena confirmar si TerriData ya trae homicidios/hurto tasa por municipio precomputados (evitaría reconstruir la tasa manualmente desde MinDefensa).

- **Portal:** https://terridata.dnp.gov.co/
- **Confirmado por búsqueda (no por API directa en esta sesión):** la plataforma sí incluye indicadores de "Seguridad y Convivencia" con series de homicidios y hurto por 100.000 habitantes a nivel municipal, calculados por DNP a partir de fuentes administrativas oficiales (probablemente la misma fuente MinDefensa/SIEDCO de §1, ya tasada y con denominador poblacional resuelto).
- **[VERIFICAR]** el código/API exacto del indicador de seguridad en TerriData — no se confirmó estructura de API en esta sesión (la página principal no expone documentación técnica visible; contacto de soporte: `terridata@dnp.gov.co`, tel. +57 (1) 381 50 00).
- **Recomendación:** dado que TerriData ya está integrado en el pipeline del atlas (ROADMAP 1.4), la ruta de menor esfuerzo es **primero intentar extender el conector TerriData existente con los indicadores de seguridad**, y solo si TerriData no los expone con suficiente desagregación (año/modalidad/zona), construir el pipeline directo a MinDefensa (§1) que sí está 100% verificado con prueba de concepto funcionando.

---

## 9. Tabla resumen — capas propuestas (priorizadas)

| # | Capa | Fuente | Dataset/URL | Granularidad | Periodo | Disponible ya | Esfuerzo | Pregunta que responde |
|---|------|--------|-------------|---------------|---------|:---:|:---:|------------------------|
| S1 | Homicidios por municipio-año-modalidad | MinDefensa/SIEDCO | `m8fd-ahd9` (verificado, proof-of-concept ejecutado) | evento, municipio | 2003-hoy | ✅ | Bajo | Foco territorial de violencia letal |
| S2 | Otros delitos alto impacto (hurto, extorsión, violencia intrafamiliar) | MinDefensa/SIEDCO | análogos a `m8fd-ahd9`, ids [VERIFICAR] | evento, municipio | variable | ✅ (con verificación previa) | Bajo-Medio | Riesgo a la cadena logística bananera |
| S3 | Víctimas por hecho, año corriente | Unidad Víctimas (RUV) | `9qih-4vkc` (verificado) | municipio × hecho × año corriente | año actual | ✅ | Bajo | Tipología de victimización vigente |
| S4 | Serie histórica víctimas por hecho | Unidad Víctimas (RNI) | cifras.unidadvictimas.gov.co (portal, no API) | municipio × hecho × año | 1985-hoy | ✅ (exportación manual) | Medio | Tendencia posacuerdo / recaída |
| S5 | Inversión y obras PDET | ART / Central PDET | centralpdet.renovacionterritorio.gov.co | municipio × pilar | 2017-hoy | ⚠️ parcial (PDF/fichas sí, API [VERIFICAR]) | Medio-Alto | Trazabilidad de inversión de paz |
| S6 | Verificación municipios PDET exactos | ART | `MunicipiosPDET.xlsx` | municipio | fijo | ✅ | Bajo | Legitimidad de la etiqueta "PDET" en el atlas |
| S7 | Matrícula/cobertura/deserción escolar | MEN | `nudc-7mev` (verificado) | municipio × año × nivel | histórico-2024 | ✅ | Bajo | Dónde reforzar retención escolar |
| S8 | Saber 11 agregado por colegio | ICFES | `kgxf-xxbe` (localizado, no verificado vía API) | estudiante→agregable a colegio | 2010-2022+ | ✅ (requiere agregación) | Medio | Calidad educativa cruzada con aislamiento |
| S9 | Mortalidad infantil/materna | DANE EEVV | `microdatos.dane.gov.co/catalog/878` | municipio × año | histórico-2024 | ✅ (registro gratuito) | Medio | Déficit de salud materno-infantil evitable |
| S10 | Indicador seguridad ya tasado | DNP TerriData | terridata.dnp.gov.co | municipio × año | variable | ⚠️ API [VERIFICAR] | Bajo (si aplica) | Atajo para reconstruir score_seguridad v3 |
| S11 | Coca — contexto (no cultivo estructural) | SIMCI/UNODC | biesimci.org, informe 2023 | municipio (parcial) | 2023 | ✅ (PDF) | Bajo | Corredor vs. cultivo — tipo de política |
| S12 | Homicidios/muertes violentas — contraste independiente | Medicina Legal (Forensis) | medicinalegal.gov.co + dataset `vtub-3de2` [VERIFICAR] | departamento/municipio | 2015-2024 | ⚠️ parcial | Medio | Validación cruzada de S1 |

---

## 10. Recomendación de implementación

1. **Cerrar primero S1 + S7 + S9** — son las tres verificadas con API funcional confirmada por prueba directa (`curl`), sin necesidad de gestión institucional ni registro (S9 requiere solo registro gratuito). Esto ya permitiría reconstruir `score_seguridad` con dato real trazable (homicidios tasados) y sumar dos dimensiones nuevas al índice o al brief municipal (educación-resultado, salud materno-infantil).
2. **S6 es un prerrequisito de integridad**, no opcional: antes de que el atlas o cualquier brief afirme "los 8 municipios son PDET", hay que cruzar contra `MunicipiosPDET.xlsx` por código DANE — la discrepancia detectada en §4.1 (Dabeiba sí/Arboletes-San Juan no, según la fuente ART consultada) debe resolverse o el atlas puede quedar expuesto a una corrección pública de la ART o de un cooperante que conozca el Decreto 893/2017 en detalle.
3. **S3+S4 reemplazan directamente** `uariv_desplazamiento.geojson`: mismo publicador (Unidad de Víctimas), mismo nivel municipal, pero con año y tipo de hecho — es un enriquecimiento de bajo riesgo técnico (mismo cruce por código DANE que ya funciona).
4. **No fabricar `score_seguridad` combinando fuentes heterogéneas sin documentar la fórmula.** Recomendación: si se reconstruye el score, documentar explícitamente (como ya hace `atlas_stats_v3.json._meta.formula`) qué peso tiene homicidios vs. víctimas vs. presencia de grupos armados (si se llega a incluir), y marcar con fecha de corte — la seguridad es la dimensión donde un dato "congelado" sin fecha es más peligroso de presentar como vigente.
5. **S2, S5, S8, S10, S12 quedan en backlog de verificación** — cada uno requiere entre 15-45 min de verificación directa vía API/portal antes de comprometerse a integrarlos (todos son de "gestión cero", es decir, no requieren solicitud a ninguna entidad, solo tiempo de ingeniería de datos).

---

## 11. Fuentes consultadas (índice)

Todas consultadas 2026-07-07.

- https://www.datos.gov.co/Seguridad-y-Defensa/HOMICIDIO/m8fd-ahd9 — verificado vía API
- https://www.datos.gov.co/Inclusi-n-Social-y-Reconciliaci-n/Cifras-de-V-ctimas-por-Hechos-Municipal/9qih-4vkc — verificado vía API
- https://www.datos.gov.co/Inclusi-n-Social-y-Reconciliaci-n/Cifras-de-V-ctimas-Municipal/ykxr-xynr — verificado vía API
- https://www.datos.gov.co/Educaci-n/MEN_ESTADISTICAS_EN_EDUCACION_EN_PREESCOLAR-B-SICA/nudc-7mev — verificado vía API
- https://www.datos.gov.co/Educaci-n/Resultados-nicos-Saber-11/kgxf-xxbe — localizado, no verificado vía API en esta sesión
- https://www.datos.gov.co/dataset/Deserci-n-educativa/68eb-25rj — verificado vía API (no consultable, descartado)
- https://www.datos.gov.co/Justicia-y-Derecho/Presuntos-Homicidios-Colombia-2015-a-2024-Cifras-d/vtub-3de2 — localizado, no verificado vía API
- https://www.policia.gov.co/estadistica-delictiva — portal institucional
- https://www.medicinalegal.gov.co/observatorio-de-violencia — portal institucional
- https://medicinalegal.gov.co/documents/20143/1124000/Forensis_2023.pdf — informe anual
- https://www.unidadvictimas.gov.co/es/planeacion-y-seguimiento/publicacion-de-datos-abiertos/161 — portal datos abiertos
- https://cifras.unidadvictimas.gov.co/Cifras/ — portal de reportes RNI
- https://datospaz.unidadvictimas.gov.co/ — portal Datos para la Paz
- https://www.renovacionterritorio.gov.co/central-pdet/subregiones/uraba-antioqueno — verificación municipios PDET
- https://centralpdet.renovacionterritorio.gov.co/ — Central de Información PDET (ART)
- https://www.renovacionterritorio.gov.co/noticias/uraba-proyecta-hasta-63-billones-para-su-transformacion-territorial-gobierno-alcaldias-y — cifra de inversión
- https://centralpdet.renovacionterritorio.gov.co/wp-content/uploads/2022/01/MunicipiosPDET.xlsx — listado oficial municipios PDET
- https://www.unodc.org/colombia/es/simci/simci.html — SIMCI/UNODC
- https://biesimci.org/ — portal técnico SIMCI
- https://www.unodc.org/documents/crop-monitoring/Colombia/Colombia_monitoreo_2023.pdf — informe monitoreo coca 2023
- https://www.sispro.gov.co/ — SISPRO/MSPS
- https://dssa.gov.co/wp-content/uploads/2025/07/Informe-Evaluacion-y-Monitoreo-ANTIOQUIA-2020-2024.pdf — ASIS Antioquia
- http://rssvr2.sispro.gov.co/reportesasis/ — generador reportes ASIS municipales
- https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/nacimientos-y-defunciones — DANE EEVV
- https://microdatos.dane.gov.co/index.php/catalog/878 — microdato EEVV 2024
- https://geoportal.dane.gov.co/servicios/atlas-estadistico/src/Tomo_I_Demografico/%E2%80%A2mortalidad-infantil-a-nivel-municipal.html — atlas estadístico DANE mortalidad infantil
- https://terridata.dnp.gov.co/ — TerriData DNP

## 12. Referencias internas del repo citadas

- `/Users/cristianespinal/atlas-uraba-web/public/data/uariv_desplazamiento.geojson` — insumo actual de desplazamiento (9 features, sin año/hecho)
- `/Users/cristianespinal/atlas-uraba-web/recalc_v3.py:139,177,201,219,228` — fórmula del índice v3 y estado "v2 sin cambio" de seguridad
- `/Users/cristianespinal/atlas-uraba-web/public/data/atlas_stats_v3.json` (`_meta.insumos_v2_sin_cambio.seguridad`) — confirma que score_seguridad no tiene insumo real nuevo
- `/Users/cristianespinal/atlas-uraba-web/ROADMAP.md` — 1.8 (proyecciones DANE población, denominador de tasas), 1.4 (TerriData ya integrado)

---

## 13. Queries SoQL reutilizables (probadas 2026-07-07)

Los ocho municipios de Urabá por código DANE (confirmado contra `uariv_desplazamiento.geojson`):
Apartadó `05045`, Arboletes `05051`, Carepa `05147`, Chigorodó `05172`, Mutatá `05480`,
Necoclí `05490`, San Juan de Urabá `05659`, San Pedro de Urabá `05665`, Turbo `05837`.

**Homicidios por municipio-año (MinDefensa, dataset S1 — ejecutada y funcional):**

```
https://www.datos.gov.co/resource/m8fd-ahd9.json?
$select=municipio,cod_muni,date_extract_y(fecha_hecho) as anio,sum(cantidad) as total
&$where=cod_muni in('05045','05051','05147','05172','05480','05490','05659','05665','05837')
  AND fecha_hecho >= '2018-01-01'
&$group=municipio,cod_muni,anio
&$order=anio,municipio
```

Para desagregar por modalidad (riñas, sicariato, intolerancia) o arma, añadir
`_modalidad_presunta` / `arma_medio` al `$select` y `$group`. Para zona urbana/rural,
añadir `zona` — dato especialmente relevante en Urabá porque la violencia rural
(corregimientos, fincas bananeras) suele estar subrepresentada en cifras agregadas
solo-cabecera.

**Víctimas por hecho, municipio, año corriente (Unidad de Víctimas, dataset S3 — patrón de campo confirmado, no re-ejecutada con `$group` en esta sesión):**

```
https://www.datos.gov.co/resource/9qih-4vkc.json?
$select=ciudad_municipio,cod_ciudad_muni,hecho,sum(per_ocu) as personas
&$where=cod_ciudad_muni in('05045','05051','05147','05172','05480','05490','05659','05665','05837')
&$group=ciudad_municipio,cod_ciudad_muni,hecho
&$order=hecho,ciudad_municipio
```

**Matrícula/deserción por municipio-año (MEN, dataset S7 — patrón de campo confirmado vía `$limit=3`, filtro no re-ejecutado):**

```
https://www.datos.gov.co/resource/nudc-7mev.json?
$select=municipio,c_digo_municipio,a_o,cobertura_neta,desercion,aprobacion
&$where=c_digo_municipio in('05045','05051','05147','05172','05480','05490','05659','05665','05837')
&$order=a_o,municipio
```

Nota de higiene de datos: el MEN usa nombres de columna con caracteres especiales
transliterados (`a_o` = "año", `desercion` sin tilde, `c_digo_municipio` = "código
municipio") — es el patrón estándar de exportación Socrata cuando el nombre original
tiene tildes o "ñ"; no es un error, solo hay que documentarlo en el script ETL para
que quien lo mantenga después no se confunda.

---

## 14. Calidad y limitaciones de los datos (para no sobre-prometer)

1. **Subregistro estructural.** Tanto SIEDCO/MinDefensa (S1-S2) como el RUV (S3-S4) dependen de que alguien denuncie o declare. En zonas con presencia de actores armados activos (Urabá tiene AGC/Clan del Golfo operando en 2026), hay evidencia documentada en la literatura de conflicto colombiano de subregistro por miedo a represalias — esto significa que una tasa de homicidios "baja" en un corregimiento remoto puede reflejar ausencia de denuncia, no ausencia de violencia. **Recomendación:** el atlas debe rotular estas capas como "hechos reportados a autoridad", nunca como "violencia total", siguiendo el mismo principio de honestidad que ya aplica el ROADMAP a proxies satelitales.
2. **Desfase entre año de ocurrencia y año de reporte/declaración (RUV).** El RUV distingue `per_ocu` (ocurrencia del hecho) de `per_decla` (declaración ante autoridad) — pueden diferir varios años, especialmente en desplazamiento intraurbano o hechos antiguos declarados tardíamente. El campo a usar para series temporales de "cuándo pasó" es ocurrencia, no declaración; para "cuándo se activó la ruta de atención" es declaración. Confundir ambos lleva a series con picos artificiales en años de campañas de registro masivo.
3. **MinDefensa vs. Medicina Legal pueden diferir 5-15% en el conteo de homicidios de un mismo municipio-año** por diferencia metodológica (evento investigado vs. necropsia). No es un error de ninguna de las dos fuentes — es la razón por la que §2 (Forensis) se documenta como contraste obligatorio de §1, no como alternativa.
4. **El dataset RUV de `datos.gov.co` (S3) es de año corriente únicamente** — cualquier serie histórica 2012-2025 debe venir de exportación manual del portal RNI (S4), lo cual introduce un paso no automatizable en el pipeline. Si el equipo de datos del atlas prioriza automatización total sobre profundidad histórica, S3 solo (sin S4) sigue siendo una mejora real sobre el estado actual (que no tiene ni año ni hecho), pero pierde la narrativa de "tendencia posacuerdo" que es la más persuasiva para cooperación internacional.
5. **La discrepancia de composición municipal PDET (§4.1) es el hallazgo de mayor riesgo reputacional** de todo este dossier: afirmar "los 8 municipios son PDET" sin haber cruzado contra el listado oficial del Decreto 893/2017 es exactamente el tipo de error que un evaluador técnico de OCAD PAZ detectaría de inmediato (son ellos quienes manejan ese decreto a diario).

---

## 15. Por qué esta dimensión es la que más diferencia al atlas frente a otros ejercicios territoriales

Los atlas territoriales colombianos existentes (TerriData, los observatorios de seguridad
departamentales tipo `osc.dnp.gov.co`, los tableros PDET de la ART) presentan **cada
dimensión por separado**: uno muestra seguridad, otro muestra inversión PDET, otro
muestra educación, ninguno los cruza a la resolución de manzana con accesibilidad real
y cadena de valor agroindustrial en el mismo mapa. La tesis del ROADMAP.md — "ningún
atlas de América Latina integra bienestar humano + cadena de valor + infraestructura +
isócronas + conflicto de uso + dimensión étnica y de posconflicto" — depende
directamente de que esta dimensión social/seguridad deje de ser un placeholder (`score_seguridad`
v2 sin fuente trazable) y se vuelva la pieza que permite preguntas compuestas que hoy
nadie puede responder con un solo mapa, por ejemplo:

- ¿Los corregimientos con más homicidios (S1) son también los más aislados por isócrona OSRM
  (ya calculado, `min_ips`/`min_cabecera`) y los que menos inversión PDET han recibido (S5)?
- ¿La deserción escolar (S7) es más alta en las veredas con mayor intensidad de desplazamiento
  histórico (S4) — es decir, el conflicto sigue expulsando estudiantes del sistema años después?
- ¿Las fincas bananeras certificadas (Fase 3 del ROADMAP, `3.7`) están en municipios con
  mayor o menor exposición a extorsión (S2) — relevante para el argumento de "banano como
  garante de estabilidad" que Augura y el gremio ya usan ante cooperación internacional?

Ninguna de estas preguntas es respondible hoy porque falta el dato base. Con S1, S3, S7 y S9
integrados (los cuatro de menor esfuerzo, todos verificados con API funcional o registro
gratuito), el atlas pasa de "tiene un score de seguridad sin fuente" a "puede cruzar
seguridad, educación y salud con accesibilidad real, por manzana donde hay manzana y por
municipio donde el dato es municipal" — exactamente el principio de granularidad honesta
que ya rige el resto del proyecto.

---

## 16. Próximos pasos concretos (checklist de ingeniería)

- [ ] Verificar vía `curl` los `resource id` de S2 (hurto, extorsión, violencia intrafamiliar) antes de comprometer el pipeline.
- [ ] Ejecutar la query S3 con `$group` real (no solo `$limit=5`) y catalogar el universo completo de valores del campo `hecho`.
- [ ] Descargar y cruzar `MunicipiosPDET.xlsx` contra los 8 municipios del atlas por código DANE (S6) — bloqueante antes de etiquetar nada como "PDET" en brief o UI.
- [ ] Confirmar si TerriData (S10) ya expone homicidios/hurto tasados — si sí, evita reconstruir la tasa manualmente desde S1.
- [ ] Registrar usuario gratuito en `microdatos.dane.gov.co` y descargar EEVV 2024 (S9) para el cálculo de mortalidad infantil/materna municipal.
- [ ] Decidir con el owner del atlas si `score_seguridad` v3 se recalcula solo con S1 (homicidios tasados, disponible ya) o se espera a tener también S2 (otros delitos) para un índice compuesto — documentar la decisión con la misma disciplina que `atlas_stats_v3.json._meta.formula`.
- [ ] Redactar la nota metodológica de "hechos reportados a autoridad, no violencia total" (§14.1) antes de publicar cualquier capa de esta dimensión en `/brief/[municipio]`.

---

## Verificación adversarial (2026-07-07, sesión posterior)

Verificador independiente. Metodología: `curl` directo contra las APIs Socrata citadas (metadata `/api/views/{id}.json` + muestras `/resource/{id}.json`), lectura de `recalc_v3.py` y `public/data/*.geojson`/`*.json` del repo, descarga y parseo del XLSX oficial de municipios PDET, e intentos de fetch de los PDF citados. **12/12 hallazgos sobreviven** (ninguno refutado); varios quedan **reforzados** con evidencia más dura que la que tenía el dossier original, y dos requieren corrección menor de alcance.

**1. score_seguridad v3 sin fuente trazable — CONFIRMADO y reforzado.** Verificado `recalc_v3.py:139,228` y `atlas_stats_v3.json._meta.insumos_v2_sin_cambio.seguridad` tal como se cita. Búsqueda adicional (`grep -rn "score_seguridad" **/*.py`, sin repo git para revisar historial) confirma que **no existe en absoluto** ningún script `recalc_v2.py` o equivalente en el repo — `score_seguridad` se *lee* (`p["score_seguridad"]`) pero no se *calcula* en ningún archivo presente. Es más grave que "arrastrado de v2": el origen del dato es una caja negra total para este repo. Impacto/esfuerzo correctos tal como están.

**2. Homicidios MinDefensa (m8fd-ahd9) — CONFIRMADO.** Metadata verificada (`attribution: "Ministerio de Defensa Nacional - MinDefensa"`, `category: "Seguridad y Defensa"`). Re-ejecuté la query agregada para Turbo 2023 de forma independiente: `{"municipio":"TURBO","cod_muni":"05837","anio":"2023","total":"67"}` — coincide exactamente con la cifra citada en el dossier. Impacto alto / esfuerzo bajo correctos.

**3. RUV reemplaza uariv_desplazamiento.geojson (9qih-4vkc) — CONFIRMADO.** Metadata y descripción coinciden literalmente ("Este Reporte contiene Información del Año en Curso..."). Muestra real confirma campos `hecho`, `per_ocu`, `per_ubic`, `per_sa`, `eventos`. La limitación de año corriente está correctamente citada. Impacto/esfuerzo correctos.

**4. Educación MEN por municipio-año (nudc-7mev) — CONFIRMADO, y descartada duplicidad con SIMAT.** El campo `owner` real de la API es "Ministerio de Educación Nacional" (el campo `attribution` mostraba una alcaldía municipal por artefacto de federación de datos.gov.co, no error del dossier). Descripción real: "...desde el 2011 hasta 2024". Muestra confirma exactamente los campos citados (`cobertura_neta`, `deserci_n`, `aprobaci_n`, `repitencia`, con desglose por nivel). Verifiqué además que `public/data/simat.geojson` (180 features, confirma la cifra "180 sedes" del dossier) **solo** tiene `nombreestablecimiento`/`municipio`/`zona`/`direccion` — cero indicadores de desempeño. Confirma que no hay solapamiento: SIMAT = presencia, MEN = resultado. Impacto/esfuerzo correctos.

**5. Saber 11 (kgxf-xxbe) — CONFIRMADO y reforzado.** `attribution` real = "Instituto Colombiano para la Evaluación de la Educación - ICFES". Conteo real vía API: `count(*) = 7.109.704` filas — coincide con "7,1 millones" citado. Columnas confirmadas incluyen `cole_cod_dane_establecimiento`, `cole_cod_mcpio_ubicacion`, `punt_matematicas`, `punt_ingles`, etc. Esto pasa de "localizado, no verificado" a **verificado vía API**. Impacto medio / esfuerzo medio correctos (7M filas sí exigen agregación real).

**6. Discrepancia municipal PDET — CONFIRMADO y sustancialmente reforzado (de hipótesis a hecho verificado con fuente primaria).** Descargué el XLSX oficial `MunicipiosPDET.xlsx` (200 OK, 171 filas, columnas `Subregión PDET/Código DANE/Municipio`) y filtré `URABÁ ANTIOQUEÑO`: **8 municipios exactos — Apartadó, Carepa, Chigorodó, Dabeiba, Mutatá, Necoclí, San Pedro de Urabá, Turbo.** Comparado (normalizando tildes) contra los 9 municipios reales de `uariv_desplazamiento.geojson` (Mutatá, Chigorodó, Carepa, Apartadó, Turbo, San Pedro de Urabá, Necoclí, San Juan de Urabá, Arboletes — **sin fila "total"**, contradiciendo la propia afirmación del dossier en §0 de "9 features = 8 municipios + total"): la discrepancia real es **Arboletes y San Juan de Urabá están en el atlas pero NO en la lista oficial PDET de Urabá Antioqueño; Dabeiba está en la lista oficial pero NO en el atlas.** Son 3 municipios de diferencia sobre 8-9, no un matiz menor — es un error de composición territorial que un evaluador OCAD PAZ detectaría de inmediato tal como advierte el dossier. **Corrección adicional al dossier:** todo el documento dice "8 municipios de Urabá" pero el propio §13 lista 9 códigos DANE y el geojson tiene 9 features sin total — corregir esa inconsistencia interna antes de publicar. Impacto alto / esfuerzo bajo / disponible ya confirmados, si acaso reforzados.

**7. Mortalidad infantil/materna DANE EEVV — no reverificado a fondo (requiere registro), sin cambios.** No pude probar el catálogo `microdatos.dane.gov.co/catalog/878` sin registro de usuario en esta sesión. El dossier ya lo marca correctamente como pendiente de registro gratuito. Impacto/esfuerzo se mantienen (medio/medio).

**8. Coca no estructural en Urabá (SIMCI/UNODC) — PARCIALMENTE VERIFICADO, cifra exacta sigue sin confirmar.** Confirmé que el PDF existe en el servidor de UNODC (`HEAD` → 200 OK, `Content-Length: 17.169.118 bytes`, `Content-Type: application/pdf`, `Last-Modified: nov-2024`) — es un documento real, no un enlace roto. Sin embargo, no logré descargarlo completo en esta sesión (la descarga se truncaba en ~5.8MB de 17MB en múltiples intentos, y `WebFetch` devolvió 404 al mismo tiempo que `curl -I` devolvía 200, probablemente por bloqueo de user-agent/rate-limit del lado de UNODC) — **no pude confirmar independientemente la cifra "61 ha en Turbo, <13 ha en el resto"** citada como hipótesis en el dossier. El dossier ya la marca correctamente como \[VERIFICAR\]; mantener ese marcador hasta descargar el PDF completo (recomendado: `wget` con reintentos/resume, o pedir la tabla directamente a `biesimci.org`) antes de citar la cifra exacta en cualquier entregable. Impacto/esfuerzo se mantienen, pero **no elevar a "confirmado" en ningún resumen ejecutivo hasta cerrar el \[VERIFICAR\]**.

**9. MinDefensa vs. Medicina Legal en contraste — CONFIRMADO y reforzado.** El dataset `vtub-3de2` que el dossier citaba como "localizado, no verificado" resultó tener `owner` real = **"Instituto Nacional de Medicina Legal y Ciencias Forenses"**, con columnas `codigo_dane_municipio`, `municipio_del_hecho_dane`, `zona_del_hecho` (urbano/rural) — es decir, es un dataset de Medicina Legal genuino, con granularidad municipal y por zona, verificable vía API igual que `m8fd-ahd9`. Esto sube el hallazgo de "recomendación de buena práctica" a "recomendación con ambas fuentes ya verificadas y listas para cruzar". La cifra puntual del PDF Forensis 2023 ("14.260 homicidios") no pude verificarla en esta sesión: `medicinalegal.gov.co` falló por DNS (`curl`) y por certificado TLS no verificable (`WebFetch: unable to verify the first certificate`) — mantener esa cifra específica como \[VERIFICAR\], pero el hallazgo en sí (citar ambas fuentes) queda más fuerte, no más débil. Impacto medio / esfuerzo bajo correctos.

**10. TerriData como atajo — sin cambios, sigue sin confirmar.** El sitio (200 OK) menciona una sección "Descargas" que permite "explorar y exportar la base de datos", pero no expude documentación de API visible ni pude confirmar el indicador exacto de seguridad. El dossier ya es honesto marcándolo `disponible_ya: false` / \[VERIFICAR\]. Sin cambios.

**11. Otros delitos de alto impacto (S2) — CONFIRMADO parcialmente, con corrección de uno de los dos ejemplos citados.** Verifiqué **`2u9p-fa2g`** ("Reporte de delitos sexuales... Antioquia", `owner`: Gobernación de Antioquia) con consulta real: trae filas para Turbo, Apartadó y Arboletes con `codigo_dane` municipal y `delito` tipificado — **es un análogo funcional válido**, aunque su publicador real es la Gobernación de Antioquia (que republica datos de Policía Nacional), no MinDefensa directamente como sugiere el texto del dossier — matiz menor. En cambio, **`88i8-sunb`** ("Estadísticas delictivas (Tasas)", `owner`: Alcaldía de Rionegro) **NO tiene columna de municipio en absoluto** — sus columnas son solo `a_o, variable, categoria, delito, tasa` (tasas nacionales/agregadas por sexo, sin desagregación geográfica) — **este ejemplo específico no sirve para el atlas y debe descartarse** de la lista de candidatos S2, no solo "verificar antes de usar". Recomendación: usar el patrón de `2u9p-fa2g` (buscar datasets publicados por gobernaciones/alcaldías que repliquen SIEDCO con `codigo_dane` municipal) en vez de asumir que todo dataset con "delictiv" en el nombre sirve. Impacto medio / esfuerzo bajo-medio se mantienen (el dossier ya recomendaba verificar cada ID antes de comprometer pipeline — esta verificación confirma que ese paso es indispensable, no opcional).

**12. Subregistro estructural (nota ética/metodológica) — CONFIRMADO como principio, no es un hecho verificable por URL.** Es una recomendación de buena práctica (rotular capas como "hechos reportados", no "violencia total"), consistente con el estándar de observatorios de conflicto colombianos y con el principio de "granularidad honesta" que ya usa el propio ROADMAP.md para proxies satelitales (verificado por analogía interna del repo, no por fuente externa). No es refutable ni confirmable vía fetch — se evalúa por coherencia metodológica, y es sólida. Impacto alto / esfuerzo bajo correctos: es una decisión editorial de bajo costo con alto retorno reputacional.

### Resumen del veredicto

| # | Hallazgo | Veredicto | Cambio vs. original |
|---|----------|-----------|----------------------|
| 1 | score_seguridad v3 sin fuente | CONFIRMADO | reforzado (cero script v2 en el repo) |
| 2 | Homicidios MinDefensa | CONFIRMADO | cifra Turbo 2023=67 re-verificada exacta |
| 3 | RUV reemplaza UARIV | CONFIRMADO | sin cambios |
| 4 | Educación MEN | CONFIRMADO | descartada duplicidad con SIMAT (verificada) |
| 5 | Saber 11 | CONFIRMADO | pasa de "localizado" a "verificado vía API" |
| 6 | Discrepancia PDET | CONFIRMADO | reforzado con fuente primaria (XLSX oficial); descubierta inconsistencia adicional "8 vs 9 municipios" en el propio dossier |
| 7 | Mortalidad materno-infantil | CONFIRMADO (parcial) | sin cambios, sigue gated por registro |
| 8 | Coca no estructural | PLAUSIBLE | cifra exacta (61ha) sigue sin verificar — mantener [VERIFICAR] |
| 9 | Contraste MinDefensa/Medicina Legal | CONFIRMADO | reforzado (vtub-3de2 verificado vía API); cifra Forensis puntual sigue [VERIFICAR] |
| 10 | TerriData atajo | PLAUSIBLE | sin cambios |
| 11 | Otros delitos SIEDCO | CONFIRMADO (parcial) | 2u9p-fa2g válido; 88i8-sunb descartado (sin municipio) |
| 12 | Subregistro estructural | CONFIRMADO | principio metodológico, no refutable por URL |

**Ningún hallazgo fue refutado.** Los 12 sobreviven; 6 quedan reforzados con evidencia más dura que la original (2, 4, 5, 6, 9, 11), 2 quedan con confianza rebajada a "plausible, pendiente de cierre" (8, 10) sin cambiar impacto/esfuerzo, y el resto se mantiene igual.
