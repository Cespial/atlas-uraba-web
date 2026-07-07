# Atlas Urabá — Sprint "Atlas para decisores" (enfoque C híbrido)

> Diseño aprobado 2026-07-07. Alcance: sprint corto (1–2 semanas), stack actual
> (Nuxt 4 + Nitro SSR en Vercel, datos estáticos en `public/data`), sin infra nueva.
> Audiencias: alcaldes/planeación, Gobernación/DNP/OCAD, cooperación/inversionistas, gremios agro.

## Objetivo

Sumar dos piezas de **inteligencia analítica nueva** (equidad intra-municipal y cadena
de valor agro) y un **producto de decisión** (policy brief A4 por municipio) que las
empaqueta. Todo computable con los datos ya presentes en `public/data` — cero descargas
nuevas, cero backend nuevo.

## Pieza 1 — Índice de equidad intra-municipal

**Tesis:** un municipio puede tener buen promedio y esconder bolsones críticos. Se
calcula, por municipio, la desigualdad interna del `atlas_score_v3` entre sus manzanas.

**Estadísticos (por municipio):**
- Coeficiente de **Gini** del `atlas_score_v3` sobre las manzanas del municipio.
- **Brecha p90 − p10** del score.
- **% y nº de manzanas críticas**: score bajo el umbral crítico regional, definido como
  el p25 de todas las manzanas de Urabá (documentar el valor numérico del umbral en `_meta`).

**Cómputo:** script nuevo `scripts/compute_equidad.py` (mismo patrón que `recalc_v3.py`):
- Lee `public/data/atlas_enriquecido.geojson` (11 MB, 7.028 manzanas, campo `atlas_score_v3`).
- Escribe `public/data/equidad_municipios.json` (~2 KB):
  ```json
  {
    "_meta": { "fuente": "...", "formula": "...", "umbral_critico": 0.xx, "generado": "YYYY-MM-DD" },
    "municipios": {
      "Apartadó": { "gini": 0.18, "p90": 0.81, "p10": 0.42, "brecha_p90_p10": 0.39,
                     "manzanas_criticas": 312, "pct_criticas": 0.19, "n_manzanas": 1659 }
    }
  }
  ```
- Se agrega a la lista de `scripts/sync-api-assets.mjs` para que Nitro lo sirva también
  desde `server/assets/data` si algún endpoint lo necesita.

**UI:**
- `FichaMunicipal.vue`: nueva fila "Equidad interna" — Gini + manzanas críticas (nº y %).
- `ScoreRankingList.vue`: toggle de ordenamiento — por score v3 (actual) o por desigualdad
  (Gini descendente). Sin capa nueva de mapa: el mapa de manzanas ya muestra la
  desigualdad visualmente; el índice la vuelve citable.
- Insumo del brief (Pieza 3).

**Carga:** fetch de `/data/equidad_municipios.json` desde los componentes que lo usan
(vía composable ligero o el store), fail-quiet: si el JSON no carga, la fila/toggle se
ocultan (mismo patrón defensivo de stats).

## Pieza 2 — Panel cadena de valor agro (`/cadena`)

**Tesis:** producción → precio → exportación en un solo flujo (la "cadena_completa"
del ROADMAP hecha UI).

**Página nueva `app/pages/cadena.vue`** (patrón de `/comparar`: SSR + Chart.js ya en deps),
con tres bloques encadenados visualmente, cada uno con su fuente citada:

1. **Producción (EVA 2019–2024)** — `eva_produccion_serie.json` (`data` → municipio →
   cultivos → series anuales con `area_sembrada_ha`, `area_cosechada_ha`, `produccion_ton`,
   rendimiento). Selector de municipio + cultivo (default: banano/plátano; mostrar top
   cultivos por producción). Serie de líneas/área por año.
2. **Precio mayorista (SIPSA 2024)** — `sipsa_precios.json` (`datos` → producto → mercado
   → serie mensual `2024-MM`). Líneas mensuales por producto banano/plátano en los
   mercados disponibles.
3. **Exportación (FOB 2019–2025)** — `expo_banano_fob.json` (año → `ton`, `fob_usd`,
   `destinos[]` con país y FOB). Barras FOB por año + top destinos del año seleccionado
   (2024: US$560M, 1,06M ton; Italia/Bélgica/Alemania a la cabeza).

**Navegación:** enlace en `AppHeader` y acceso desde `FichaMunicipal` de municipios con
datos EVA. Municipios sin datos agro: el selector los omite o muestra estado vacío
honesto (sin ceros inventados).

## Pieza 3 — Policy brief A4 por municipio (`/brief/[municipio]`)

**Tesis:** la página que un alcalde imprime y lleva al OCAD. Una sola cara A4.

**Ruta SSR nueva `app/pages/brief/[municipio].vue`** con CSS `@media print` calibrado a
A4 y botón "Descargar PDF" que dispara `window.print()`. **Sin librería PDF ni
puppeteer** (frágil/pesado en Vercel serverless); la impresión del SSR da texto
vectorial. Si a futuro se quiere archivo automático, esta misma ruta la renderizaría
un worker.

**Contenido (en orden):**
1. Encabezado: municipio, fecha de generación, marca Atlas Urabá · Tensor.
2. Score v3 + 4 dimensiones (accesibilidad/ambiental/socioeconómico/seguridad) vs
   benchmark Colombia y Antioquia (`benchmarks.json` · `atlas_stats_v3.json` /
   `gap_analysis.json`).
3. Narrativa de gaps: texto ya escrito en `gap_analysis.json` (`narrativa`, `gaps_vs_uraba`).
4. **Equidad interna** (Pieza 1): Gini, brecha p90−p10, manzanas críticas.
5. Top-5 manzanas prioritarias con código DANE (`top_prioridad.json`).
6. Mini-bloque agro si el municipio tiene datos EVA (producción reciente + enlace a `/cadena`).
7. Datos satelitales citables ya existentes en v3 (`lst_c`, `viirs_rad`) donde aporten.
8. Pie: todas las fuentes con nombre institucional + fecha.

**Acceso:** botón "Brief PDF" en `FichaMunicipal.vue` y en `/comparar`.

**Validación de ruta:** nombre de municipio contra la lista de 8 (slug normalizado sin
tildes); 404 para cualquier otro valor.

## Nota de escalas

`gap_analysis.json` expresa scores en escala **0–100** (enteros); `atlas_stats_v3.json`,
`benchmarks.json` y `top_prioridad.json` usan **0–1**. El brief y la ficha normalizan
todo a una sola escala de presentación (0–100) en el punto de render, sin modificar
los archivos fuente.

## Integración y manejo de errores

- Los 2 JSON nuevos/consumidos entran por fetch en sus páginas/composables, **sin tocar
  el flujo crítico del mapa** (`useAtlasMap.js`, estabilizado en el último code-review).
- Datos faltantes → bloques omitidos, nunca ceros inventados (principio 4 del ROADMAP:
  granularidad honesta).
- Cada visualización cita su fuente (principio 3).

## Fuera de alcance

- Consolidación de paleta verde vs teal (pendiente previo, no se mezcla).
- API pública documentada, modo temporal, PostGIS, cómputos GEE nuevos.
- Generación server-side de PDF.

## Verificación

- `npm run build` en verde (valida .vue + Nitro).
- QA visual en la app corriendo (dev server + navegador) de las 3 piezas.
- Impresión real del brief a PDF revisando el A4 (una sola página, sin cortes).
- `compute_equidad.py`: sanity check de resultados (Gini ∈ [0,1], suma de manzanas por
  municipio = 7.028, umbral documentado).
