# Línea metodológica — score_seguridad v3.1 (reconstrucción documentada)

> Definida por el orquestador (2026-07-08) para la Fase D de la Ola 2. El worker implementa
> EXACTAMENTE esto; cualquier desviación se reporta como concern, no se improvisa.

## Problema
`score_seguridad` v3 (20% del índice) no tiene script generador en el repo — caja negra
(INFORME §2, frente social). Es indefendible ante OCAD/cooperación.

## Fórmula v3.1
1. **Insumo**: `seguridad_municipios.json` (homicidios MinDefensa/SIEDCO, "hechos reportados")
   + `poblacion_municipios.json` (proyecciones DANE) — ambos ya en `public/data` con `_meta`.
2. **tasa_prom**: promedio simple de `tasa_100k` de los **3 últimos años completos**
   (2022–2024; los parciales se excluyen). Promediar 3 años amortigua el ruido de municipios
   pequeños (San Juan de Urabá: pocos hechos → tasas volátiles).
3. **Normalización con anclas fijas** (no minmax del grupo — con 9 municipios el máximo
   local definiría el 0 y el score cambiaría de significado cada año):
   `score_seguridad_v31 = clamp01(1 − tasa_prom / 100)`
   Interpretación citable: tasa 0 → 1.00 · media nacional (~25/100k, DANE/MinDefensa 2023)
   → 0.75 · 100+/100k (crisis) → 0.00. Lineal entre anclas.
4. **Granularidad honesta**: toda manzana hereda el score de su municipio. Se documenta
   explícitamente que la granularidad de esta dimensión es MUNICIPAL (antes era una caja
   negra pseudo-manzana). El campo nuevo es `score_seguridad_v31`; el viejo NO se borra.
5. **Índice**: `atlas_score_v31` = misma fórmula de v3 (pesos de `atlas_stats_v3.json._meta`)
   sustituyendo solo la dimensión seguridad.

## Gate de impacto (obligatorio antes de cualquier merge)
El worker produce `docs/investigacion/2026-07-07/impacto-v31.md` con:
- Tabla por municipio: score_seguridad v3 vs v3.1, atlas_score v3 vs v3.1, Δranking.
- Correlación Spearman v3↔v3.1 del índice a nivel manzana.
- Municipios que cambian de nivel (alto/medio/bajo).
El orquestador revisa el impacto y decide si el switch de la UI a v3.1 va en esta ola o
se difiere. **El worker NO cambia los consumidores de UI a v3.1** — solo produce datos
nuevos + el informe. Los archivos v3 existentes no se modifican; los campos v31 se AGREGAN.

## Documentación
`_meta` de los archivos generados debe traer la fórmula textual, anclas, años usados,
fuente y la nota "hechos reportados a autoridad — subregistro posible".
