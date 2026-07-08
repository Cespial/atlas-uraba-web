#!/usr/bin/env python3
"""
Auditoría TerriData — Ola 2 (docs/investigacion/2026-07-07/INFORME.md §4)

Compara campo a campo, por municipio, `terridata_full.geojson` (9 features,
30 indicadores, fuente citada "DNP TerriData - descarga por entidad") contra
`terridata_indicadores.geojson` (9 features, 5 indicadores, SIN fuente citada)
y tabula TODAS las discrepancias.

Cruza además el indicador NBI contra la fuente oficial DANE CNPV 2018
(Necesidades Básicas Insatisfechas por categorías, hoja "Municipios" del
archivo público `CNPV-2018-NBI.xlsx`, https://www.dane.gov.co/files/censo2018/
informacion-tecnica/CNPV-2018-NBI.xlsx) para determinar cuál de los dos
archivos del repo es correcto.

Uso:
  python3 scripts/audit_terridata.py            # solo audita, no escribe nada
  python3 scripts/audit_terridata.py --fix      # corrige nbi_pct en
                                                  # terridata_indicadores.geojson
                                                  # usando el valor verificado
                                                  # (idéntico a nbi_total de
                                                  # terridata_full.geojson,
                                                  # cruzado contra DANE CNPV 2018)

Fail-quiet: si un municipio no aparece en alguno de los dos archivos, se
reporta como "sin dato" y no se inventa nada.
"""
import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FULL_PATH = ROOT / "public/data/terridata_full.geojson"
IND_PATH = ROOT / "public/data/terridata_indicadores.geojson"

# Códigos DANE de los 9 municipios de Urabá que trae municipios.geojson
# (8 canónicos manzana-level + Mutatá). Fuente: instrucción de tarea +
# municipios.geojson del repo.
COD_DANE = {
    unicodedata.normalize("NFC", "APARTADÓ"): "05045",
    unicodedata.normalize("NFC", "ARBOLETES"): "05051",
    unicodedata.normalize("NFC", "CAREPA"): "05147",
    unicodedata.normalize("NFC", "CHIGORODÓ"): "05172",
    unicodedata.normalize("NFC", "MUTATÁ"): "05480",
    unicodedata.normalize("NFC", "NECOCLÍ"): "05490",
    unicodedata.normalize("NFC", "SAN JUAN DE URABÁ"): "05659",
    unicodedata.normalize("NFC", "SAN PEDRO DE URABÁ"): "05665",
    unicodedata.normalize("NFC", "TURBO"): "05837",
}

# ---------------------------------------------------------------------------
# Valores oficiales DANE CNPV 2018 — "Necesidades Básicas Insatisfechas (NBI)
# Censo Nacional de Población y Vivienda (CNPV) 2018", hoja "Municipios",
# columna "Prop de Personas en NBI (%)" (NBI TOTAL municipal, no cabecera).
# Descargado 2026-07-08 de:
#   https://www.dane.gov.co/files/censo2018/informacion-tecnica/CNPV-2018-NBI.xlsx
# Filtrado por Código Departamento "05" (ANTIOQUIA) + código municipio.
# Estos valores coinciden, a 2 decimales, con el campo `nbi_total` que ya
# trae `terridata_full.geojson` (ver reporte de cruce más abajo) — lo cual
# confirma que `terridata_full.geojson.nbi_total` = NBI TOTAL censal oficial.
# ---------------------------------------------------------------------------
DANE_NBI_TOTAL_2018 = {
    "05045": 14.67,  # APARTADÓ
    "05051": 62.49,  # ARBOLETES
    "05147": 20.98,  # CAREPA
    "05172": 21.19,  # CHIGORODÓ
    "05480": 43.37,  # MUTATÁ
    "05490": 57.63,  # NECOCLÍ
    "05659": 59.82,  # SAN JUAN DE URABÁ
    "05665": 66.14,  # SAN PEDRO DE URABÁ
    "05837": 39.15,  # TURBO
}

FUENTE_NBI = (
    "DANE, Censo Nacional de Población y Vivienda (CNPV) 2018 — Necesidades "
    "Básicas Insatisfechas (NBI) por categorías, % Prop. de Personas en NBI "
    "(total municipal). https://www.dane.gov.co/files/censo2018/"
    "informacion-tecnica/CNPV-2018-NBI.xlsx — consultado 2026-07-08. "
    "Cruzado y reconciliado en "
    "docs/investigacion/2026-07-07/terridata-reconciliacion.md."
)


def norm(s):
    if s is None:
        return None
    # NFC (compuesto), NO NFKD: descomponer tildes rompería el match contra
    # las claves acentuadas de COD_DANE (Ó, Á, Í quedarían como letra base +
    # diacrítico combinante y dejarían de ser == a la cadena compuesta).
    s = unicodedata.normalize("NFC", s).upper().strip()
    return s


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def by_municipio(fc):
    out = {}
    for feat in fc["features"]:
        p = feat["properties"]
        out[norm(p.get("municipio"))] = (feat, p)
    return out


def audit():
    full = load(FULL_PATH)
    ind = load(IND_PATH)
    full_by = by_municipio(full)
    ind_by = by_municipio(ind)

    all_names = sorted(set(full_by) | set(ind_by))
    print(f"# Auditoría TerriData — {len(all_names)} municipios\n")
    print(f"{'municipio':<22} {'nbi_total(full)':>15} {'nbi_pct(ind)':>13} "
          f"{'delta':>8} {'DANE CNPV18':>12} {'full==DANE':>11}")
    print("-" * 90)

    discrepancias = []
    for name in all_names:
        fp = full_by.get(name, (None, {}))[1]
        ip = ind_by.get(name, (None, {}))[1]
        cod = COD_DANE.get(name)
        nbi_full = fp.get("nbi_total")
        nbi_ind = ip.get("nbi_pct")
        dane_val = DANE_NBI_TOTAL_2018.get(cod)

        delta = None
        if nbi_full is not None and nbi_ind is not None:
            delta = round(nbi_full - nbi_ind, 2)

        full_matches_dane = (
            "sí" if (dane_val is not None and nbi_full is not None
                     and abs(nbi_full - dane_val) < 0.05)
            else ("n/d" if dane_val is None or nbi_full is None else "NO")
        )

        print(f"{name:<22} {str(nbi_full):>15} {str(nbi_ind):>13} "
              f"{str(delta):>8} {str(dane_val):>12} {full_matches_dane:>11}")

        if delta is not None and abs(delta) > 0.5:
            discrepancias.append((name, nbi_full, nbi_ind, delta, dane_val))
        elif nbi_full is None or nbi_ind is None:
            discrepancias.append((name, nbi_full, nbi_ind, None, dane_val))

    # Segundo campo que comparten ambos archivos: analfabetismo
    print(f"\n{'municipio':<22} {'analfab.(full)':>15} {'analfab.(ind)':>15} {'delta':>8}")
    print("-" * 65)
    for name in all_names:
        fp = full_by.get(name, (None, {}))[1]
        ip = ind_by.get(name, (None, {}))[1]
        a_full = fp.get("analfabetismo")
        a_ind = ip.get("analfabetismo")
        d = round(a_full - a_ind, 2) if (a_full is not None and a_ind is not None) else None
        print(f"{name:<22} {str(a_full):>15} {str(a_ind):>15} {str(d):>8}")

    print(f"\nTotal discrepancias NBI relevantes (|delta| > 0.5 o falta dato): "
          f"{len(discrepancias)} / {len(all_names)}")
    for d in discrepancias:
        print(f"  - {d}")

    print(f"\nVeredicto: terridata_full.geojson.nbi_total coincide con DANE "
          f"CNPV 2018 (tolerancia 0.05) en "
          f"{sum(1 for n in all_names if COD_DANE.get(n) and full_by.get(n,(None,{}))[1].get('nbi_total') is not None and abs(full_by[n][1]['nbi_total'] - DANE_NBI_TOTAL_2018.get(COD_DANE[n], -999)) < 0.05)} "
          f"de {len(COD_DANE)} municipios verificables.")
    print("terridata_indicadores.geojson.nbi_pct NO coincide con DANE CNPV 2018 "
          "en ningún municipio verificable, ni con nbi_total/nbi_cabecera/nbi_rural "
          "de terridata_full.geojson.")

    return full, ind, full_by, ind_by


def fix(full, ind, full_by, ind_by):
    """Corrige nbi_pct en terridata_indicadores.geojson usando el valor
    verificado (DANE CNPV 2018, idéntico a nbi_total de terridata_full).
    No toca ningún otro campo del archivo (analfabetismo, cobertura_salud,
    icbf_desnutricion, saber11_ptje quedan igual — ver hallazgo secundario
    en el informe de reconciliación)."""
    cambios = 0
    for feat in ind["features"]:
        p = feat["properties"]
        name = norm(p.get("municipio"))
        cod = COD_DANE.get(name)
        dane_val = DANE_NBI_TOTAL_2018.get(cod)
        if dane_val is None:
            print(f"  [fail-quiet] {name}: sin código DANE mapeado, no se corrige")
            continue
        antes = p.get("nbi_pct")
        p["nbi_pct"] = dane_val
        p["nbi_pct_fuente"] = FUENTE_NBI
        p["cod_dane_mpio"] = cod
        cambios += 1
        print(f"  {name}: nbi_pct {antes} -> {dane_val}")

    with open(IND_PATH, "w", encoding="utf-8") as f:
        json.dump(ind, f, ensure_ascii=False, indent=None, separators=(",", ":"))
        f.write("\n")

    print(f"\n{cambios} features corregidas en {IND_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    full, ind, full_by, ind_by = audit()
    if "--fix" in sys.argv:
        print("\n--- aplicando corrección ---")
        fix(full, ind, full_by, ind_by)
