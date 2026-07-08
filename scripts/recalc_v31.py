#!/usr/bin/env python3
"""Reconstrucción documentada de score_seguridad (v3.1) — Ola 2, adopción.

Línea metodológica: docs/investigacion/2026-07-07/LINEA-SEGURIDAD-V31.md
Gate de impacto (aprobado por el orquestador): docs/investigacion/2026-07-07/impacto-v31.md

Escribe public/data/atlas_stats_v31.json — YA NO es un candidato/preview, es el
archivo que consume la CAPA CITABLE de la app (brief, API, comparador,
metodología). El mapa de manzanas (atlas.geojson / atlas_enriquecido.geojson)
NO se toca: sigue pintando v3 hasta que su re-horneado se ratifique aparte.

score_seguridad v3 no tenía script generador en el repo (caja negra, ver
INFORME §2 — 4 de 8 municipios saturados en 1.0000). v3.1 lo reemplaza con una
fórmula de anclas fijas sobre la tasa de homicidios por 100k habitantes
(SIEDCO/MinDefensa), promediada 2022-2024, heredada por municipio a cada
manzana.

Este script NO modifica atlas_enriquecido.geojson, atlas.geojson ni
atlas_stats_v3.json (fuentes de solo lectura) — únicamente lee de ahí y
escribe atlas_stats_v31.json.
"""
import json
import statistics
from collections import defaultdict

try:
    from scipy.stats import spearmanr
except ImportError as e:
    raise SystemExit("Falta scipy (requerido solo para el Spearman del resumen impreso): %s" % e)

BASE = "public/data/"

ANIOS_PROMEDIO = ["2022", "2023", "2024"]
# Municipios manzana-level canónicos (8; municipios.geojson trae 9 con Mutatá,
# que no tiene manzanas en atlas_enriquecido y por tanto no participa aquí).
MUNICIPIOS_CANONICOS = [
    "Apartadó", "Arboletes", "Carepa", "Chigorodó",
    "Necoclí", "San Juan de Urabá", "San Pedro de Urabá", "Turbo",
]

W_ACC, W_AMB, W_SOC, W_SEG = 0.40, 0.25, 0.25, 0.20
W_SUM = W_ACC + W_AMB + W_SOC + W_SEG  # 1.10 — igual que v3


def clamp01(x):
    return max(0.0, min(1.0, x))


def nivel(x):
    """Umbral defendible: ancla el propio score_seguridad_v31 (0.75 = tasa
    de la media nacional aprox., 0.50 = doble de la media nacional)."""
    if x >= 0.75:
        return "alto"
    if x >= 0.50:
        return "medio"
    return "bajo"


# ---------- 1. Cargar insumos (solo lectura) ----------
atlas = json.load(open(BASE + "atlas_enriquecido.geojson"))
feats = atlas["features"]
assert len(feats) == 7028, "atlas_enriquecido debía traer 7028 manzanas, trae %d" % len(feats)

seg = json.load(open(BASE + "seguridad_municipios.json"))
pob = json.load(open(BASE + "poblacion_municipios.json"))
stats_v3 = json.load(open(BASE + "atlas_stats_v3.json"))

munis_atlas = sorted(set(f["properties"]["municipio"] for f in feats))
assert munis_atlas == sorted(MUNICIPIOS_CANONICOS), (
    "Municipios manzana-level distintos de los 8 canónicos: %s" % munis_atlas
)

# ---------- 2. Sanity check del insumo poblacional ----------
# seguridad_municipios._meta documenta tasa_100k = homicidios / poblacion(mismo año) * 100000.
# Verificamos esa cuenta contra poblacion_municipios.json antes de confiar en tasa_100k.
sanity_fallos = []
for muni in MUNICIPIOS_CANONICOS:
    anios_muni = seg["municipios"].get(muni, {})
    for anio in ANIOS_PROMEDIO:
        row = anios_muni.get(anio)
        if row is None:
            continue
        poblacion_anio = pob["municipios"][muni].get(anio)
        tasa_recalc = row["homicidios"] / poblacion_anio * 100000
        if abs(tasa_recalc - row["tasa_100k"]) > 0.6:  # tolerancia por redondeo a 1 decimal
            sanity_fallos.append((muni, anio, tasa_recalc, row["tasa_100k"]))
assert not sanity_fallos, "tasa_100k no reproducible desde homicidios/población: %s" % sanity_fallos

# ---------- 3. tasa_prom 2022-2024 y score_seguridad_v31 por municipio ----------
seguridad_v31_muni = {}
anios_usados_muni = {}
for muni in MUNICIPIOS_CANONICOS:
    anios_muni = seg["municipios"].get(muni, {})
    tasas = [anios_muni[a]["tasa_100k"] for a in ANIOS_PROMEDIO if a in anios_muni]
    assert tasas, "%s no tiene ningún año 2022-2024 en seguridad_municipios.json" % muni
    tasa_prom = statistics.mean(tasas)
    score = clamp01(1.0 - tasa_prom / 100.0)
    seguridad_v31_muni[muni] = {
        "tasa_prom_2022_2024": round(tasa_prom, 2),
        "anios_usados": [a for a in ANIOS_PROMEDIO if a in anios_muni],
        "score_seguridad_v31": round(score, 4),
    }
    anios_usados_muni[muni] = [a for a in ANIOS_PROMEDIO if a in anios_muni]

for muni, d in seguridad_v31_muni.items():
    assert 0.0 <= d["score_seguridad_v31"] <= 1.0

# ---------- 4. atlas_score_v31 por manzana (herencia municipal, resto = v3) ----------
for f in feats:
    p = f["properties"]
    muni = p["municipio"]
    seg_v31 = seguridad_v31_muni[muni]["score_seguridad_v31"]
    acc = p["score_accesibilidad_v3"]
    amb = p["score_ambiental_v3"]
    soc = p["score_socioeconomico_v3"]
    score31 = (W_ACC * acc + W_AMB * amb + W_SOC * soc + W_SEG * seg_v31) / W_SUM
    p["_score_seguridad_v31"] = seg_v31
    p["_atlas_score_v31"] = round(clamp01(score31), 4)
    assert 0.0 <= p["_atlas_score_v31"] <= 1.0

# ---------- 5. Quintiles v3.1 (mismo método percentil que recalc_v3.py) ----------
scores31 = sorted(f["properties"]["_atlas_score_v31"] for f in feats)
n = len(scores31)
qbreaks31 = [scores31[int(n * q)] for q in (0.2, 0.4, 0.6, 0.8)]


def quintil_v31(x):
    if x < qbreaks31[0]:
        return "Q1-Crítico"
    if x < qbreaks31[1]:
        return "Q2-Bajo"
    if x < qbreaks31[2]:
        return "Q3-Medio"
    if x < qbreaks31[3]:
        return "Q4-Alto"
    return "Q5-Óptimo"


for f in feats:
    f["properties"]["_quintil_v31"] = quintil_v31(f["properties"]["_atlas_score_v31"])

# ---------- 6. Stats por municipio — MISMA ESTRUCTURA que atlas_stats_v3.json ----------
# Campos sin cambio (accesibilidad/ambiental/socioeconómico y satelitales)
# mantienen el nombre v3; solo el score compuesto y seguridad llevan sufijo
# _v31 porque SÍ cambiaron de insumo/fórmula. Esto queda documentado también
# en el _meta de abajo (ver "insumos_v31").
groups = defaultdict(list)
for f in feats:
    groups[f["properties"]["municipio"]].append(f["properties"])

# Mismo patrón que recalc_v3.py (raíz del repo): filtrar valores no numéricos
# antes de promediar — score_calor/lst_c/etc. pueden venir en None cuando el
# insumo satelital no cubrió esa manzana (ver _meta.procedencia de v3).
def avg_key(rows, key):
    vals = [r[key] for r in rows if isinstance(r.get(key), (int, float))]
    return round(statistics.mean(vals), 4) if vals else None

AVG_KEYS_SIN_CAMBIO = [
    "score_accesibilidad_v3", "score_ambiental_v3", "score_socioeconomico_v3",
    "score_ndvi", "score_calor", "impermeabilizacion", "proxy_luminosidad",
    "ndbi", "lst_c", "viirs_rad",
]

municipios_out = {}
for muni, rows in groups.items():
    avg = {"atlas_score_v31": avg_key(rows, "_atlas_score_v31")}
    for k in AVG_KEYS_SIN_CAMBIO:
        avg[k] = avg_key(rows, k)
    avg["score_seguridad_v31"] = seguridad_v31_muni[muni]["score_seguridad_v31"]
    avg["tasa_prom_2022_2024"] = seguridad_v31_muni[muni]["tasa_prom_2022_2024"]
    municipios_out[muni] = {
        "count": len(rows),
        "avg": avg,
        "anios_usados": anios_usados_muni[muni],
    }

ranking31 = sorted(
    ((m, municipios_out[m]["avg"]["atlas_score_v31"]) for m in municipios_out),
    key=lambda x: -x[1],
)

# ---------- 7. Resumen de impacto (solo consola — el informe versionado vive
# en docs/investigacion/2026-07-07/impacto-v31.md, ya aprobado por el
# orquestador; este bloque permite regenerarlo/auditarlo si hace falta) -------
ranking_v3_list = [r["municipio"] for r in stats_v3["ranking_municipios_v3"]]
ranking_v31_list = [m for m, _ in ranking31]

tabla_impacto = []
for muni in MUNICIPIOS_CANONICOS:
    seg_v3 = stats_v3["municipios"][muni]["avg"]["score_seguridad"]
    seg_v31 = seguridad_v31_muni[muni]["score_seguridad_v31"]
    atlas_v3 = stats_v3["municipios"][muni]["avg"]["atlas_score_v3"]
    atlas_v31 = municipios_out[muni]["avg"]["atlas_score_v31"]
    rank_v3 = ranking_v3_list.index(muni) + 1
    rank_v31 = ranking_v31_list.index(muni) + 1
    nivel_v3 = nivel(seg_v3)
    nivel_v31 = nivel(seg_v31)
    tabla_impacto.append({
        "municipio": muni,
        "score_seguridad_v3": round(seg_v3, 4),
        "score_seguridad_v31": seg_v31,
        "atlas_score_v3": round(atlas_v3, 4),
        "atlas_score_v31": atlas_v31,
        "ranking_v3": rank_v3,
        "ranking_v31": rank_v31,
        "nivel_seguridad_v3": nivel_v3,
        "nivel_seguridad_v31": nivel_v31,
        "cambia_nivel_seguridad": nivel_v3 != nivel_v31,
    })

v3_scores = [f["properties"]["atlas_score_v3"] for f in feats]
v31_scores = [f["properties"]["_atlas_score_v31"] for f in feats]
rho, pval = spearmanr(v3_scores, v31_scores)

cambios_quintil = sum(
    1 for f in feats
    if f["properties"]["quintil_v3"] != f["properties"]["_quintil_v31"]
)

# ---------- 8. Escribir atlas_stats_v31.json (estructura = atlas_stats_v3.json) ----
out = {
    "_meta": {
        "version": "v3.1",
        "generado": "2026-07-08",
        "formula": (
            "atlas_score_v31 = (0.40*score_accesibilidad_v3 + 0.25*score_ambiental_v3 "
            "+ 0.25*score_socioeconomico_v3 + 0.20*score_seguridad_v31) / 1.10 — mismos "
            "pesos y mismos insumos de accesibilidad/ambiental/socioeconómico que "
            "atlas_stats_v3.json; SOLO cambia el insumo de seguridad."
        ),
        "formula_seguridad_v31": (
            "score_seguridad_v31 = clamp01(1 - tasa_prom_2022_2024 / 100), tasa_prom = promedio "
            "simple de tasa_100k (SIEDCO/MinDefensa) de los 3 últimos años completos (2022-2024; "
            "años parciales excluidos)."
        ),
        "anclas_tasa_100k": {
            "tasa=0": "score=1.00 (óptimo)",
            "tasa=25 (media nacional aprox., DANE/MinDefensa 2023)": "score=0.75",
            "tasa=100+ (crisis)": "score=0.00",
            "interpolacion": "lineal entre anclas, clamp a [0,1] fuera de rango",
        },
        "anios_promediados": ANIOS_PROMEDIO,
        "anios_usados_por_municipio": anios_usados_muni,
        "granularidad_seguridad": (
            "MUNICIPAL: toda manzana hereda el score_seguridad_v31 de su municipio. Antes "
            "(score_seguridad v3) era una caja negra sin script generador en el repo, aparentaba "
            "granularidad de manzana pero no la tenía documentada. v3.1 declara explícitamente "
            "que la granularidad real de esta dimensión es municipal. El mapa de manzanas sigue "
            "pintando v3 — su migración visual está en curso y se ratifica en una ola aparte."
        ),
        "insumos_reales": dict(stats_v3["_meta"]["insumos_reales"]),
        "insumos_v31": {
            "seguridad": (
                "score_seguridad_v31: tasa de homicidios por 100k hab. (SIEDCO/MinDefensa), "
                "promedio simple 2022-2024, anclas fijas (0→1.00 · 25→0.75 · 100+→0.00) — "
                "reemplaza score_seguridad v2 (caja negra sin script generador, 4/8 municipios "
                "saturados en 1.0000). Granularidad real: MUNICIPAL."
            ),
        },
        "insumos_v2_sin_cambio": {
            "socioeconomico": stats_v3["_meta"]["insumos_v2_sin_cambio"]["socioeconomico"],
        },
        "caps_accesibilidad_min": dict(stats_v3["_meta"]["caps_accesibilidad_min"]),
        "quintil_breaks_v31": [round(b, 4) for b in qbreaks31],
        "procedencia": dict(stats_v3["_meta"]["procedencia"]),
        "fuente_seguridad": seg["_meta"]["fuente"],
        "fuente_poblacion": pob["_meta"]["fuente"],
        "nota_seguridad": (
            "Hechos reportados a autoridad (SIEDCO/MinDefensa) — no violencia total; subregistro "
            "posible por miedo a represalias en zonas con presencia de actores armados. "
            "Sanity check: tasa_100k de seguridad_municipios.json reproducida desde "
            "homicidios/población DANE del mismo año (tolerancia ±0.6 pts) para todos los "
            "municipio-año usados, sin fallos."
        ),
        "impacto": "docs/investigacion/2026-07-07/impacto-v31.md (gate aprobado por el orquestador)",
    },
    "ranking_municipios_v31": [{"municipio": m, "atlas_score_v31": s} for m, s in ranking31],
    "municipios": municipios_out,
}

json.dump(out, open(BASE + "atlas_stats_v31.json", "w"), ensure_ascii=False, indent=2)
print("Escrito %satlas_stats_v31.json" % BASE)

print("\nscore_seguridad v3 (caja negra) vs v3.1 (reconstruido, tasa 2022-2024):")
for t in sorted(tabla_impacto, key=lambda x: x["ranking_v31"]):
    print("  %-22s seg %.4f -> %.4f  atlas %.4f -> %.4f  rank %d -> %d  nivel %s -> %s%s" % (
        t["municipio"], t["score_seguridad_v3"], t["score_seguridad_v31"],
        t["atlas_score_v3"], t["atlas_score_v31"], t["ranking_v3"], t["ranking_v31"],
        t["nivel_seguridad_v3"], t["nivel_seguridad_v31"],
        "  <-- CAMBIA NIVEL" if t["cambia_nivel_seguridad"] else "",
    ))

print("\nSpearman atlas_score_v3 vs atlas_score_v31 (manzana, n=%d): rho=%.4f p=%.2e" % (
    len(feats), rho, pval))
print("Manzanas que cambian de quintil: %d (%.2f%%)" % (cambios_quintil, cambios_quintil / len(feats) * 100))
print("\nanios_usados_por_municipio:")
for muni, anios in anios_usados_muni.items():
    print("  %-22s %s%s" % (muni, anios, "  <-- <3 años" if len(anios) < 3 else ""))
