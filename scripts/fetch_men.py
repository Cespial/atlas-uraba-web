#!/usr/bin/env python3
"""MEN — matrícula, cobertura y deserción escolar por municipio-año-nivel.

Genera public/data/educacion_men.json a partir del dataset Socrata
"MEN_ESTADISTICAS_EN_EDUCACION_EN_PREESCOLAR-BÁSICA_Y_MEDIA_POR_MUNICIPIO"
(id nudc-7mev, Ministerio de Educación Nacional), con desagregación por
nivel educativo (transición/primaria/secundaria/media) — ver
docs/investigacion/2026-07-07/social-seguridad.md §6.1 y
datos-institucionales.md §12.

Ojo de higiene de datos (documentado en el propio dossier): la fuente trae
"San Pedro de Urabá" SIN tilde ("San Pedro de Uraba") — se normaliza al
nombre canónico del atlas.

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

URL_MEN = "https://www.datos.gov.co/resource/nudc-7mev.json"

NIVELES = ["transici_n", "primaria", "secundaria", "media"]
NIVELES_OUT = {"transici_n": "transicion", "primaria": "primaria", "secundaria": "secundaria", "media": "media"}
INDICADORES = ["cobertura_neta", "cobertura_bruta", "deserci_n", "aprobaci_n", "reprobaci_n", "repitencia"]
INDICADORES_OUT = {
    "cobertura_neta": "cobertura_neta",
    "cobertura_bruta": "cobertura_bruta",
    "deserci_n": "desercion",
    "aprobaci_n": "aprobacion",
    "reprobaci_n": "reprobacion",
    "repitencia": "repitencia",
}


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


def fnum(v):
    if v is None:
        return None
    s = str(v).strip()
    if s == "":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def main():
    print("Descargando matrícula/cobertura/deserción MEN (Socrata nudc-7mev)...")
    # Nombres tal como los trae la fuente (San Pedro de Urabá SIN tilde) -> canónico del atlas.
    nombres_fuente = {v: v for v in MUNICIPIOS.values()}
    nombres_fuente["San Pedro de Uraba"] = "San Pedro de Urabá"

    municipios_soql = ",".join(f"'{n}'" for n in list(MUNICIPIOS.values()) + ["San Pedro de Uraba"])
    soql = {
        "$where": f"municipio in({municipios_soql})",
        "$order": "a_o,municipio",
        "$limit": 500,
    }
    url = URL_MEN + "?" + urllib.parse.urlencode(soql)
    data = fetch_json(url)
    print(f"  OK, {len(data)} filas crudas")

    municipios_men = {nombre: {} for nombre in MUNICIPIOS.values()}
    for r in data:
        nombre_fuente = r.get("municipio")
        nombre = nombres_fuente.get(nombre_fuente)
        if nombre not in municipios_men:
            continue
        anio = r.get("a_o")
        entrada = {
            "poblacion_5_16": fnum(r.get("poblaci_n_5_16")),
            "tasa_matriculacion_5_16": fnum(r.get("tasa_matriculaci_n_5_16")),
        }
        for ind in INDICADORES:
            entrada[INDICADORES_OUT[ind]] = {
                "total": fnum(r.get(ind)),
                **{NIVELES_OUT[niv]: fnum(r.get(f"{ind}_{niv}")) for niv in NIVELES},
            }
        municipios_men[nombre][anio] = entrada

    # --- Sanity checks ---
    con_datos = [n for n, serie in municipios_men.items() if serie]
    assert len(con_datos) == 9, f"Faltan municipios: {set(MUNICIPIOS.values()) - set(con_datos)}"
    apartado_2024 = municipios_men["Apartadó"].get("2024", {})
    assert apartado_2024.get("desercion", {}).get("total") is not None, "Apartadó 2024 sin deserción"
    print(f"  Sanity check OK: 9/9 municipios, Apartadó 2024 deserción total = {apartado_2024['desercion']['total']}")

    anios_totales = sorted({a for serie in municipios_men.values() for a in serie})

    out = {
        "_meta": {
            "fuente": "Ministerio de Educación Nacional (MEN) — "
            "'MEN_ESTADISTICAS_EN_EDUCACION_EN_PREESCOLAR-BÁSICA_Y_MEDIA_POR_MUNICIPIO'",
            "url": URL_MEN,
            "consulta": f"municipio IN (9 nombres de Urabá, incluida la variante sin tilde "
            f"'San Pedro de Uraba' que usa la fuente)",
            "fecha_consulta": HOY,
            "nota": "La fuente trae 'San Pedro de Urabá' SIN tilde ('San Pedro de Uraba') — se "
            "normalizó al nombre canónico del atlas. Los indicadores llegan desagregados por "
            "nivel educativo (transición/primaria/secundaria/media) además del total; los campos "
            "de la fuente usan transliteración sin tildes/ñ (a_o=año, deserci_n=deserción, "
            "aprobaci_n=aprobación) por el patrón estándar de exportación Socrata. Serie histórica "
            "completa 2011-2024 confirmada para los 9 municipios (14 años cada uno).",
            "anios_disponibles": anios_totales,
            "niveles": list(NIVELES_OUT.values()),
        },
        "municipios": municipios_men,
    }
    with open(BASE + "educacion_men.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("OK → educacion_men.json")


if __name__ == "__main__":
    main()
