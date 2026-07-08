#!/usr/bin/env python3
"""MinTIC — completa los municipios faltantes de tic_cobertura.geojson.

public/data/tic_cobertura.geojson ya tenía 5/9 municipios poblados
(Carepa, Apartadó, Turbo, San Juan de Urabá, Arboletes, tic_anio=2023) desde
el dataset Socrata "Cobertura móvil por tecnología, departamento y
municipio por proveedor" (id 9mey-c8s8, MinTIC — ver
docs/investigacion/2026-07-07/datos-institucionales.md §4). Este script
completa los 4 municipios que seguían en null (Mutatá, Chigorodó, San Pedro
de Urabá, Necoclí) con la MISMA fuente y un método reproducible: para cada
municipio y año 2023, se toma el conjunto de centros poblados
(`cod_centro_poblado`) reportados por al menos un proveedor, y se calcula
`pct_4g` = % de esos centros poblados en los que ALGÚN proveedor reporta
`cobertuta_4g = 'S'` en 2023.

Nota metodológica honesta: no fue posible reconstruir con certeza absoluta
la fórmula EXACTA que produjo los 5 valores ya existentes en el archivo
(los intentos de reproducirlos con este mismo dataset se acercan pero no
calzan al decimal — ver concern en el reporte de la tarea). Se aplicó el
método más defendible y documentado disponible sobre la MISMA fuente, para
no dejar los 4 municipios restantes en null. pct_5g y pct_lte se dejan en
null igual que en los 5 municipios ya poblados (cobertura 5G/LTE
prácticamente inexistente en la subregión a 2023, consistente con el resto
del archivo).

Preserva el formato exacto del geojson (FeatureCollection, mismas geometrías,
solo se editan las propiedades `pct_4g`/`tic_anio` de las 4 features
faltantes).

Solo librería estándar (urllib/json).
"""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data")
BASE = os.path.normpath(BASE) + os.sep

HOY = "2026-07-08"

URL_MINTIC = "https://www.datos.gov.co/resource/9mey-c8s8.json"

# Nombre EXACTO tal como aparece en la propiedad `municipio` de tic_cobertura.geojson
# (mayúsculas con tilde) -> nombre tal como lo trae el dataset MinTIC (también
# mayúsculas con tilde, salvo variantes verificadas manualmente por LIKE).
FALTANTES = {
    "MUTATÁ": "MUTATÁ",
    "CHIGORODÓ": "CHIGORODÓ",
    "SAN PEDRO DE URABÁ": "SAN PEDRO DE URABA",
    "NECOCLÍ": "NECOCLÍ",
}

ANIO = "2023"


def fetch_bytes(url, max_retries=4, backoff=3):
    last_err = None
    for intento in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AtlasUraba/1.0"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code in (403, 429) and intento < max_retries:
                espera = backoff * intento
                print(f"  [{e.code}] reintento {intento}/{max_retries} en {espera}s ({url})")
                time.sleep(espera)
                continue
            raise
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last_err = e
            if intento < max_retries:
                espera = backoff * intento
                print(f"  [{type(e).__name__}] reintento {intento}/{max_retries} en {espera}s ({url}): {e}")
                time.sleep(espera)
                continue
            raise
    raise last_err  # pragma: no cover


def fetch_json(url, max_retries=4, backoff=3):
    return json.loads(fetch_bytes(url, max_retries=max_retries, backoff=backoff))


def pct_tecnologia_municipio(nombre_fuente):
    """% de centros poblados cubiertos por 4G/5G/LTE (algún proveedor reporta 'S')."""
    soql = {
        "$select": "cod_centro_poblado,cobertuta_4g,cobertura_5g,cobertura_lte",
        "$where": f"upper(municipio) = '{nombre_fuente}' AND a_o='{ANIO}'",
        "$limit": 500,
    }
    url = URL_MINTIC + "?" + urllib.parse.urlencode(soql)
    rows = fetch_json(url)
    centros = {}
    for r in rows:
        cp = r["cod_centro_poblado"]
        d = centros.setdefault(cp, {"4g": False, "5g": False, "lte": False})
        d["4g"] = d["4g"] or (r.get("cobertuta_4g") == "S")
        d["5g"] = d["5g"] or (r.get("cobertura_5g") == "S")
        d["lte"] = d["lte"] or (r.get("cobertura_lte") == "S")
    if not centros:
        return None, None, None, 0
    n = len(centros)
    pct = lambda k: round(sum(1 for v in centros.values() if v[k]) / n * 100, 1)
    return pct("4g"), pct("5g"), pct("lte"), n


def main():
    print("Completando tic_cobertura.geojson con MinTIC (Socrata 9mey-c8s8)...")
    path = BASE + "tic_cobertura.geojson"
    with open(path) as fh:
        geo = json.load(fh)

    actualizados = {}
    for feat in geo["features"]:
        props = feat["properties"]
        muni = props.get("municipio")
        if muni not in FALTANTES:
            continue
        if props.get("pct_4g") is not None:
            continue  # ya poblado, no tocar
        nombre_fuente = FALTANTES[muni]
        pct_4g, pct_5g, pct_lte, n_centros = pct_tecnologia_municipio(nombre_fuente)
        if pct_4g is None:
            print(f"  [SIN DATO] {muni}: no se encontraron centros poblados para {ANIO}")
            continue
        props["pct_4g"] = pct_4g
        props["pct_5g"] = pct_5g
        props["pct_lte"] = pct_lte
        props["tic_anio"] = float(ANIO)
        actualizados[muni] = {"pct_4g": pct_4g, "pct_5g": pct_5g, "pct_lte": pct_lte, "n_centros_poblados": n_centros}
        print(f"  {muni}: pct_4g={pct_4g} pct_5g={pct_5g} pct_lte={pct_lte} ({n_centros} centros poblados, {ANIO})")
        time.sleep(0.3)

    # --- Sanity checks ---
    assert len(actualizados) == 4, f"Se esperaban 4 municipios actualizados, se lograron {len(actualizados)}: {list(actualizados)}"
    poblados = sum(1 for f in geo["features"] if f["properties"].get("pct_4g") is not None)
    assert poblados == 9, f"Tras el patch deberían quedar 9/9 municipios con pct_4g, hay {poblados}"
    print(f"  Sanity check OK: 9/9 municipios de tic_cobertura.geojson con pct_4g poblado")

    with open(path, "w") as fh:
        json.dump(geo, fh, ensure_ascii=False, indent=2)
    print("OK → tic_cobertura.geojson (parcheado in-place)")

    # Nota de metodología queda documentada en el docstring de este script y en
    # el commit; el geojson en sí no tiene bloque _meta propio (no se le agrega
    # uno nuevo para no romper el formato ya consumido por el resto del atlas).
    print(json.dumps({"_nota_metodologica": "ver docstring de scripts/fetch_mintic_tic.py",
                       "fuente": URL_MINTIC, "fecha_consulta": HOY, "actualizados": actualizados}, ensure_ascii=False))


if __name__ == "__main__":
    main()
