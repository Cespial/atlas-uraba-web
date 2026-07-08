# Reconciliación TerriData — Ola 2, ítem auditoría

**Fecha:** 2026-07-08 · **Rama:** `ola2/terridata` · **Script:** `scripts/audit_terridata.py`

## 1. Problema (INFORME §4)

El repo tiene dos archivos GeoJSON activos con datos de NBI (Necesidades Básicas
Insatisfechas) para los 9 municipios de Urabá, y **contradicen entre sí** para el
mismo municipio:

| Archivo | Campo | Chigorodó | Capa que lo consume |
|---|---|---|---|
| `public/data/terridata_full.geojson` | `nbi_total` | **21.19** | `terridata-full` (`useAtlasMap.js:840-858`, label "NBI TerriData DNP") |
| `public/data/terridata_indicadores.geojson` | `nbi_pct` | **31.8** | `nbi` (`useAtlasMap.js:374-386`, label "Pobreza (NBI)" / "NBI (pobreza)") |

Ambas capas están vivas en el mapa (`LayerPanel.vue:176-177`, `LayerToggle.vue:64`,
`MobileSheet.vue:556`) — un usuario que compare las dos capas de "NBI" ve dos
mapas de coropletas distintos para el mismo indicador, sin ninguna nota que
explique la diferencia. Esto es un riesgo de integridad de dato, no cosmético.

## 2. Auditoría campo a campo (`scripts/audit_terridata.py`)

El script compara los 9 municipios en ambos archivos y, adicionalmente, cruza
`nbi_total` de `terridata_full.geojson` contra el archivo oficial DANE
CNPV 2018 (ver §3). Resultado completo (antes de corregir):

```
municipio              nbi_total(full)  nbi_pct(ind)    delta  DANE CNPV18  full==DANE
------------------------------------------------------------------------------------------
APARTADÓ                         14.67          28.4   -13.73        14.67          sí
ARBOLETES                        62.49          49.8    12.69        62.49          sí
CAREPA                           20.98          35.2   -14.22        20.98          sí
CHIGORODÓ                        21.19          31.8   -10.61        21.19          sí
MUTATÁ                           43.37          None     None        43.37          sí
NECOCLÍ                          57.63          61.4    -3.77        57.63          sí
SAN JUAN DE URABÁ                59.82          58.7     1.12        59.82          sí
SAN PEDRO DE URABÁ               66.14          55.3    10.84        66.14          sí
TURBO                            39.15          52.1   -12.95        39.15          sí
```

**9 de 9 municipios discrepan** entre los dos archivos (delta entre -14.2 y
+12.7 puntos porcentuales). Mutatá además estaba con **todos** sus campos en
`null` en `terridata_indicadores.geojson` (fail-quiet correcto, pero incompleto).

El script también comparó `analfabetismo` (el otro campo que ambos archivos
comparten) y encontró discrepancias en los 9 municipios (delta entre -6.0 y
+2.4 puntos) — ver §5, hallazgo secundario.

## 3. Verificación contra la fuente oficial

**Fuente primaria consultada:** DANE, *Censo Nacional de Población y Vivienda
(CNPV) 2018 — Necesidades Básicas Insatisfechas (NBI) por categorías*, hoja
"Municipios", columna "Prop de Personas en NBI (%)" (NBI **total** municipal).
Descarga: `https://www.dane.gov.co/files/censo2018/informacion-tecnica/CNPV-2018-NBI.xlsx`
(consultado 2026-07-08, vía WebFetch — el archivo .xlsx se descargó y se leyó
con `openpyxl`, hoja `Municipios`, filas con Código Departamento `05`).

Valores oficiales DANE CNPV 2018 (NBI total) para los 9 municipios de Urabá,
Código Departamento `05` (Antioquia):

| Municipio | Cód. DANE | NBI total DANE CNPV 2018 | `nbi_total` (terridata_full) | `nbi_pct` (terridata_indicadores, ANTES de corregir) |
|---|---|---|---|---|
| Apartadó | 05045 | 14.674 → **14.67** | 14.67 ✅ | 28.4 ❌ |
| Arboletes | 05051 | 62.487 → **62.49** | 62.49 ✅ | 49.8 ❌ |
| Carepa | 05147 | 20.982 → **20.98** | 20.98 ✅ | 35.2 ❌ |
| Chigorodó | 05172 | 21.194 → **21.19** | 21.19 ✅ | 31.8 ❌ |
| Mutatá | 05480 | 43.366 → **43.37** | 43.37 ✅ | null ❌ |
| Necoclí | 05490 | 57.629 → **57.63** | 57.63 ✅ | 61.4 ❌ |
| San Juan de Urabá | 05659 | 59.824 → **59.82** | 59.82 ✅ | 58.7 ❌ |
| San Pedro de Urabá | 05665 | 66.142 → **66.14** | 66.14 ✅ | 55.3 ❌ |
| Turbo | 05837 | 39.150 → **39.15** | 39.15 ✅ | 52.1 ❌ |

**`terridata_full.geojson.nbi_total` coincide con el valor oficial DANE CNPV
2018 en los 9/9 municipios**, con tolerancia de 0.05 puntos (redondeo a 2
decimales). `terridata_indicadores.geojson.nbi_pct` **no coincide con el
valor oficial en ningún municipio**, ni tampoco con `nbi_cabecera` ni
`nbi_rural` de `terridata_full.geojson` (se comparó explícitamente — ver
`scripts/audit_terridata.py`, tabla completa de `nbi_total`/`nbi_cabecera`/
`nbi_rural` por municipio). Es decir: **no es una diferencia de definición
(total vs. cabecera vs. rural)** — la hipótesis de la tarea ("21 vs 31 huele a
total vs. cabecera") **se descarta**: ningún desglose real de NBI para
ninguno de los 9 municipios produce los valores de `nbi_pct`.

## 4. Procedencia de cada archivo (rastreo git)

- **`terridata_full.geojson`** — introducido en el commit `f9d4c0f` ("FASES
  1-3 — capas analíticas..."), descrito como "TerriData DNP full (30
  indicadores)". Cada campo trae su propio `_anio` (2018, 2020, 2022, 2024,
  2025 según el indicador) y el archivo declara explícitamente
  `"terridata_fuente": "DNP TerriData - descarga por entidad (archivo
  plano)"`. Esto es consistente con una descarga real del portal DNP
  TerriData (ficha de entidad territorial), y su campo `nbi_total` está
  verificado 1:1 contra el CNPV 2018 oficial (§3).
- **`terridata_indicadores.geojson`** — introducido en el commit `7d191e0`
  ("feat: 5 nuevos datasets integrados — MinTIC 4G, SIVIGILA, TerriData
  NBI..."). **No declara ningún campo de fuente**, no trae año por
  indicador, y sus 5 campos (`nbi_pct`, `analfabetismo`, `cobertura_salud`,
  `icbf_desnutricion`, `saber11_ptje`) no tienen correspondencia con ningún
  valor oficial verificable. El propio mensaje de commit ya insinúa el
  origen: cifras redactadas a mano en el resumen del commit ("Necoclí 61.4% ·
  San Juan 58.7% · Turbo 52.1% vs Apartadó 28.4%" y "Apartadó 248pts ·
  Chigorodó 237 · Carepa 232 vs San Juan 206 · Necoclí 208") — son **los
  mismos números** que terminaron en el GeoJSON, sin trazabilidad a una
  fuente descargada.

**Veredicto: `terridata_indicadores.geojson.nbi_pct` es dato fabricado/estimado
sin fuente, no una lectura alterna válida de TerriData.** `terridata_full.geojson.nbi_total`
es el dato correcto, verificado contra DANE CNPV 2018.

## 5. Hallazgo secundario (fuera del alcance de esta corrección)

El campo `analfabetismo`, presente en ambos archivos, también discrepa en los
9 municipios (ver tabla del script). No se corrigió en esta pasada porque:
(a) el mandato de esta tarea es específicamente la contradicción de NBI
señalada en INFORME §4, y (b) **ningún componente `.vue` ni `useAtlasMap.js`
lee actualmente `analfabetismo`, `cobertura_salud`, `icbf_desnutricion` ni
`saber11_ptje` de ninguno de los dos archivos** (grep confirmado — el único
campo de `terridata_indicadores.geojson` que se usa en el mapa es `nbi_pct`,
línea `useAtlasMap.js:382`). Es decir, esos 4 campos son datos muertos hoy:
no afectan lo que ve el usuario, pero siguen siendo fabricados y deberían
auditarse/limpiarse en una pasada de calidad de datos dedicada — no se tocan
aquí para no exceder el alcance de esta tarea.

## 6. Corrección aplicada

`scripts/audit_terridata.py --fix` corrigió `public/data/terridata_indicadores.geojson`:

- `nbi_pct` de los 9 municipios reemplazado por el valor oficial DANE CNPV
  2018 (idéntico a `nbi_total` de `terridata_full.geojson`, ya verificado en
  §3) — incluyendo Mutatá, que antes era `null`.
- Se agregó `cod_dane_mpio` (código DANE de 5 dígitos) a cada feature, para
  habilitar cruces confiables por código en vez de por nombre de texto.
- Se agregó `nbi_pct_fuente` citando la fuente DANE CNPV 2018 y este informe.
- **No se tocó** `analfabetismo`, `cobertura_salud`, `icbf_desnutricion` ni
  `saber11_ptje` (ver §5).
- **No se tocó** `terridata_full.geojson` — ya estaba correcto.
- **No se tocó** ningún `.vue` ni `useAtlasMap.js` (fuera de territorio de
  esta tarea).

Geometría de los 9 polígonos intacta (no se modificó, solo `properties`).

## 7. Recomendación para la siguiente fase (etiquetas UI)

Esta corrección deja los **datos** de `nbi_pct` correctos, pero **las dos
capas del mapa siguen mostrando el mismo indicador (NBI total) dos veces**,
ahora con el mismo valor pero bajo etiquetas distintas y confusas:

- Capa `nbi` — label actual: "Pobreza (NBI)" / "NBI (pobreza)"
- Capa `terridata-full` — label actual: "NBI TerriData DNP" / "NBI total CNPV 2018"

Recomendación para quien toque `LayerPanel.vue` / `LayerToggle.vue` /
`MobileSheet.vue` (fuera del territorio de esta tarea):

1. Ambas etiquetas deberían decir explícitamente **"NBI total (CNPV 2018)"**
   — ya no hay ambigüedad "total vs. cabecera": los dos archivos ahora
   reportan el mismo NBI total oficial.
2. Evaluar si tiene sentido mantener dos capas redundantes para el mismo
   indicador, o si conviene deprecar la capa `nbi` (que solo trae 1 campo)
   en favor de `terridata-full` (que trae 30 indicadores, incluyendo
   `nbi_cabecera` y `nbi_rural` para quien quiera el desglose real).
3. Si se decide mostrar el desglose cabecera/resto en algún momento, usar
   `nbi_cabecera` / `nbi_rural` de `terridata_full.geojson` (ya verificados
   como parte de la descarga TerriData/DNP), etiquetados explícitamente como
   tales — nunca reutilizar el nombre genérico "NBI" sin calificar.

## 8. Verificación de build

No se tocó ningún archivo `.vue` ni `useAtlasMap.js`. `npm run build` y
`npm run generate` corridos igual al cierre de esta tarea para confirmar que
la corrección de datos no rompe nada (ver resultado en el resumen de la
tarea).
