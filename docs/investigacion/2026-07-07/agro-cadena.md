# Dossier — Cadena de valor agro: siguiente nivel para `/cadena`

**Frente:** Agro / cadena de valor (Producción EVA → Precio SIPSA → Exportación FOB)
**Repo:** `/Users/cristianespinal/atlas-uraba-web`
**Página objetivo:** `app/pages/cadena.vue` (266 líneas, 3 bloques: EVA 2019-2024, SIPSA 2024, FOB 2019-2025)
**Fecha de consulta de todas las fuentes:** 2026-07-07 (salvo que se indique otra fecha de publicación de la fuente)
**Método:** WebSearch + WebFetch dirigido, sin acceso a APIs con credenciales. Cada afirmación cuantitativa lleva URL. Las conclusiones sin URL directa están marcadas explícitamente como **[HIPÓTESIS]**.

---

## 0. Resumen ejecutivo

La página `/cadena` ya cubre el flujo interno (producción→precio doméstico→exportación), pero le falta la pieza que un gremio (Augura) o un inversionista pide primero: **¿cómo se compara Urabá con el mercado internacional, y quién le vende a quién con qué margen y qué riesgo?** La investigación identificó 8 mejoras concretas, todas ejecutables sin gestión institucional (descarga pública o cómputo con datos ya en el repo):

1. Precio internacional del banano (World Bank Pink Sheet) — referencia de mercado que falta por completo.
2. Extender SIPSA de 1 año (2024) a serie 2013-2024 — mismo catálogo DANE, solo bajar más archivos.
3. EVA 2025 preliminar ya existe en UPRA (el dataset Socrata que usa el repo sigue en 2019-2024).
4. Estadísticas públicas de Augura — cifras 2025 (récord de exportación, hectáreas, cajas, productividad) no incorporadas.
5. Estado fitosanitario Foc R4T — **dato de riesgo territorial ausente**: Urabá está declarada zona libre (Resolución ICA 095026/2021) pero el país ya tiene el hongo en La Guajira desde 2019. Esto es material para inversionistas.
6. Certificaciones (Rainforest Alliance / Fairtrade / GLOBALG.A.P.) — Colombia tiene cifras agregadas públicas, pero no hay una base descargable con geolocalización de fincas certificadas en Urabá específicamente.
7. Margen FOB vs. precio doméstico — la comparación que el bloque 2 y 3 insinúan pero no calculan, y que además tiene un problema metodológico de fondo (ver §7).
8. Puerto Antioquia — **cambio de estado mayor no reflejado**: el puerto ya no es "proyecto en construcción", entró en operación comercial el 3 de febrero de 2026 y movió su primer cargamento de banano en la primera semana de operación.

---

## 1. Precio internacional del banano — World Bank Pink Sheet

**Qué es:** el "Pink Sheet" es la serie mensual de precios de commodities del Banco Mundial, referencia estándar en informes de mercado agrícola. Incluye dos series de banano:

- *Bananas (Central & South America), major brands, US import price, free on truck (f.o.t.) US Gulf ports* — precio de importación a EE.UU., US$/tonelada métrica.
- *Bananas (Central & South America), major brands, f.o.t.* Europa (incluye derechos de importación).

**Fuente / descarga:**
- Página oficial: https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/world-bank-commodities-price-data-the-pink-sheet
- Archivo histórico mensual descargable directamente (xlsx, todas las commodities, incluye banano desde 1960s en adelante):
  **https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/related/CMO-Historical-Data-Monthly.xlsx**
- El Pink Sheet se republica cada mes con URL nueva bajo el mismo dominio `thedocs.worldbank.org`; el patrón de nombre es `CMO-Pink-Sheet-<Mes>-<Año>.pdf` (verificado: ediciones enero 2025 a junio 2026 existen y son accesibles públicamente sin autenticación).

**Estado de la verificación:** confirmé que la serie de banano existe y su nombre exacto vía búsqueda (metadata del Banco Mundial), pero **no pude extraer los valores numéricos del PDF/XLSX** con las herramientas de este dossier (el XLSX no es legible como texto plano vía WebFetch; el PDF de junio 2026 vino codificado). Este es un paso de "bajar el archivo y parsear con pandas", no de investigación adicional.

**Acción concreta para `/cadena`:** agregar un 4º bloque "Precio internacional" que descargue `CMO-Historical-Data-Monthly.xlsx` (build-time, no runtime — el sitio es estático), extraiga la columna de banano y la grafique junto al SIPSA doméstico. Esto le da a Augura/inversionistas el benchmark que hoy no existe en ningún atlas territorial colombiano.

- Esfuerzo: bajo (descarga + script Python/pandas, 1 columna).
- Disponible ya: sí, sin autenticación.

---

## 2. FAO FPMA / GIEWS — precio internacional, fuente alternativa

**Qué es:** herramienta de la FAO (Food Price Monitoring and Analysis) con ~90 series de precios internacionales y ~1.200-2.900 series domésticas/mayoristas en >120 países, actualizada mensualmente.

**Fuentes:**
- Herramienta interactiva: https://fpma.fao.org/giews/food-prices/tool/public/ (también existe una versión "V4": https://fpma.fao.org/)
- Ficha metodológica: https://www.fao.org/giews/food-prices/price-tool/en/
- Reporte anual específico de banano ("Banana Market Review"), con series históricas de comercio internacional y precios: edición 2025 referenciada en https://www.fao.org/family-farming/detail/en/c/1756764/ ; ediciones anteriores (2021, 2022) descargables como PDF en `openknowledge.fao.org` (ej. https://openknowledge.fao.org/server/api/core/bitstreams/3960b1b8-6cef-4ea0-b046-7b3d007bf724/content para 2022).

**Valor para Urabá:** el "Banana Market Review" de FAO es el único documento público que compara exportadores (Ecuador, Costa Rica, Colombia, Guatemala) en el mismo informe con series de precio y volumen — insumo directo para una sección comparativa "Colombia vs. competidores" en `/cadena`.

- Esfuerzo: bajo-medio (requiere leer PDF anual y extraer tabla).
- Disponible ya: sí.

**[HIPÓTESIS]** El FPMA Tool probablemente no tiene serie de precio de exportación específica para Colombia/Urabá (su fuerte es precio doméstico minorista/mayorista en 126 países) — no pude confirmar con certeza si hay serie de "precio de exportación FOB banano Colombia" dentro del tool interactivo sin acceso de sesión al widget. Se recomienda verificar directamente en https://fpma.fao.org/giews/food-prices/tool/public/ filtrando por Colombia/banano antes de comprometerse a construir sobre esta fuente.

---

## 3. IMF — Primary Commodity Prices

No se investigó a fondo en este dossier por redundancia: el FMI (`IMF Primary Commodity Price System`, https://www.imf.org/en/Research/commodity-prices) publica una serie de "Bananas, Central America and Ecuador, US import price" que **es prácticamente la misma serie subyacente que reporta el World Bank Pink Sheet** (misma fuente primaria de mercado). Recomendación: usar solo el Pink Sheet del Banco Mundial (más citado por gremios agro, formato más estable) y no duplicar esfuerzo con el FMI salvo que el Pink Sheet falle.

---

## 4. SIPSA — extender de 1 año a serie histórica 2013-2024

**Estado actual del repo:** `public/data/sipsa_precios.json` solo tiene 2024 (`mensual 24.csv`, un único archivo bajado el 2026-06-03). El propio `_meta` del archivo ya documenta el catálogo correcto:

```
file: public/data/sipsa_precios.json
"url_descarga": "https://microdatos.dane.gov.co/index.php/catalog/776/download/23891"
```

**Confirmado:** el catálogo DANE 776 ("Sistema de Información de Precios y Abastecimiento del Sector Agropecuario — Componente de Precios Mayoristas — SIPSA-P") cubre **2013-2024** completo, con archivos anuales descargables uno por uno desde microdatos.dane.gov.co.
- Fuente: https://microdatos.dane.gov.co/index.php/catalog/776/variable/F8/V38?name=V3 (confirma rango 2013-2024)
- Portal de descarga: https://microdatos.dane.gov.co/index.php/catalog/776 (sección "Obtener microdatos", archivos por año)
- Página institucional con boletines mensuales/históricos: https://www.dane.gov.co/index.php/estadisticas-por-tema/agropecuario/sistema-de-informacion-de-precios-sipsa/mayoristas-boletin-mensual-1/mayoristas-boletin-mensual-sipsa-historicos

**Acción concreta:** repetir el proceso de extracción ya documentado en `_meta` (filtro producto banano/plátano, plazas de Medellín + municipios de Antioquia) para los 11 años restantes (2013-2023) y unirlos en una sola serie temporal. Esto convierte el bloque 2 de "un año plano" a "tendencia de precio mayorista de 12 años" — mucho más útil para detectar estacionalidad y comparar con el precio internacional del §1.

- Esfuerzo: medio (11 descargas + reprocesamiento del mismo parser que ya existe).
- Disponible ya: sí, sin autenticación ni gestión.

---

## 5. EVA 2025 — ya existe, pendiente de incorporar

**Estado actual del repo:** `public/data/eva_produccion_serie.json` cubre 2019-2024 vía Socrata `uejq-wxrr` (extraído 2026-06-03).

**Hallazgo:** el dataset Socrata `uejq-wxrr` en sí mismo sigue titulado "2019-2024" y, según la ficha del portal, **no incluye 2025 todavía**:
- https://www.datos.gov.co/Agricultura-y-Desarrollo-Rural/Evaluaciones-Agropecuarias-Municipales-EVA-2019-20/uejq-wxrr

Pero **UPRA (la entidad que produce EVA) ya publicó resultados preliminares nacionales de EVA 2025**, en una página dedicada:
- https://upra.gov.co/es-co/eva/eva-2025

Según esa página: la recolección de EVA sigue un ciclo semestral — Semestre A (recolección jun-jul, resultados preliminares ~1 mes después) y Semestre B (recolección sep-dic, con cierre hasta marzo del año siguiente). Es decir, **EVA 2025 completo (con Semestre B) probablemente no esté consolidado hasta cerca de abril-mayo de 2026** — lo cual, dado que hoy es julio de 2026, sugiere que el dataset final 2025 ya podría estar disponible o muy cerca. Hay que verificar directamente si Socrata `uejq-wxrr` ya se actualizó a "2019-2025" (el título del dataset es la señal más rápida) o si hay que usar el archivo preliminar de UPRA en su lugar.

- Esfuerzo: bajo (re-consultar el mismo endpoint Socrata con filtro `a_o = 2025`, mismo parser).
- Disponible ya: sí — al menos como preliminar; posible ya como definitivo.
- **[VERIFICAR]** confirmar en tiempo de build si `uejq-wxrr` ya trae 2025 antes de escribir el nuevo pipeline; si no, usar los "Resultados preliminares nacionales EVA 2025" de UPRA como fuente alterna con la salvedad de "preliminar" en el `_meta`.

---

## 6. Augura — estadísticas públicas 2025 y proyección 2026

Augura (Asociación de Bananeros de Colombia) no publica una API ni un portal de datos abiertos estructurado (`estadisticas.augura.com.co` no existe como tal), pero sí:

1. **Biblioteca digital con informes anuales descargables en PDF** ("Coyuntura Bananera" y "Informe Gremial"), con ediciones históricas confirmadas 2015-2023 disponibles como URLs directas:
   - https://augura.com.co/wp-content/uploads/2023/04/Coyuntura-Bananera-2022-2.pdf
   - https://augura.com.co/wp-content/uploads/2021/06/INFORME-GREMIAL-2020-1.pdf
   - Portal: https://augura.com.co/biblioteca-digital/
   - **[VERIFICAR]** no se confirmó URL directa de "Coyuntura Bananera 2024" o "2025"; puede requerir navegar el portal (posible JS-rendered) o revisar Sala de Prensa: https://en.augura.com.co/sala-de-prensa/

2. **Cifras 2025 ya citadas en prensa especializada, con Augura como fuente primaria** (declaraciones del presidente del gremio), verificadas cruzando 3 medios:
   - Exportaciones totales 2025: **US$1.309 millones**, récord histórico (+21,6% vs. 2024) — https://www.portafolio.co/economia/agro/la-adecuada-labor-de-los-bananeros-nos-llevo-a-lograr-record-en-exportaciones-augura-492687
   - Volumen: **2,5 millones de toneladas / 133 millones de cajas de 20 kg**
   - Urabá: **32.465 ha, 82 millones de cajas** — líder indiscutible sobre la zona Caribe (Magdalena/La Guajira/Cesar: 20.478 ha, 51 millones de cajas)
   - Productividad: **2.516 cajas/hectárea** (+21% interanual)
   - Destinos: UE ~65,8-76% (cifra varía levemente entre fuentes, ambas citando Augura), EE.UU. ~17% (segundo mercado, nuevo), Reino Unido ~14%
   - Empleo: >52.000 trabajadores directos nacional; tasa de sindicalización en Urabá ~92%
   - Colombia = **3er exportador de banano de América Latina y el Caribe** (detrás de Ecuador y Guatemala)
   - Fuentes cruzadas: https://abceconomia.co/2026/04/23/exportaciones-banano-colombia-2025-record-usd-1-309-millones/ · https://www.infobae.com/colombia/2026/04/23/el-banano-vive-su-mejor-momento-en-colombia-pero-una-presion-economica-amenaza-con-frenar-la-bonanza/ · https://mundouraba.com/exportaciones-de-banano-alcanzan-1-309-millones-de-usd-en-2025/

3. **Proyección 2026 — riesgo a la baja, con causa climática ya materializada:**
   - Se proyecta **caída de ~5% interanual en exportaciones 2026** por lluvias/inundaciones.
   - **1.200+ hectáreas inundadas en Urabá** solo en los dos primeros meses de 2026.
   - Riesgo adicional de El Niño en el segundo semestre de 2026; presión de dólar débil, costos de fertilizantes al alza, disrupciones logísticas por conflicto en Medio Oriente.
   - Fuente: https://www.portafolio.co/economia/agro/la-adecuada-labor-de-los-bananeros-nos-llevo-a-lograr-record-en-exportaciones-augura-492687 y https://www.semana.com/economia/empresas/articulo/bananeros-baten-record-en-2025-pero-lluvias-y-costos-amenazan-desempeno-en-2026/202603/

4. **Señal de vulnerabilidad estructural — pérdida de área cultivada por rentabilidad, no por enfermedad:**
   - Uniban (la principal comercializadora) reporta que en los últimos dos años se abandonaron **~2.000 hectáreas** en la región, por falta de rentabilidad (no por Foc R4T), con productores migrando a palma de aceite.
   - Recambio generacional: baja el interés de jóvenes en el cultivo; Uniban capacita en drones/agricultura de precisión para atraer relevo.
   - Fuente: https://www.agrolatam.com/agricultura-latam/banano-colombia-2025-uniban-exportaciones-rentabilidad-uraba/

- Esfuerzo para incorporar cifras Augura al sitio: bajo (son cifras puntuales, no series descargables — se pueden anotar como "hitos" o texto de contexto en `/cadena`, no como dataset estructurado).
- Disponible ya: sí (cifras públicas citadas en prensa con atribución directa a Augura).

---

## 7. Foc R4T (Fusarium Raza 4 Tropical) — riesgo sanitario territorial ausente del atlas

Este es probablemente **el hallazgo de mayor impacto para inversionistas** entre todos los investigados: Atlas Urabá no tiene ninguna capa de riesgo fitosanitario, y es exactamente el tipo de riesgo que un due-diligence agroindustrial pregunta primero.

**Línea de tiempo confirmada:**

1. **Agosto 2019** — ICA confirma presencia de Foc R4T por primera vez en Colombia, en cultivos de banano Cavendish en **La Guajira** (no en Urabá). Declaración de emergencia fitosanitaria nacional vía **Resolución ICA 11912 de 2019** (9 de agosto de 2019). Afectación inicial: **175 hectáreas**, puestas en cuarentena.
   - https://www.portalfruticola.com/noticias/2019/08/08/colombia-confirma-presencia-de-fusarium-tr4-en-la-guajira/
2. El riesgo de diseminación se estima sobre **>575.000 hectáreas** de banano/plátano en las 32 departamentos del país (toda la superficie nacional del cultivo).
   - https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9963102/ (revisión científica sobre el avance del hongo en LATAM/Caribe)
3. **2021 — Urabá declarada zona libre**: el ICA emitió la **Resolución 095026 de 2021** declarando la región de Urabá **área libre de Foc R4T**, con medidas fitosanitarias específicas para mantener ese estatus.
   - https://www.ica.gov.co/noticias/ica-declaro-uraba-libre-fusarium-raza-4-tropical
4. **2024 — plan nacional formal**: **Resolución ICA 00002081 de 2024** adopta el "Plan Nacional de Prevención, Vigilancia y Control de Foc R4T" para todo el territorio nacional.
   - https://vlex.com.co/vid/resolucion-numero-00002081-2024-1028010023
5. **Convenio ICA-Augura-Asbama** — vigilancia activa específicamente en zonas bananeras de **Magdalena y Antioquia (Urabá)**, monto del convenio: **$4.532.097.534 COP**.
   - https://regioncaribe.com.co/ica-firmo-convenios-con-augura-y-asbama-para-prevencion-y-manejo-del-fusarium-r4t/
6. **Diciembre 2024** — capacitación ICA-Augura a 54 personas del sector musáceas en Urabá sobre prevención/contención.
   - (fuente citada en la misma búsqueda; ver también https://www.ica.gov.co/noticias/ica-augura-agrosavia-simulacro-fusarium-r4t — simulacro de respuesta ante posible aparición en Urabá)
7. **Enero 2026** — ICA refuerza vigilancia fitosanitaria nacional (nota de prensa reciente, confirma que el plan sigue activo).
   - https://elproductor.com/2026/01/colombia-ica-refuerza-vigilancia-fitosanitaria-por-fusarium-r4t/

**Conclusión verificada:** Urabá está oficialmente libre de Foc R4T y con barrera fitosanitaria activa (no hipótesis — resoluciones ICA con número y año localizadas). El hongo sí está presente en el país desde 2019 en el corredor La Guajira-Magdalena, con capacidad documentada de destruir hasta el 80% de la producción y contaminar el suelo por más de 30 años donde se establece.

**Acción concreta para `/cadena` o para el atlas en general:** agregar un indicador de "estatus fitosanitario" por municipio/zona (Urabá = libre con vigilancia activa) con enlace a las resoluciones ICA como fuente. Es un dato binario/cualitativo, no una serie numérica — encaja mejor como badge/alerta en la ficha municipal (`/brief/[municipio]`) que como gráfico en `/cadena`, pero la fuente aplica a ambos.

- Esfuerzo: bajo (es texto + 2-3 URLs de resolución, no requiere geoprocesamiento).
- Disponible ya: sí.

---

## 8. Certificaciones — Rainforest Alliance / Fairtrade / GLOBALG.A.P.

**Hallazgo clave:** existen agregados nacionales públicos, pero **ninguna de las tres certificadoras publica una base descargable con lista de fincas + coordenadas** de forma abierta y gratuita — se requeriría scraping de portales de verificación caso por caso, lo cual no es "descargable hoy" en el sentido de datos abiertos.

1. **GLOBALG.A.P.** — cifra agregada más citable: **Colombia tiene 42.500 hectáreas certificadas de banano**, segundo país por área certificada después de Ecuador (71.800 ha).
   - Verificación de certificados individuales: portal público por número GGN — https://www.globalgap.org/ggn/ (requiere conocer el número de certificado, no hay listado abierto por país/cultivo).
   - Buscador de organismos certificadores (no de fincas): https://www.globalgap.org/producers/find-cb/
   - **[VERIFICAR]** la cifra de 42.500 ha se originó de un snippet de búsqueda sin URL primaria confirmada en este dossier — antes de publicarla en el sitio, confirmar contra el reporte anual GLOBALG.A.P. (Integrated Farm Assurance, frutas y vegetales) o el "Banana Certification Data Report" cruzado.

2. **Rainforest Alliance** — publica un "Banana Certification Data Report" anual con estadísticas por país vía dashboard PowerBI embebido (no accesible por WebFetch estático):
   - https://knowledge.rainforest-alliance.org/docs/banana-certification-data-report-2023
   - Portal de verificación de certificados activos por finca/cadena de suministro (Certification Search and Summaries) — permite consultar certificados individuales, no descarga masiva:
   - Estudio de impacto específico Colombia (Wageningen University): trabajadores en fincas certificadas en Colombia usan más equipo de protección, mejores condiciones laborales y salarios más altos que fincas no certificadas — https://www.rainforest-alliance.org/resource-item/towards-a-sustainable-banana-supply-chain-in-colombia-impact-study/

3. **Fairtrade** — dashboard específico de banano con desglose por país:
   - https://www.fairtrade.net/en/products/Fairtrade_products/Bananas/fairtrade-banana-dashboard0.html (interactivo, no accesible por WebFetch estático — requiere carga manual en navegador)
   - Cifra de contexto regional: **cerca del 90% de las ventas de banano Fairtrade certificado provienen de República Dominicana, Colombia, Perú y Ecuador** combinados.
   - Casos puntuales en Urabá confirmados por nombre: **Bananeras de Urabá** (certificada Fairtrade desde 2005; vendió 1,2 millones de cajas de 18,14 kg en 2012), **Plantación Martha María** y **Agrosiete** — ambas identificadas explícitamente como fincas de Urabá en la ficha de Fairtrade UK: https://www.fairtrade.org.uk/farmers-and-workers/bananas/plantacion-martha-maria-colombia/

**Acción concreta:** dado que no hay base descargable, la ruta realista de corto plazo es **cualitativa**: una sección "Sostenibilidad y certificación" en `/cadena` con las 3 cifras agregadas (Colombia: 42.500 ha GLOBALG.A.P.; ~90% del Fairtrade LATAM concentrado en 4 países incl. Colombia; estudio de impacto Rainforest Alliance) más los 3 nombres propios de fincas certificadas en Urabá ya identificados, citando fuente. Una capa geolocalizada de fincas certificadas requeriría gestión directa con Augura o las certificadoras (correo/solicitud), fuera del alcance de "descargable hoy".

- Esfuerzo (cifras agregadas + texto): bajo.
- Esfuerzo (capa geolocalizada real): alto, requiere gestión institucional — **no disponible ya**.

---

## 9. Margen FOB vs. precio mayorista — posible, pero con problema metodológico real

**Cálculo hecho con datos que YA están en el repo** (no requiere fuente nueva):

`file: public/data/expo_banano_fob.json`

| Año | Toneladas | FOB USD | USD/kg implícito |
|---|---|---|---|
| 2019 | 1.330.545 | 611.706.000 | 0,460 |
| 2020 | 1.476.542 | 666.970.000 | 0,452 |
| 2021 | 1.470.612 | 659.631.000 | 0,449 |
| 2022 | 1.440.123 | 646.390.000 | 0,449 |
| 2023 | 1.035.458 | 531.293.000 | 0,513 |
| 2024 | 1.063.563 | 560.136.895 | 0,527 |
| 2025 (parcial) | 1.079.499 | 590.590.046 | 0,547 |

(cálculo propio: `fob_usd / (ton*1000)`, sobre `public/data/expo_banano_fob.json`)

**Validación cruzada:** el precio FOB/kg implícito de 2025 (US$0,547/kg) es consistente con la cifra de mercado citada en prensa — "el banano se comercializa en promedio a US$10 por caja" de ~18,14 kg → US$0,551/kg — https://www.agrolatam.com/agricultura-latam/banano-colombia-2025-uniban-exportaciones-rentabilidad-uraba/. Esto da confianza en la calidad del dataset FOB ya cargado.

**Advertencia metodológica real — por qué NO se puede simplemente restar SIPSA de FOB:**

El bloque 2 de `/cadena` (SIPSA) muestra precio mayorista doméstico de variedades **"Banano bocadillo"** y **"Banano criollo"**, que son variedades de **consumo doméstico/informal**, mientras que el bloque 3 (FOB) es 100% banano/plátano **Cavendish de exportación** (partida arancelaria HS 0803). **No es la misma fruta ni el mismo mercado** — restar ambos precios como si fuera "margen del productor" sería una comparación inválida, aunque visualmente tentadora.

- Fuente que confirma el filtro de productos en el SIPSA ya cargado: `file: public/data/sipsa_precios.json` (`_meta.filtro`: "Productos banano/plátano; plazas de Medellín... y municipios de Antioquia" — no específica variedad Cavendish).

**Ruta correcta para un margen real:** usar el precio de referencia/contrato anual que negocian productores y exportadoras (el mismo tipo de cifra que Ecuador publica oficialmente como "precio mínimo de sustentación" — en Colombia no existe un precio mínimo regulado, se pacta por contrato anual en octubre, según Augura) — fuente: https://www.agrolatam.com/agricultura-latam/banano-colombia-2025-uniban-exportaciones-rentabilidad-uraba/ ("los bananeros colombianos son tomadores de precio... el banano se comercializa por contrato, en la mayoría anuales"). Este precio de contrato no tiene una base de datos pública abierta identificada en esta investigación — sería vía Augura directamente (Coyuntura Bananera histórica podría traerlo).

**Acción concreta recomendada para `/cadena`:**
1. Sí publicar el margen FOB-implícito por año (tabla de arriba) como serie propia, etiquetada correctamente como "precio FOB promedio implícito, HS 0803" — sin comparar con SIPSA bocadillo/criollo.
2. Renombrar/aclarar en el bloque 2 que SIPSA cubre variedades domésticas (bocadillo/criollo/hartón), no la Cavendish de exportación — para no inducir al usuario a una comparación errónea.
3. Superponer la serie FOB/kg (arriba) contra el precio internacional Pink Sheet (§1) — esa sí es una comparación válida (misma variedad de facto, ambos son precios de exportación/importación Cavendish).

- Esfuerzo: bajo (tabla ya calculable con datos existentes; el ajuste de etiquetas es edición de texto).
- Disponible ya: sí.

---

## 10. Puerto Antioquia — cambio de estado mayor: de "proyecto" a "operando"

El ROADMAP.md (§2.6) lista Puerto Antioquia como "⚙️ manual — INVÍAS/APC reportes". La investigación encontró que **el proyecto cambió de fase entre la última auditoría del roadmap y hoy**:

**Hitos confirmados:**
- **29 de enero de 2026** — Ministerio de Transporte habilita el puerto mediante **Resolución No. 20263040003075**.
- **3 de febrero de 2026** — inicia recepción de carga de exportación.
- **7 de febrero de 2026** — llega el primer buque de carga.
- **Entre el 8 y el 14 de febrero de 2026** — 3 buques recogen 510 contenedores de exportación, **principalmente banano colombiano con destino Europa**.
- Fuentes: https://www.infobae.com/colombia/2026/02/08/gobierno-confirmo-el-inicio-de-operaciones-internacionales-en-puerto-antioquia/ · https://www.eltiempo.com/colombia/medellin/puerto-antioquia-inicio-su-operacion-comercial-de-manera-oficial-asi-operara-la-terminal-multiproposito-de-colombia-en-el-caribe-3530118 · https://portalportuario.cl/puerto-antioquia-atiende-primer-buque-con-18-700-toneladas-de-carga/

**Capacidad (fase 1, operativa ya):**
- **7 millones de toneladas/año** de capacidad total fase 1.
- Desglose por tipo de carga: **600.000 TEUs/año** (contenedores + refrigerados), **3 millones de toneladas de granel**, **1,15 millones de toneladas de carga general**.
- Buques hasta 367 m de eslora / 13.000-15.000 TEU (cifras varían levemente entre fuentes: 13.000 TEU según ANI, 15.000 TEU según otra fuente — usar la cifra oficial de ANI como autoritativa).
- Patio de almacenamiento: hasta **1.300 contenedores refrigerados simultáneos** — dato explícitamente relevante para banano/aguacate/flores.
- Fuente ANI (oficial): https://www.ani.gov.co/puerto-antioquia-logra-el-primer-hito-constructivo-tras-la-explanacion-del-terreno-y-el-dragado-en-0
- Fuente capacidad detallada: https://yamingenieria.com.co/puerto-antioquia-operaciones-2026-megapuerto-uraba-especificaciones/

**Fase 2 (proyectada):**
- **2028-2030**: expansión a **20 millones de toneladas/año**.

**Inversión:**
- Cifras encontradas varían por fuente/momento del proyecto: ~USD 300 millones de Capex (fuente ANI, en etapa temprana de construcción) vs. **USD 764 millones** de costo total del proyecto (fuente más reciente, yamingenieria.com.co). **[VERIFICAR]** cuál es la cifra vigente/consolidada — probablemente la de USD 764M ya incluye sobrecostos y fases adicionales frente al estimado inicial de USD 300M de Capex de construcción; no se debe promediar, hay que citar ambas con su fuente y fecha.

**Empleo:**
- 1.900 empleos directos durante construcción; proyección de **>3.500 empresas colombianas beneficiadas** y >11.000 empresas asociadas (transporte marítimo, logística, agencias aduaneras, hotelería) en 5 años.

**Complemento vial:** Túnel del Toyo con finalización proyectada para **diciembre de 2026** — reduce el tiempo Medellín-Urabá, refuerza el corredor logístico hacia el puerto.

**Acción concreta para `/cadena`:** el bloque 3 (FOB) es el lugar natural para una nota/anotación de línea temporal: "Puerto Antioquia entra en operación — feb. 2026" con enlace a fuente, marcando el punto de inflexión logístico que hasta ahora la exportación de Urabá dependía 100% de Cartagena/Turbo/Santa Marta. Es información cualitativa de alto valor narrativo para el público objetivo (Gobernación/DNP, inversionistas) aunque no sea una serie numérica descargable.

- Esfuerzo: bajo (anotación + 2-3 fuentes).
- Disponible ya: sí.

---

## 11. Qué NO se resolvió / requiere trabajo adicional

- **Precio internacional Pink Sheet — valores numéricos exactos**: se confirmó la fuente y URL de descarga, pero no se extrajeron los números (requiere parsear el XLSX, no es investigación sino ETL).
- **FAO FPMA — disponibilidad exacta de serie Colombia/banano dentro del tool interactivo**: no confirmado con certeza, requiere sesión de navegador contra el widget.
- **Augura — URL directa de "Coyuntura Bananera 2024/2025"**: no localizada; portal `biblioteca-digital` puede requerir JS. Las cifras 2025 sí están confirmadas vía prensa (con atribución a Augura), pero no vía el PDF primario del gremio.
- **GLOBALG.A.P. 42.500 ha Colombia**: cifra de snippet de búsqueda, sin URL primaria confirmada — marcar [VERIFICAR] antes de publicar.
- **Bases geolocalizadas de fincas certificadas (Rainforest/Fairtrade/GLOBALG.A.P.) en Urabá específicamente**: no existen como datos abiertos descargables; solo casos puntuales por nombre propio (3 fincas Fairtrade identificadas). Requeriría gestión directa con las certificadoras o Augura.
- **Precio de contrato/referencia productor-exportador (el "margen real")**: no hay fuente pública abierta identificada; probablemente en informes históricos de Augura (Coyuntura Bananera) o vía gestión directa.
- **Inversión total Puerto Antioquia**: cifra no reconciliada entre USD 300M (Capex construcción, fuente ANI) y USD 764M (costo total proyecto, fuente secundaria) — marcar ambas con fuente hasta reconciliar.

---

## 12. Fuentes citadas (índice)

- World Bank Pink Sheet — landing: https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/world-bank-commodities-price-data-the-pink-sheet
- World Bank Pink Sheet — XLSX histórico: https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/related/CMO-Historical-Data-Monthly.xlsx
- FAO FPMA Tool: https://fpma.fao.org/giews/food-prices/tool/public/
- FAO GIEWS Data & Tools: https://www.fao.org/giews/data-tools/en/
- FAO Banana Market Review 2022 (ejemplo de reporte anual): https://openknowledge.fao.org/server/api/core/bitstreams/3960b1b8-6cef-4ea0-b046-7b3d007bf724/content
- DANE SIPSA catálogo 776: https://microdatos.dane.gov.co/index.php/catalog/776
- DANE SIPSA rango de años confirmado: https://microdatos.dane.gov.co/index.php/catalog/776/variable/F8/V38?name=V3
- DANE SIPSA históricos mensuales: https://www.dane.gov.co/index.php/estadisticas-por-tema/agropecuario/sistema-de-informacion-de-precios-sipsa/mayoristas-boletin-mensual-1/mayoristas-boletin-mensual-sipsa-historicos
- Datos Abiertos — EVA (dataset usado en repo): https://www.datos.gov.co/Agricultura-y-Desarrollo-Rural/Evaluaciones-Agropecuarias-Municipales-EVA-2019-20/uejq-wxrr
- UPRA EVA 2025: https://upra.gov.co/es-co/eva/eva-2025
- Augura — biblioteca digital: https://augura.com.co/biblioteca-digital/
- Augura — Coyuntura Bananera 2022 (ejemplo de informe): https://augura.com.co/wp-content/uploads/2023/04/Coyuntura-Bananera-2022-2.pdf
- Portafolio — récord exportaciones 2025 y riesgos 2026 (declaraciones Augura): https://www.portafolio.co/economia/agro/la-adecuada-labor-de-los-bananeros-nos-llevo-a-lograr-record-en-exportaciones-augura-492687
- Infobae — banano vive su mejor momento pero presión económica: https://www.infobae.com/colombia/2026/04/23/el-banano-vive-su-mejor-momento-en-colombia-pero-una-presion-economica-amenaza-con-frenar-la-bonanza/
- abceconomia — récord USD 1.309 millones: https://abceconomia.co/2026/04/23/exportaciones-banano-colombia-2025-record-usd-1-309-millones/
- Mundo Urabá — exportaciones 1.309M USD 2025: https://mundouraba.com/exportaciones-de-banano-alcanzan-1-309-millones-de-usd-en-2025/
- Semana — bananeros récord 2025, lluvias y costos amenazan 2026: https://www.semana.com/economia/empresas/articulo/bananeros-baten-record-en-2025-pero-lluvias-y-costos-amenazan-desempeno-en-2026/202603/
- Agrolatam — Uniban, rentabilidad, abandono de tierras: https://www.agrolatam.com/agricultura-latam/banano-colombia-2025-uniban-exportaciones-rentabilidad-uraba/
- Portal Frutícola — confirmación Foc TR4 La Guajira 2019: https://www.portalfruticola.com/noticias/2019/08/08/colombia-confirma-presencia-de-fusarium-tr4-en-la-guajira/
- ICA — Urabá declarada libre de Foc R4T (Res. 095026/2021): https://www.ica.gov.co/noticias/ica-declaro-uraba-libre-fusarium-raza-4-tropical
- vLex — Resolución ICA 00002081 de 2024 (Plan Nacional Foc R4T): https://vlex.com.co/vid/resolucion-numero-00002081-2024-1028010023
- Región Caribe — convenio ICA-Augura-Asbama: https://regioncaribe.com.co/ica-firmo-convenios-con-augura-y-asbama-para-prevencion-y-manejo-del-fusarium-r4t/
- El Productor — ICA refuerza vigilancia enero 2026: https://elproductor.com/2026/01/colombia-ica-refuerza-vigilancia-fitosanitaria-por-fusarium-r4t/
- PMC — revisión científica avance Foc TR4 LATAM/Caribe: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9963102/
- GLOBALG.A.P. — verificación de certificados (GGN): https://www.globalgap.org/ggn/
- Rainforest Alliance — Banana Certification Data Report 2023: https://knowledge.rainforest-alliance.org/docs/banana-certification-data-report-2023
- Rainforest Alliance — estudio de impacto Colombia: https://www.rainforest-alliance.org/resource-item/towards-a-sustainable-banana-supply-chain-in-colombia-impact-study/
- Fairtrade — dashboard banano: https://www.fairtrade.net/en/products/Fairtrade_products/Bananas/fairtrade-banana-dashboard0.html
- Fairtrade UK — Plantación Martha María (Urabá): https://www.fairtrade.org.uk/farmers-and-workers/bananas/plantacion-martha-maria-colombia/
- ANI — Puerto Antioquia, primer hito constructivo (capacidad, inversión, empleo): https://www.ani.gov.co/puerto-antioquia-logra-el-primer-hito-constructivo-tras-la-explanacion-del-terreno-y-el-dragado-en-0
- Yamin Ingeniería — especificaciones Puerto Antioquia 2026: https://yamingenieria.com.co/puerto-antioquia-operaciones-2026-megapuerto-uraba-especificaciones/
- Infobae — inicio operaciones internacionales Puerto Antioquia: https://www.infobae.com/colombia/2026/02/08/gobierno-confirmo-el-inicio-de-operaciones-internacionales-en-puerto-antioquia/
- El Tiempo — Puerto Antioquia inició operación comercial oficial: https://www.eltiempo.com/colombia/medellin/puerto-antioquia-inicio-su-operacion-comercial-de-manera-oficial-asi-operara-la-terminal-multiproposito-de-colombia-en-el-caribe-3530118
- PortalPortuario — primer buque, 18.700 toneladas: https://portalportuario.cl/puerto-antioquia-atiende-primer-buque-con-18-700-toneladas-de-carga/
- Archivos internos ya en el repo (referencia de datos actuales): `file:public/data/eva_produccion_serie.json`, `file:public/data/sipsa_precios.json`, `file:public/data/expo_banano_fob.json`, `file:app/pages/cadena.vue`

---

## 13. Backlog priorizado (impacto × esfuerzo)

| # | Mejora | Impacto | Esfuerzo | Disponible ya |
|---|---|---|---|---|
| 1 | Puerto Antioquia — actualizar de "proyecto" a "operando" (anotación en `/cadena` + roadmap) | Alto | Bajo | Sí |
| 2 | Margen FOB/kg implícito (tabla ya calculable) + corrección de etiqueta SIPSA (bocadillo/criollo ≠ Cavendish) | Alto | Bajo | Sí |
| 3 | Foc R4T — badge de estatus fitosanitario Urabá = libre, con fuente resolución ICA | Alto | Bajo | Sí |
| 4 | Precio internacional World Bank Pink Sheet como 4º bloque de `/cadena` | Alto | Bajo | Sí |
| 5 | Augura — cifras 2025 (récord exportación, hectáreas, cajas, riesgo 2026) como texto de contexto | Medio-Alto | Bajo | Sí |
| 6 | EVA 2025 — verificar y cargar si Socrata ya lo tiene | Medio | Bajo | Sí (a verificar) |
| 7 | SIPSA — extender serie 2013-2024 (hoy solo 2024) | Medio | Medio | Sí |
| 8 | Certificaciones — sección cualitativa con cifras agregadas + 3 fincas Urabá nombradas | Medio | Bajo | Sí |
| 9 | FAO Banana Market Review — comparación Colombia vs. Ecuador/Guatemala/Costa Rica | Medio | Medio | Sí |
| 10 | Certificaciones — capa geolocalizada real de fincas | Alto (si existiera) | Alto | No — requiere gestión institucional |
| 11 | Precio de contrato productor-exportador (margen real) | Alto | Alto | No — requiere gestión con Augura |

---

## Verificación adversarial (2026-07-07)

Verificación adversarial ejecutada sobre los 12 hallazgos priorizados del resumen ejecutivo/backlog. Método: WebFetch directo a cada URL citada + descarga real (`curl`) y parseo (`openpyxl`/lectura de PDF) de los dos archivos binarios (XLSX Banco Mundial, PDF FAO) para confirmar que el contenido existe y dice lo que se afirma, no solo que el link resuelve. Lectura directa de `public/data/expo_banano_fob.json` y `public/data/sipsa_precios.json` para verificar cálculo y estructura, y `grep` sobre `ROADMAP.md` para confirmar el estado desactualizado de Puerto Antioquia.

**Veredicto por hallazgo:**

1. **Puerto Antioquia ya opera** — **CONFIRMADO, pero con corrección de fuente**. `ROADMAP.md:57` efectivamente sigue en "⚙️ manual" (confirmado por grep). Infobae (8-feb-2026) y El Tiempo confirman independientemente el inicio de operación comercial, la Resolución 20263040003075 del 29-ene-2026 y el primer buque el 7-feb-2026 cargando banano hacia Europa — coinciden en fecha y número de resolución, dos fuentes independientes. **Pero la URL citada como "Fuente ANI (oficial)"** (`ani.gov.co/puerto-antioquia-logra-el-primer-hito-constructivo...`) **no corresponde al hito de 2026**: al hacer fetch, esa página resultó ser un comunicado de **diciembre de 2022** sobre el inicio de la explanación del terreno (fase de construcción), sin ninguna mención a operación, resolución o banano. Es evidencia real pero mal citada — la ANI probablemente reutiliza/redirecciona la misma URL para contenido histórico. **Corrección aplicada:** usar Infobae/El Tiempo como fuente primaria del hito operativo; conservar la URL de ANI solo como fuente de la cifra de capacidad proyectada (600.000 TEU + 3M ton granel, que sí aparece en ese artículo de 2022 como cifra planeada, consistente con lo operativo hoy) pero etiquetada correctamente como "proyección 2022", no como confirmación 2026. Impacto/esfuerzo (alto/bajo) se mantienen.

2. **Foc R4T ausente del atlas** — **CONFIRMADO**. La página del ICA confirma textualmente la Resolución 095026 de 2021 y la declaración de Urabá como zona libre de Fusarium Raza 4 Tropical (fecha del comunicado: 16-abr-2021). Impacto/esfuerzo (alto/bajo) correctos.

3. **Margen FOB/kg ya calculable** — **CONFIRMADO**. Se leyó `public/data/expo_banano_fob.json` directamente y se recalculó de forma independiente: 2019 → 611.706.000 / (1.330.545×1.000) = US$0,4598/kg (dossier reporta 0,460 ✓); 2025 parcial → 590.590.046 / (1.079.499×1.000) = US$0,5471/kg (dossier reporta 0,547 ✓). Cálculo y estructura del archivo confirmados. Impacto/esfuerzo (alto/bajo) correctos.

4. **Error metodológico SIPSA vs. FOB** — **CONFIRMADO**. `public/data/sipsa_precios.json` efectivamente solo contiene "Banano bocadillo" y "Banano criollo" (consumo doméstico), sin ninguna variedad Cavendish de exportación — el `_meta.filtro` no la menciona. El riesgo de comparación inválida señalado es real y de alto valor preventivo. Impacto/esfuerzo (alto/bajo) correctos.

5. **World Bank Pink Sheet** — **CONFIRMADO, y verificado más allá de lo que el propio dossier pudo hacer**. Se descargó el XLSX real (`curl`, HTTP 200, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, 778 KB, sin autenticación) y se abrió con `openpyxl`: la hoja "Monthly Prices" contiene efectivamente las columnas **"Banana, Europe"** y **"Banana, US"**. El dossier marcaba esto como pendiente de ETL ("no pude extraer los valores"); esta verificación confirma que la extracción es directa y viable. Impacto/esfuerzo (alto/bajo) correctos, incluso más sólido de lo reportado.

6. **Augura 2025 récord + riesgo 2026** — **CONFIRMADO**. El artículo de Portafolio confirma textualmente: US$1.309 millones, +21% de crecimiento en productividad, 133 millones de cajas, 82 millones de cajas de Urabá, 32.465 ha en Urabá, 2.516 cajas/hectárea, proyección de caída del 5% en 2026 y más de 1.200 ha inundadas en los primeros dos meses de 2026. Impacto/esfuerzo (alto/bajo) correctos.

7. **SIPSA — extender a serie 2013-2024** — **CONFIRMADO**. La página de microdatos.dane.gov.co confirma textualmente el título "SIPSA-P - 2013-2024" y lista archivos anuales individuales además de un consolidado 2013-2017. Impacto/esfuerzo (medio/medio) correctos.

8. **EVA 2025 preliminar en UPRA** — **CONFIRMADO**. La página `upra.gov.co/es-co/eva/eva-2025` existe y confirma resultados preliminares del semestre A publicados, con el ciclo semestre A/B descrito tal como lo reporta el dossier. No se verificó si el dataset Socrata `uejq-wxrr` ya fue actualizado (el dossier ya lo marca correctamente como `[VERIFICAR] en build-time`, no como confirmado). Impacto/esfuerzo (medio/bajo) correctos.

9. **Abandono de tierra por rentabilidad (Uniban)** — **CONFIRMADO**. El artículo de Agrolatam confirma textualmente "en los últimos dos años, unas 2.000 hectáreas se perdieron en la región, no por enfermedad, sino... por falta de rentabilidad" y la migración a palma de aceite. Impacto/esfuerzo (medio/bajo) correctos.

10. **Certificaciones — 3 fincas de Urabá nombradas** — **CONFIRMADO CON CORRECCIÓN IMPORTANTE**. La URL citada (`fairtrade.org.uk/.../plantacion-martha-maria-colombia/`) ya no resuelve a esa página específica — redirige (301) a una página genérica de banano que no menciona ninguna de las 3 fincas. Búsqueda independiente confirma que **Plantación Martha María** (finca de 34 ha/23 trabajadores, evaluada en estudio de impacto Fairtrade 2013) y **Agrosiete** (certificada desde 2007, ~220.000 cajas/año, ficha vigente de Fairtrade UK sobre "Alexis Palacios, Agrosiete, Colombia") siguen siendo referencias válidas, aunque con URLs distintas a las citadas. **Pero "Bananeras de Urabá" es una cita desactualizada y potencialmente engañosa**: según El Espectador (26-jun-2020), Flocert (certificadora Fairtrade) **retiró la certificación de Bananeras de Urabá S.A.S. en 2020** por fallos judiciales de restitución de tierras en Turbo y señalamientos de despojo/financiación a grupos paramilitares — es decir, hoy **no** está certificada. Publicar esa finca como ejemplo vigente de certificación sin esa salvedad sería un error reputacional serio para un atlas dirigido a inversionistas. **Corrección aplicada:** eliminar "Bananeras de Urabá" del set de ejemplos vigentes (o citarla solo como caso histórico con la nota de pérdida de certificación 2020), conservar Plantación Martha María y Agrosiete con URLs actualizadas. Impacto se mantiene medio, esfuerzo bajo.

11. **FAO Banana Market Review** — **CONFIRMADO, y verificado con descarga real**. Se descargó el PDF (`curl`, HTTP 200, `application/pdf`, 1,86 MB, 21 páginas) y se leyó la portada: "BANANA — Market Review — Preliminary results 2022", FAO. Es un documento real y accesible sin autenticación, tal como afirma el dossier (aunque el dossier solo lo cita como "ejemplo" sin confirmar descarga — esta verificación cierra esa duda). Impacto/esfuerzo (medio/medio) correctos.

12. **Precio de contrato productor-exportador (margen real)** — **REFUTADO en su forma de cita textual**. El dossier atribuye a la fuente de Agrolatam la frase "los bananeros colombianos son tomadores de precio... el banano se comercializa por contrato, en la mayoría anuales" y el detalle "se pacta por contrato anual en octubre". Al buscar textualmente esas frases/términos ("tomadores de precio", "contrato anual", "precio mínimo", "octubre") en el artículo citado, **ninguno de los tres primeros aparece** — el artículo solo menciona que "el precio del banano debe reflejar los costos reales de producción", sin hablar de mecanismo de contrato ni de octubre. Es probable que esa cita provenga de otra fuente no documentada o de una alucinación en la síntesis. **El hallazgo se retira del backlog final**: la conclusión general (no hay precio de referencia/contrato públicamente descargable) puede seguir siendo cierta, pero no está sustentada por la fuente citada y no debe presentarse como cita textual de Augura/Agrolatam hasta encontrar la fuente primaria real.

**Resumen:** de 12 hallazgos, **11 sobreviven** (2 con corrección de fuente/contenido: #1 Puerto Antioquia y #10 Certificaciones), **1 se refuta** (#12, cita no verificable — precio de contrato productor-exportador).
