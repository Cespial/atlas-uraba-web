#!/usr/bin/env python3
"""Índice de equidad intra-municipal — desigualdad interna del atlas_score_v3.

Por municipio: Gini, brecha p90-p10 y manzanas críticas (score bajo el p25
regional de Urabá). Lee atlas_enriquecido.geojson, escribe
public/data/equidad_municipios.json. Se auto-verifica con asserts.
"""
import json
import datetime

BASE = "/Users/cristianespinal/atlas-uraba-web/public/data/"

atlas = json.load(open(BASE + "atlas_enriquecido.geojson"))
feats = atlas["features"]
print("Cargadas %d manzanas" % len(feats))

by_mun = {}
all_scores = []
n_sin_score = 0
for f in feats:
    p = f["properties"]
    s = p.get("atlas_score_v3")
    if s is None:
        n_sin_score += 1
        continue
    s = float(s)
    by_mun.setdefault(p["municipio"], []).append(s)
    all_scores.append(s)

assert len(by_mun) == 8, f"Se esperaban 8 municipios, hay {len(by_mun)}: {sorted(by_mun)}"

all_sorted = sorted(all_scores)


def pctl(vals_sorted, q):
    """Percentil por índice más cercano sobre lista YA ordenada."""
    idx = min(len(vals_sorted) - 1, max(0, round(q * (len(vals_sorted) - 1))))
    return vals_sorted[idx]


UMBRAL = pctl(all_sorted, 0.25)
print(f"Umbral crítico regional (p25 Urabá): {UMBRAL:.4f}")


def gini(vals):
    """Coeficiente de Gini (fórmula de rangos sobre lista ordenada)."""
    v = sorted(vals)
    n = len(v)
    tot = sum(v)
    if n == 0 or tot == 0:
        return 0.0
    cum = sum(i * x for i, x in enumerate(v, 1))
    return (2.0 * cum) / (n * tot) - (n + 1.0) / n


municipios = {}
total = 0
for mun in sorted(by_mun):
    v = sorted(by_mun[mun])
    n = len(v)
    g = gini(v)
    assert 0.0 <= g <= 1.0, f"Gini fuera de rango en {mun}: {g}"
    p10 = pctl(v, 0.10)
    p90 = pctl(v, 0.90)
    criticas = sum(1 for x in v if x < UMBRAL)
    municipios[mun] = {
        "gini": round(g, 4),
        "p10": round(p10, 4),
        "p90": round(p90, 4),
        "brecha_p90_p10": round(p90 - p10, 4),
        "manzanas_criticas": criticas,
        "pct_criticas": round(criticas / n, 4),
        "n_manzanas": n,
    }
    total += n
    print(f"  {mun:22s} gini={g:.3f} brecha={p90 - p10:.3f} críticas={criticas} ({criticas / n:.0%}) n={n}")

assert total + n_sin_score == len(feats), "Las manzanas no cuadran con el geojson"
print(f"Total manzanas con score: {total} · sin score: {n_sin_score}")

out = {
    "_meta": {
        "fuente": "Cálculo propio Atlas Urabá sobre atlas_enriquecido.geojson (atlas_score_v3, CNPV 2018 + satélite GEE + isócronas OSRM)",
        "formula": "Por municipio: Gini(atlas_score_v3 de sus manzanas); brecha_p90_p10 = p90 - p10; manzanas_criticas = score < p25 regional de Urabá",
        "umbral_critico": round(UMBRAL, 4),
        "generado": datetime.date.today().isoformat(),
        "n_total": total,
        "n_sin_score": n_sin_score,
    },
    "municipios": municipios,
}

with open(BASE + "equidad_municipios.json", "w") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
print("OK → equidad_municipios.json")
