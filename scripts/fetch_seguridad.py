#!/usr/bin/env python3
"""Población DANE 2018-2042 y homicidios MinDefensa/SIEDCO por municipio-año.

Genera dos salidas en public/data/:
  - poblacion_municipios.json : proyecciones DANE (denominador de tasas)
  - seguridad_municipios.json : homicidios (dataset Socrata m8fd-ahd9) tasados
    por 100k habitantes usando la población recién descargada.

Fuentes (verificadas 2026-07-07, ver docs/investigacion/2026-07-07/
datos-institucionales.md §5 y social-seguridad.md §1/§13):
  - DANE PPED-AreaMun-2018-2042_VP.xlsx (descarga directa, sin autenticación).
  - datos.gov.co/resource/m8fd-ahd9.json (Socrata, MinDefensa/SIEDCO,
    sin autenticación, agregación SoQL por municipio-año).

Solo librería estándar (urllib/json) + openpyxl para leer el XLSX del DANE.
Se auto-verifica con asserts (Turbo 2023 = 67 homicidios, sanity check citado
en el dossier).
"""
import datetime
import io
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

import openpyxl

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data")
BASE = os.path.normpath(BASE) + os.sep

HOY = "2026-07-07"

# Los 9 municipios del geojson del atlas (DANE code -> nombre canónico,
# el mismo que usa municipios.geojson tras normalizar mayúsculas/tildes).
MUNICIPIOS = {
    "05045": "Apartadó",
    "05051": "Arboletes",
    "05147": "Carepa",
    "05172": "Chigorodó",
    "05480": "Mutatá",
    "05490": "Necoclí",
    "05659": "San Juan de Urabá",
    "05665": "San Pedro de Urabá",
    "05837": "Turbo",
}

URL_POBLACION = (
    "https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/"
    "Municipal/PPED-AreaMun-2018-2042_VP.xlsx"
)
URL_HOMICIDIOS = "https://www.datos.gov.co/resource/m8fd-ahd9.json"


def fetch_bytes(url, max_retries=4, backoff=3):
    """GET binario con reintentos y backoff exponencial ante 403/429."""
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
        except urllib.error.URLError as e:
            last_err = e
            if intento < max_retries:
                espera = backoff * intento
                print(f"  [URLError] reintento {intento}/{max_retries} en {espera}s ({url}): {e}")
                time.sleep(espera)
                continue
            raise
    raise last_err  # pragma: no cover


def fetch_json(url, max_retries=4, backoff=3):
    return json.loads(fetch_bytes(url, max_retries=max_retries, backoff=backoff))


# ---------------------------------------------------------------------------
# 1. Población DANE 2018-2042
# ---------------------------------------------------------------------------
def construir_poblacion():
    print("Descargando proyecciones DANE de población (XLSX)...")
    xlsx_bytes = fetch_bytes(URL_POBLACION)
    print(f"  OK, {len(xlsx_bytes) / 1024:.0f} KB")

    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), read_only=True, data_only=True)
    ws = wb["PobMunicipalxÁrea"]

    municipios_pob = {nombre: {} for nombre in MUNICIPIOS.values()}
    for row in ws.iter_rows(min_row=9, values_only=True):
        cod_dane = row[2]
        anio = row[4]
        area = row[5]
        total = row[6]
        if cod_dane not in MUNICIPIOS or area != "Total":
            continue
        nombre = MUNICIPIOS[cod_dane]
        municipios_pob[nombre][str(anio)] = int(total)

    for nombre in MUNICIPIOS.values():
        anios = municipios_pob[nombre]
        assert len(anios) == 25, f"{nombre}: se esperaban 25 años (2018-2042), hay {len(anios)}"
        assert "2018" in anios and "2042" in anios, f"{nombre}: faltan extremos de la serie"

    out = {
        "_meta": {
            "fuente": "DANE — Proyecciones de Población y Estudios Demográficos (PPED), "
            "municipal por área geográfica",
            "url": URL_POBLACION,
            "consulta": "Total por municipio y año (suma de Cabecera Municipal + "
            "Centros Poblados y Rural Disperso), filtrado a los 9 códigos DANE de Urabá",
            "fecha_consulta": HOY,
            "nota": "Proyecciones oficiales 2018-2042 (base Censo 2018). Único denominador "
            "poblacional usado en este atlas para tasas por 100k habitantes.",
        },
        "municipios": municipios_pob,
    }
    with open(BASE + "poblacion_municipios.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("OK → poblacion_municipios.json")
    return municipios_pob


# ---------------------------------------------------------------------------
# 2. Homicidios MinDefensa/SIEDCO tasados
# ---------------------------------------------------------------------------
def construir_seguridad(poblacion):
    print("Descargando homicidios MinDefensa/SIEDCO (Socrata m8fd-ahd9)...")
    codigos = ",".join(f"'{c}'" for c in MUNICIPIOS)
    soql = {
        "$select": "municipio,cod_muni,date_extract_y(fecha_hecho) as anio,sum(cantidad) as total",
        "$where": f"cod_muni in({codigos}) AND fecha_hecho >= '2018-01-01'",
        "$group": "municipio,cod_muni,anio",
        "$order": "anio,municipio",
        "$limit": 5000,
    }
    url = URL_HOMICIDIOS + "?" + urllib.parse.urlencode(soql)
    data = fetch_json(url)
    print(f"  OK, {len(data)} filas municipio-año")

    municipios_seg = {nombre: {} for nombre in MUNICIPIOS.values()}
    for r in data:
        cod = r["cod_muni"]
        if cod not in MUNICIPIOS:
            continue
        nombre = MUNICIPIOS[cod]
        anio = r["anio"]
        homicidios = int(float(r["total"]))
        pob = poblacion.get(nombre, {}).get(anio)
        tasa = round(homicidios / pob * 100000, 1) if pob else None
        municipios_seg[nombre][anio] = {"homicidios": homicidios, "tasa_100k": tasa}

    # --- Sanity check citado en el dossier: Turbo 2023 = 67 ---
    turbo_2023 = municipios_seg["Turbo"].get("2023", {}).get("homicidios")
    assert turbo_2023 == 67, f"Sanity check falló: Turbo 2023 = {turbo_2023}, se esperaba 67"
    print(f"  Sanity check OK: Turbo 2023 = {turbo_2023} homicidios")

    for nombre, serie in municipios_seg.items():
        assert len(serie) > 0, f"{nombre}: serie de homicidios vacía"

    anios_totales = sorted({a for serie in municipios_seg.values() for a in serie})

    out = {
        "_meta": {
            "fuente": "Ministerio de Defensa Nacional (MinDefensa) — registros SIEDCO de la "
            "Policía Nacional, dataset 'HOMICIDIO' consolidado por el Observatorio del Delito",
            "url": "https://www.datos.gov.co/resource/m8fd-ahd9.json",
            "consulta": soql["$select"] + " WHERE " + soql["$where"] + " GROUP BY " + soql["$group"],
            "fecha_consulta": HOY,
            "nota": "Hechos reportados a autoridad (SIEDCO/MinDefensa), no violencia total — "
            "subregistro posible por miedo a represalias en zonas con presencia de actores "
            "armados. El año más reciente puede estar incompleto (los casos se corrigen con "
            "rezago administrativo). tasa_100k = homicidios / población (proyección DANE del "
            "mismo año) × 100.000, redondeada a 1 decimal.",
            "anios_disponibles": anios_totales,
            "sanity_check": "Turbo 2023 = 67 homicidios (verificado contra dossier de investigación)",
        },
        "municipios": municipios_seg,
    }
    with open(BASE + "seguridad_municipios.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("OK → seguridad_municipios.json")


if __name__ == "__main__":
    poblacion = construir_poblacion()
    construir_seguridad(poblacion)
    print("Listo.")
