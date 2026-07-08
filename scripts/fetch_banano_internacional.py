#!/usr/bin/env python3
"""Precio internacional del banano — World Bank Pink Sheet (Commodity Prices).

Genera public/data/banano_internacional.json a partir de la serie mensual
"CMO-Historical-Data-Monthly.xlsx" del Banco Mundial, columnas "Banana,
Europe" y "Banana, US", serie 2019-01 en adelante (ver
docs/investigacion/2026-07-07/agro-cadena.md §1 y su verificación
adversarial §5).

Nota importante (corrige un supuesto del brief de tarea): al abrir el XLSX
real con openpyxl, la hoja "Monthly Prices" trae esas dos columnas **ya en
US$/kg** (encabezado de unidad "($/kg)"), no en US$/tonelada como se asumía
inicialmente. Por lo tanto este script **no divide por 1000** — se deja
documentado explícitamente en `_meta` para que quien lo revise no reintroduzca
una conversión errónea.

Solo librería estándar (urllib/json) + openpyxl para leer el XLSX.
"""
import io
import json
import os
import time
import urllib.error
import urllib.request

import openpyxl

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data")
BASE = os.path.normpath(BASE) + os.sep

HOY = "2026-07-07"

URL_PINK_SHEET = (
    "https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/"
    "related/CMO-Historical-Data-Monthly.xlsx"
)

ANIO_MIN = 2019


def fetch_bytes(url, max_retries=4, backoff=3):
    last_err = None
    for intento in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AtlasUraba/1.0"})
            with urllib.request.urlopen(req, timeout=90) as resp:
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


def parse_periodo(etiqueta):
    """'2019M01' -> '2019-01'. Devuelve None si no matchea el patrón esperado."""
    if not isinstance(etiqueta, str) or "M" not in etiqueta:
        return None
    anio_s, mes_s = etiqueta.split("M", 1)
    try:
        anio = int(anio_s)
        mes = int(mes_s)
    except ValueError:
        return None
    if not (1 <= mes <= 12):
        return None
    return f"{anio:04d}-{mes:02d}"


def fnum(v):
    if isinstance(v, (int, float)):
        return round(float(v), 4)
    return None


def main():
    print("Descargando World Bank Pink Sheet (CMO-Historical-Data-Monthly.xlsx)...")
    xlsx_bytes = fetch_bytes(URL_PINK_SHEET)
    print(f"  OK, {len(xlsx_bytes) / 1024:.0f} KB")

    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), read_only=True, data_only=True)
    ws = wb["Monthly Prices"]
    rows = list(ws.iter_rows(values_only=True))

    header = rows[4]
    unidades = rows[5]

    col_eu = col_us = None
    for i, h in enumerate(header):
        if h == "Banana, Europe":
            col_eu = i
        elif h == "Banana, US":
            col_us = i
    assert col_eu is not None and col_us is not None, "No se encontraron las columnas de banano en el Pink Sheet"

    unidad_eu = str(unidades[col_eu]).strip()
    unidad_us = str(unidades[col_us]).strip()
    assert unidad_eu == "($/kg)" and unidad_us == "($/kg)", (
        f"Unidad inesperada en el Pink Sheet (europe={unidad_eu!r}, us={unidad_us!r}) — "
        "revisar si el Banco Mundial cambió el formato antes de asumir $/kg."
    )

    series = {}
    for row in rows[6:]:
        periodo = parse_periodo(row[0])
        if periodo is None:
            continue
        anio = int(periodo[:4])
        if anio < ANIO_MIN:
            continue
        eu = fnum(row[col_eu])
        us = fnum(row[col_us])
        if eu is None and us is None:
            continue
        series[periodo] = {"europe_usd_kg": eu, "us_usd_kg": us}

    assert len(series) > 0, "Serie de precio internacional de banano vacía"
    periodos = sorted(series)
    print(f"  OK, {len(series)} meses ({periodos[0]} a {periodos[-1]})")

    out = {
        "_meta": {
            "fuente": "Banco Mundial — Commodity Markets (\"Pink Sheet\"), precios mensuales de "
            "commodities en US$ nominales",
            "url": URL_PINK_SHEET,
            "consulta": "Hoja 'Monthly Prices', columnas 'Banana, Europe' y 'Banana, US' "
            f"(fila de encabezado 5, unidades en fila 6), desde {ANIO_MIN}-01 en adelante",
            "fecha_consulta": HOY,
            "unidad": "US$/kg",
            "nota": "El XLSX fuente ya trae 'Banana, Europe' y 'Banana, US' en US$/kg "
            "(encabezado de unidad literal '($/kg)' en la hoja 'Monthly Prices') — a pesar de "
            "que la referencia inicial de este pipeline asumía US$/tonelada, la verificación "
            "directa del archivo descartó esa hipótesis. Por eso NO se aplica ninguna "
            "conversión (no se divide por 1000); los valores de este JSON son el dato crudo "
            "del Banco Mundial. 'Banana, Europe' = precio f.o.t. Europa (incluye derechos de "
            "importación); 'Banana, US' = precio de importación a EE.UU., f.o.t. puertos del "
            "Golfo. Ambas para banano de Centro y Sudamérica, marcas mayores.",
            "periodo_min": periodos[0],
            "periodo_max": periodos[-1],
            "n_meses": len(series),
        },
        "series": series,
    }
    with open(BASE + "banano_internacional.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("OK → banano_internacional.json")


if __name__ == "__main__":
    main()
