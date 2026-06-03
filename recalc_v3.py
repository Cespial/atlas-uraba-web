#!/usr/bin/env python3
"""Recalcula el indice Atlas a v3 con insumos reales (satelite_v3 GEE, isocronas OSRM reales)."""
import json, csv, statistics, copy

BASE = "/Users/cristianespinal/atlas-uraba-web/public/data/"

# ---------- 1. Cargar atlas_enriquecido (v1+v2) ----------
atlas = json.load(open(BASE + "atlas_enriquecido.geojson"))
feats = atlas["features"]
print("Cargadas %d manzanas" % len(feats))

# ---------- 2/3. Cargar insumos reales ----------
sat = {r["cod_manzana"]: r for r in csv.DictReader(open(BASE + "satelite_v3.csv"))}
iso = {r["cod_manzana"]: r for r in csv.DictReader(open(BASE + "isocronas_osrm_real.csv"))}


def fnum(v):
    try:
        return float(v) if v not in (None, "", "null") else None
    except (TypeError, ValueError):
        return None


# Rangos para normalizacion (de los datos reales)
ndbi_vals = [fnum(r["ndbi"]) for r in sat.values() if fnum(r["ndbi"]) is not None]
lst_vals = [fnum(r["lst_c"]) for r in sat.values() if fnum(r["lst_c"]) is not None]
viirs_vals = [fnum(r["viirs_rad"]) for r in sat.values() if fnum(r["viirs_rad"]) is not None]
ND_MIN, ND_MAX = min(ndbi_vals), max(ndbi_vals)
LST_MIN, LST_MAX = min(lst_vals), max(lst_vals)
VR_MIN, VR_MAX = min(viirs_vals), max(viirs_vals)

# Isocronas: minutos de conduccion reales. Umbrales de saturacion para mapear a 0-1 (mejor=mas cerca).
# Usamos un techo razonable de accesibilidad: a/partir de este tiempo, score=0.
CAP_IPS = 60.0        # min a IPS mas cercana
CAP_COLEGIO = 30.0    # min a colegio mas cercano
CAP_CABECERA = 45.0   # min a cabecera municipal
CAP_PUERTO = 120.0    # min a Puerto Antioquia


def clamp01(x):
    return max(0.0, min(1.0, x))


def norm(x, lo, hi):
    if x is None or hi == lo:
        return None
    return clamp01((x - lo) / (hi - lo))


def acc_from_minutes(mins, cap):
    """0 min -> 1.0 ; cap o mas -> 0.0 (lineal). None -> None."""
    if mins is None:
        return None
    return clamp01(1.0 - (mins / cap))


# Pesos finales del indice v3
W_ACC, W_AMB, W_SOC, W_SEG = 0.40, 0.25, 0.25, 0.20
W_SUM = W_ACC + W_AMB + W_SOC + W_SEG  # 1.10 -> se normaliza

# Contadores de procedencia
cnt = dict(acc_real=0, acc_v2=0, amb_real=0, amb_v2=0, calor=0, ndbi=0, viirs=0)

for f in feats:
    p = f["properties"]
    code = p["cod_manzana"]
    s = sat.get(code)
    i = iso.get(code)

    # --- 2. Satelite: reemplazar impermeabilizacion<-ndbi, proxy_luminosidad<-viirs, score_calor<-lst ---
    if s is not None:
        ndbi = fnum(s["ndbi"])
        lst = fnum(s["lst_c"])
        viirs = fnum(s["viirs_rad"])
        if ndbi is not None:
            p["ndbi"] = round(ndbi, 5)
            p["impermeabilizacion"] = round(norm(ndbi, ND_MIN, ND_MAX), 4)  # 0-1, mas built-up = mayor
            cnt["ndbi"] += 1
        if viirs is not None:
            p["viirs_rad"] = round(viirs, 4)
            p["proxy_luminosidad"] = round(norm(viirs, VR_MIN, VR_MAX), 4)  # 0-1
            cnt["viirs"] += 1
        if lst is not None:
            p["lst_c"] = round(lst, 4)
            # score_calor: mas calor = peor (ambientalmente). Aqui 1.0 = mas fresco (mejor), 0 = mas caliente.
            p["score_calor"] = round(1.0 - norm(lst, LST_MIN, LST_MAX), 4)
            cnt["calor"] += 1
        else:
            p["score_calor"] = None

    # --- 4a. Accesibilidad v3 desde isocronas reales ---
    acc_v3 = None
    metodo_acc = None
    if i is not None:
        a_ips = acc_from_minutes(fnum(i["min_ips"]), CAP_IPS)
        a_col = acc_from_minutes(fnum(i["min_colegio"]), CAP_COLEGIO)
        a_cab = acc_from_minutes(fnum(i["min_cabecera"]), CAP_CABECERA)
        a_pue = acc_from_minutes(fnum(i["min_puerto"]), CAP_PUERTO)
        comps = [(a_ips, 0.30), (a_col, 0.25), (a_cab, 0.30), (a_pue, 0.15)]
        valid = [(v, w) for v, w in comps if v is not None]
        if valid:
            wsum = sum(w for _, w in valid)
            acc_v3 = sum(v * w for v, w in valid) / wsum
            metodo_acc = i.get("metodo", "osrm_real")
    if acc_v3 is not None:
        p["score_accesibilidad_v3"] = round(acc_v3, 4)
        p["acc_metodo_v3"] = metodo_acc
        cnt["acc_real"] += 1
    else:
        # las 3 manzanas mar-adentro (osrm_real_parcial sin tiempos): mantener v2
        p["score_accesibilidad_v3"] = p["score_accesibilidad_v2"]
        p["acc_metodo_v3"] = "v2_fallback"
        cnt["acc_v2"] += 1

    # --- 4b. Ambiental v3: NDVI (real) + score_calor (LST real, nuevo) ---
    ndvi = p.get("score_ndvi")
    ndvi_n = norm(ndvi, -0.05, 0.85) if isinstance(ndvi, (int, float)) else None  # NDVI ya en escala -0.05..0.83
    calor = p.get("score_calor")
    amb_comps = []
    if ndvi_n is not None:
        amb_comps.append((ndvi_n, 0.6))
    if isinstance(calor, (int, float)):
        amb_comps.append((calor, 0.4))
    if amb_comps:
        wsum = sum(w for _, w in amb_comps)
        amb_v3 = sum(v * w for v, w in amb_comps) / wsum
        p["score_ambiental_v3"] = round(amb_v3, 4)
        cnt["amb_real"] += 1
    else:
        amb_v3 = p["score_ambiental_v2"]
        p["score_ambiental_v3"] = amb_v3
        cnt["amb_v2"] += 1

    # --- 4c. Socioeconomico (25%): sin insumo nuevo -> v2 ---
    soc_v3 = p["score_economico_v2"]
    p["score_socioeconomico_v3"] = soc_v3

    # --- 4d. Seguridad (20%): sin insumo nuevo -> v2 ---
    seg = p["score_seguridad"]

    # --- Indice v3 ---
    acc = p["score_accesibilidad_v3"]
    amb = p["score_ambiental_v3"]
    score = (W_ACC * acc + W_AMB * amb + W_SOC * soc_v3 + W_SEG * seg) / W_SUM
    p["atlas_score_v3"] = round(clamp01(score), 4)

print("Procedencia:", cnt)

# ---------- Recalcular quintil v3 ----------
scores = sorted(f["properties"]["atlas_score_v3"] for f in feats)
n = len(scores)
qbreaks = [scores[int(n * q)] for q in (0.2, 0.4, 0.6, 0.8)]


def quintil_v3(x):
    if x < qbreaks[0]:
        return "Q1-Crítico"
    if x < qbreaks[1]:
        return "Q2-Bajo"
    if x < qbreaks[2]:
        return "Q3-Medio"
    if x < qbreaks[3]:
        return "Q4-Alto"
    return "Q5-Óptimo"


for f in feats:
    f["properties"]["quintil_v3"] = quintil_v3(f["properties"]["atlas_score_v3"])

# ---------- 5. Escribir atlas_enriquecido actualizado ----------
json.dump(atlas, open(BASE + "atlas_enriquecido.geojson", "w"), ensure_ascii=False)
print("Escrito atlas_enriquecido.geojson")

# ---------- Regenerar atlas.geojson (slim) ----------
SLIM_KEYS = ["_fid", "cod_manzana", "municipio", "atlas_score_v3", "quintil_v3",
             "score_accesibilidad_v3", "score_ambiental_v3", "score_socioeconomico_v3",
             "score_seguridad", "zona_atlas", "moran_i",
             # mantener compat con v previos para no romper el frontend
             "atlas_score", "atlas_score_v2", "quintil"]
slim = {"type": "FeatureCollection", "features": []}
for f in feats:
    p = f["properties"]
    np_ = {k: p[k] for k in SLIM_KEYS if k in p}
    # alias canonicos
    np_["atlas_score"] = p["atlas_score_v3"]
    np_["quintil"] = p["quintil_v3"]
    np_["score_accesibilidad"] = p["score_accesibilidad_v3"]
    np_["score_ambiental"] = p["score_ambiental_v3"]
    np_["score_socioeconomico"] = p["score_socioeconomico_v3"]
    slim["features"].append({"type": "Feature", "geometry": f["geometry"], "properties": np_})
json.dump(slim, open(BASE + "atlas.geojson", "w"), ensure_ascii=False)
print("Escrito atlas.geojson (slim)")

# ---------- atlas_stats_v3.json (promedios por municipio) ----------
from collections import defaultdict
groups = defaultdict(list)
for f in feats:
    groups[f["properties"]["municipio"]].append(f["properties"])

AVG_KEYS = ["atlas_score_v3", "atlas_score_v2", "score_accesibilidad_v3", "score_ambiental_v3",
            "score_socioeconomico_v3", "score_seguridad", "score_ndvi", "score_calor",
            "impermeabilizacion", "proxy_luminosidad", "ndbi", "lst_c", "viirs_rad"]
stats = {}
for muni, rows in groups.items():
    avg = {}
    for k in AVG_KEYS:
        vals = [r[k] for r in rows if isinstance(r.get(k), (int, float))]
        if vals:
            avg[k] = round(statistics.mean(vals), 4)
    stats[muni] = {"count": len(rows), "avg": avg}

# ranking por atlas_score_v3
ranking = sorted(((m, stats[m]["avg"]["atlas_score_v3"]) for m in stats),
                 key=lambda x: -x[1])
out = {
    "_meta": {
        "version": "v3",
        "generado": "2026-06-03",
        "formula": "atlas_score_v3 = (0.40*accesibilidad + 0.25*ambiental + 0.25*socioeconomico + 0.20*seguridad) / 1.10",
        "insumos_reales": {
            "accesibilidad": "isocronas_osrm_real.csv (routing OSRM real por carretera: min_ips/min_colegio/min_cabecera/min_puerto)",
            "ambiental": "satelite_v3.csv NDVI (S2) + score_calor desde LST (Landsat 8/9)",
            "impermeabilizacion": "satelite_v3.csv NDBI (S2) normalizado 0-1 (reemplaza proxy previo)",
            "proxy_luminosidad": "satelite_v3.csv VIIRS avg_rad normalizado 0-1 (reemplaza proxy previo)",
        },
        "insumos_v2_sin_cambio": {
            "socioeconomico": "score_economico_v2 (TerriData/SUI/EVA; no llego insumo nuevo)",
            "seguridad": "score_seguridad v2 (no llego insumo nuevo)",
        },
        "caps_accesibilidad_min": {"ips": CAP_IPS, "colegio": CAP_COLEGIO, "cabecera": CAP_CABECERA, "puerto": CAP_PUERTO},
        "quintil_breaks_v3": [round(b, 4) for b in qbreaks],
        "procedencia": cnt,
    },
    "ranking_municipios_v3": [{"municipio": m, "atlas_score_v3": s} for m, s in ranking],
    "municipios": stats,
}
json.dump(out, open(BASE + "atlas_stats_v3.json", "w"), ensure_ascii=False, indent=2)
print("Escrito atlas_stats_v3.json")

print("\nRANKING v3:")
for m, s in ranking:
    print("  %-22s %.4f  (v2 %.4f)" % (m, s, stats[m]["avg"].get("atlas_score_v2", 0)))
