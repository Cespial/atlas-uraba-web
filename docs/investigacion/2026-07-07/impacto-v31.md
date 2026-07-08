# Impacto de la reconstrucción documentada de `score_seguridad` (v3 → v3.1)

> Generado por `scripts/recalc_v31.py` (Ola 2, Fase D). Datos candidatos en
> `public/data/atlas_stats_v31_preview.json`. **Ningún consumidor de la app fue tocado**
> — este informe es insumo para que el orquestador decida si el switch de UI a v3.1
> entra en esta ola o se difiere.

## Por qué existe v3.1

`score_seguridad` v3 (20% del índice `atlas_score_v3`) no tiene script generador en el
repo: es un valor heredado de v2 sin fórmula documentada, sin fuente citable y con
cuatro de ocho municipios saturados en `1.0000` (Carepa, Necoclí, San Juan de Urabá,
San Pedro de Urabá) — un patrón típico de dato tope/placeholder, no de una medición real.
Es indefendible ante OCAD o cooperación internacional.

v3.1 lo reemplaza por: `score_seguridad_v31 = clamp01(1 − tasa_prom_2022_2024 / 100)`,
donde `tasa_prom_2022_2024` es el promedio simple de la tasa de homicidios por 100.000
habitantes (SIEDCO/MinDefensa, `seguridad_municipios.json`) de los tres últimos años
completos. Anclas fijas (no minmax del grupo): tasa 0 → 1.00 · tasa 25 (≈ media nacional
DANE/MinDefensa 2023) → 0.75 · tasa 100+ (crisis) → 0.00, lineal entre anclas. Toda
manzana hereda el score de su municipio — la granularidad real de esta dimensión
**es municipal**, y v3.1 lo declara explícitamente en vez de aparentar resolución de
manzana.

Sanity check incorporado al script: la `tasa_100k` de `seguridad_municipios.json` se
reprodujo desde `homicidios / población(DANE, mismo año) × 100.000` para los 22
municipio-año usados, con tolerancia ±0.6 pts — sin fallos.

Cobertura de años: 6 de 8 municipios tienen los 3 años (2022-2024) completos. Arboletes
y San Juan de Urabá no tienen 2023 reportado en SIEDCO para esos códigos DANE; su
promedio usa solo 2022 y 2024 (documentado en `_meta.anios_usados_por_municipio` del
preview).

## Tabla por municipio (orden = ranking v3.1)

| Municipio | seg v3 | seg v3.1 | Δ seg | atlas v3 | atlas v3.1 | Δ atlas | rank v3 | rank v3.1 | Δ rank | nivel v3 | nivel v3.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| San Juan de Urabá | 1.0000 | 0.9500 | −0.0500 | 0.6672 | 0.6581 | −0.0091 | 1 | 1 | 0 | alto | alto |
| Apartadó | 0.7942 | 0.6507 | −0.1435 | 0.6630 | 0.6369 | −0.0261 | 2 | 2 | 0 | alto | **medio** |
| San Pedro de Urabá | 1.0000 | 0.9067 | −0.0933 | 0.6361 | 0.6192 | −0.0169 | 4 | 3 | +1 | alto | alto |
| Carepa | 1.0000 | 0.7413 | −0.2587 | 0.6444 | 0.5973 | −0.0471 | 3 | 4 | −1 | alto | **medio** |
| Turbo | 0.6385 | 0.5697 | −0.0688 | 0.5728 | 0.5603 | −0.0125 | 6 | 5 | +1 | medio | medio |
| Arboletes | 0.6914 | 0.9200 | **+0.2286** | 0.5069 | 0.5485 | +0.0416 | 7 | 6 | +1 | medio | **alto** |
| Chigorodó | 1.0000 | 0.5847 | **−0.4153** | 0.5796 | 0.5041 | −0.0755 | 5 | 7 | **−2** | alto | **medio** |
| Necoclí | 1.0000 | 0.8203 | −0.1797 | 0.4741 | 0.4414 | −0.0327 | 8 | 8 | 0 | alto | alto |

`tasa_prom_2022_2024` (100k hab.) por referencia: Apartadó 34.9 · Arboletes 8.0 ·
Carepa 25.9 · Chigorodó 41.5 · Necoclí 18.0 · San Juan de Urabá 5.0 ·
San Pedro de Urabá 9.3 · Turbo 43.0.

## Correlación y estabilidad a nivel manzana

- **Spearman(atlas_score_v3, atlas_score_v31)** = **ρ = 0.7733** (p ≈ 0, n = 7.028) —
  correlación fuerte y positiva: el orden relativo de las manzanas se conserva en su
  mayoría, pero no es un simple reescalado.
- **Cambios de quintil** (Q1-Crítico…Q5-Óptimo, breaks recalculados por percentil sobre
  la nueva distribución, igual método que `recalc_v3.py`): **4.198 de 7.028 manzanas
  (59.7%)** cambian de quintil. La transición dominante es un desplazamiento de un
  escalón (`Q3→Q2`, `Q4→Q3`, `Q5→Q4`: 751+749+554 = 2.054 casos), consistente con una
  caída moderada y generalizada del índice, no con un reordenamiento caótico. Una
  fracción del churn es mecánica: al recalcular los breaks por percentil sobre una
  distribución distinta, manzanas muy cerca de una frontera cruzan de banda con
  variaciones pequeñas — el ρ=0.77 es la lectura más fiel del movimiento real.
- **Municipios que cambian de nivel de seguridad** (alto ≥0.75 / medio ≥0.50 / bajo
  <0.50, mismas anclas que la fórmula): **Apartadó, Carepa y Chigorodó bajan de "alto" a
  "medio"; Arboletes sube de "medio" a "alto"**.

## Lectura honesta

El cambio es defendible: reemplaza cuatro `1.0000` sin fuente por una tasa real,
citable y con sanity check contra población DANE, y el ρ=0.77 muestra que no es un
volantazo — la mayoría de manzanas se mueve de forma moderada y en la misma dirección
relativa que antes. El caso que más se mueve es **Chigorodó** (seg 1.00→0.58, Δ atlas
−0.076, cae 2 puestos en el ranking): tenía el valor tope más alto posible en v3 pese a
una tasa promedio 2022-2024 de 41.5/100k (superior a Apartadó y Turbo), impulsada por un
2023 particularmente alto en la subregión; es exactamente el tipo de distorsión que
motivó reconstruir la dimensión. **Arboletes** es el caso inverso y el más frágil
metodológicamente: sube a "alto" apoyado en solo 2 años de dato (falta 2023 en SIEDCO
para ese código DANE) y una tasa baja (8.0/100k) que, con apenas 2-4 homicidios/año,
es volátil por tamaño de municipio pequeño — el promedio de 3 años estaba pensado para
amortiguar justo este ruido, pero aquí opera con 2. Recomiendo que el orquestador trate
el resultado de Arboletes con cautela (marcar el dato incompleto en la UI si se adopta)
y que el resto de la tabla se considere una mejora neta de defendibilidad. El switch de
UI queda a discreción del orquestador, no se ejecuta en esta entrega.
