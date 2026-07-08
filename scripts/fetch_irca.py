#!/usr/bin/env python3
"""IRCA (Índice de Riesgo de la Calidad del Agua para consumo humano) — INS.

Genera public/data/irca_municipios.json a partir del dataset Socrata del
Instituto Nacional de Salud "Calidad del Agua para Consumo Humano en
Colombia" (id nxt2-39c3), serie 2018-2024, con desagregación urbano/rural
cuando el dataset la trae (ver docs/investigacion/2026-07-07/
datos-institucionales.md §3).

Solo librería estándar (urllib/json). Se auto-verifica con un assert
(Necoclí pasó de riesgo medio 2020-2021 a "Sin riesgo" en 2024, sanity
check citado en el dossier).
"""
import datetime
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data")
BASE = os.path.normpath(BASE) + os.sep

HOY = "2026-07-07"

# Nombres tal como los trae el dataset del INS (con tildes) -> nombre canónico del atlas.
MUNICIPIOS = {
    "Apartadó": "Apartadó",
    "Arboletes": "Arboletes",
    "Carepa": "Carepa",
    "Chigorodó": "Chigorodó",
    "Mutatá": "Mutatá",
    "Necoclí": "Necoclí",
    "San Juan de Urabá": "San Juan de Urabá",
    "San Pedro de Urabá": "San Pedro de Urabá",
    "Turbo": "Turbo",
}

URL_IRCA = "https://www.datos.gov.co/resource/nxt2-39c3.json"

ANIO_MIN = 2018
ANIO_MAX = 2024


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


def fnum(v):
    """Convierte a float; 'ND' (no disponible) y vacíos -> None."""
    if v is None:
        return None
    s = str(v).strip()
    if s == "" or s.upper() == "ND":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def main():
    print("Descargando IRCA (Socrata nxt2-39c3, INS)...")
    municipios_soql = ",".join(f"'{m}'" for m in MUNICIPIOS)
    soql = {
        "$where": f"departamento='Antioquia' AND municipio in({municipios_soql})",
        "$order": "municipio,a_o",
        "$limit": 500,
    }
    url = URL_IRCA + "?" + urllib.parse.urlencode(soql)
    data = fetch_json(url)
    print(f"  OK, {len(data)} filas crudas")

    municipios_irca = {nombre: {} for nombre in MUNICIPIOS.values()}
    niveles_vistos = set()
    for r in data:
        nombre_ins = r.get("municipio")
        if nombre_ins not in MUNICIPIOS:
            continue
        anio = r.get("a_o")
        if anio is None:
            continue
        anio_i = int(anio)
        if not (ANIO_MIN <= anio_i <= ANIO_MAX):
            continue
        nombre = MUNICIPIOS[nombre_ins]
        nivel = r.get("nivel_de_riesgo")
        if nivel:
            niveles_vistos.add(nivel)
        municipios_irca[nombre][str(anio_i)] = {
            "irca": fnum(r.get("irca")),
            "nivel": nivel,
            "irca_urbano": fnum(r.get("ircaurbano")),
            "irca_rural": fnum(r.get("ircarural")),
        }

    # --- Cobertura: 9/9 municipios con al menos un año en el rango ---
    faltantes = [n for n, serie in municipios_irca.items() if not serie]
    assert not faltantes, f"Municipios sin ningún dato IRCA 2018-2024: {faltantes}"

    niveles_esperados = {
        "Sin riesgo",
        "Riesgo bajo",
        "Riesgo medio",
        "Riesgo alto",
        "Inviable sanitariamente",
    }
    assert niveles_vistos <= niveles_esperados, (
        f"Niveles de riesgo no reconocidos en el dataset: {niveles_vistos - niveles_esperados}"
    )

    # --- Sanity check citado en el dossier: Necoclí riesgo medio 2020-2021 -> Sin riesgo 2024 ---
    necocli = municipios_irca["Necoclí"]
    nivel_2024 = necocli.get("2024", {}).get("nivel")
    assert nivel_2024 == "Sin riesgo", f"Sanity check falló: Necoclí 2024 nivel = {nivel_2024!r}, se esperaba 'Sin riesgo'"
    nivel_2020 = necocli.get("2020", {}).get("nivel")
    nivel_2021 = necocli.get("2021", {}).get("nivel")
    print(f"  Sanity check OK: Necoclí 2020={nivel_2020!r} 2021={nivel_2021!r} -> 2024={nivel_2024!r}")

    out = {
        "_meta": {
            "fuente": "Instituto Nacional de Salud (INS) — 'Calidad del Agua para Consumo "
            "Humano en Colombia' (IRCA, Índice de Riesgo de la Calidad del Agua)",
            "url": URL_IRCA,
            "consulta": f"departamento='Antioquia' AND municipio in(9 municipios de Urabá), "
            f"a_o entre {ANIO_MIN} y {ANIO_MAX}",
            "fecha_consulta": HOY,
            "nota": "IRCA por municipio (dataset SIVICAP). 'ND' del dataset original se "
            "representa como null (dato no disponible para esa desagregación urbano/rural "
            "ese año). Niveles de riesgo tal como los reporta el INS: Sin riesgo (0-5), "
            "Riesgo bajo (5.1-14), Riesgo medio (14.1-35), Riesgo alto (35.1-80), "
            "Inviable sanitariamente (80.1-100).",
            "sanity_check": f"Necoclí: riesgo medio en 2020/2021 → Sin riesgo en 2024 "
            f"(2020={nivel_2020!r}, 2021={nivel_2021!r}, 2024={nivel_2024!r})",
        },
        "municipios": municipios_irca,
    }
    with open(BASE + "irca_municipios.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("OK → irca_municipios.json")


if __name__ == "__main__":
    main()
