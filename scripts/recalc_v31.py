#!/usr/bin/env python3
"""Reconstrucción documentada de score_seguridad (v3.1) — Ola 2, Fase D.

Línea metodológica: docs/investigacion/2026-07-07/LINEA-SEGURIDAD-V31.md

NO toca atlas_enriquecido.geojson ni ningún consumidor de la app. Lee datos
existentes y escribe SOLO public/data/atlas_stats_v31_preview.json (misma
estructura de atlas_stats_v3.json + sección "impacto") y este mismo script
imprime el resumen que alimenta docs/investigacion/2026-07-07/impacto-v31.md.

score_seguridad v3 no tiene script generador en el repo (caja negra, ver
INFORME §2). v3.1 lo reemplaza con una fórmula de anclas fijas sobre la tasa
de homicidios por 100k habitantes (SIEDCO/MinDefensa), promediada 2022-2024,
heredada por municipio a cada manzana.
"""
import json
import statistics
from collections import defaultdict

try:
    from scipy.stats import spearmanr
except ImportError as e:
    raise SystemExit("Falta scipy (requerido solo para el Spearman de impacto): %s" % e)

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

# ---------- 6. Stats por municipio (misma forma que atlas_stats_v3.json) ----------
groups = defaultdict(list)
for f in feats:
    groups[f["properties"]["municipio"]].append(f["properties"])

municipios_out = {}
for muni, rows in groups.items():
    vals31 = [r["_atlas_score_v31"] for r in rows]
    municipios_out[muni] = {
        "count": len(rows),
        "avg": {
            "atlas_score_v31": round(statistics.mean(vals31), 4),
            "score_seguridad_v31": seguridad_v31_muni[muni]["score_seguridad_v31"],
            "tasa_prom_2022_2024": seguridad_v31_muni[muni]["tasa_prom_2022_2024"],
        },
        "anios_usados": anios_usados_muni[muni],
    }

ranking31 = sorted(
    ((m, municipios_out[m]["avg"]["atlas_score_v31"]) for m in municipios_out),
    key=lambda x: -x[1],
)

# ---------- 7. Sección impacto ----------
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
        "delta_seguridad": round(seg_v31 - seg_v3, 4),
        "atlas_score_v3": round(atlas_v3, 4),
        "atlas_score_v31": atlas_v31,
        "delta_atlas": round(atlas_v31 - atlas_v3, 4),
        "ranking_v3": rank_v3,
        "ranking_v31": rank_v31,
        "delta_ranking": rank_v3 - rank_v31,
        "nivel_seguridad_v3": nivel_v3,
        "nivel_seguridad_v31": nivel_v31,
        "cambia_nivel_seguridad": nivel_v3 != nivel_v31,
    })

# Spearman del índice a nivel manzana (v3 vs v3.1)
v3_scores = [f["properties"]["atlas_score_v3"] for f in feats]
v31_scores = [f["properties"]["_atlas_score_v31"] for f in feats]
rho, pval = spearmanr(v3_scores, v31_scores)

# Cambios de quintil a nivel manzana
cambios_quintil = 0
detalle_quintil = defaultdict(int)
for f in feats:
    q3 = f["properties"]["quintil_v3"]
    q31 = f["properties"]["_quintil_v31"]
    if q3 != q31:
        cambios_quintil += 1
        detalle_quintil["%s -> %s" % (q3, q31)] += 1

impacto = {
    "tabla_municipios": tabla_impacto,
    "spearman_indice_manzana": {
        "rho": round(float(rho), 4),
        "p_value": float(pval),
        "n": len(feats),
    },
    "manzanas_cambian_quintil": {
        "total": cambios_quintil,
        "pct": round(cambios_quintil / len(feats) * 100, 2),
        "transiciones": dict(sorted(detalle_quintil.items(), key=lambda kv: -kv[1])),
    },
    "municipios_cambian_nivel_seguridad": [
        t["municipio"] for t in tabla_impacto if t["cambia_nivel_seguridad"]
    ],
}

# ---------- 8. Escribir preview (NO se toca atlas_enriquecido ni atlas_stats_v3) ----------
out = {
    "_meta": {
        "version": "v3.1-preview",
        "generado": "2026-07-08",
        "estado": "CANDIDATO — no consumido por la app; requiere decisión del orquestador (ver impacto-v31.md)",
        "formula": (
            "atlas_score_v31 = (0.40*accesibilidad_v3 + 0.25*ambiental_v3 + 0.25*socioeconomico_v3 "
            "+ 0.20*score_seguridad_v31) / 1.10 — mismos pesos y mismos insumos de accesibilidad/"
            "ambiental/socioeconomico que atlas_stats_v3.json; SOLO cambia el insumo de seguridad."
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
        "granularidad": (
            "MUNICIPAL: toda manzana hereda el score_seguridad_v31 de su municipio. Antes "
            "(score_seguridad v3) era una caja negra sin script generador en el repo, aparentaba "
            "granularidad de manzana pero no la tenía documentada. v3.1 declara explícitamente "
            "que la granularidad real de esta dimensión es municipal."
        ),
        "fuente_seguridad": seg["_meta"]["fuente"],
        "fuente_poblacion": pob["_meta"]["fuente"],
        "nota": (
            "Hechos reportados a autoridad (SIEDCO/MinDefensa) — no violencia total; subregistro "
            "posible por miedo a represalias en zonas con presencia de actores armados. "
            "sanity check: tasa_100k de seguridad_municipios.json reproducida desde "
            "homicidios/población DANE del mismo año (tolerancia ±0.6 pts) para todos los "
            "municipio-año usados."
        ),
        "quintil_breaks_v31": [round(b, 4) for b in qbreaks31],
    },
    "ranking_municipios_v31": [{"municipio": m, "atlas_score_v31": s} for m, s in ranking31],
    "municipios": municipios_out,
    "impacto": impacto,
}

json.dump(out, open(BASE + "atlas_stats_v31_preview.json", "w"), ensure_ascii=False, indent=2)
print("Escrito %satlas_stats_v31_preview.json" % BASE)

print("\nscore_seguridad v3 (caja negra) vs v3.1 (reconstruido, tasa 2022-2024):")
for t in sorted(tabla_impacto, key=lambda x: x["ranking_v31"]):
    print("  %-22s seg %.4f -> %.4f (Δ%+.4f)  atlas %.4f -> %.4f  rank %d -> %d (Δ%+d)  nivel %s -> %s%s" % (
        t["municipio"], t["score_seguridad_v3"], t["score_seguridad_v31"], t["delta_seguridad"],
        t["atlas_score_v3"], t["atlas_score_v31"], t["ranking_v3"], t["ranking_v31"], t["delta_ranking"],
        t["nivel_seguridad_v3"], t["nivel_seguridad_v31"],
        "  <-- CAMBIA NIVEL" if t["cambia_nivel_seguridad"] else "",
    ))

print("\nSpearman atlas_score_v3 vs atlas_score_v31 (manzana, n=%d): rho=%.4f p=%.2e" % (
    len(feats), rho, pval))
print("Manzanas que cambian de quintil: %d (%.2f%%)" % (cambios_quintil, cambios_quintil / len(feats) * 100))
