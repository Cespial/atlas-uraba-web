#!/usr/bin/env python3
"""Saber 11 (ICFES) — puntaje global agregado por colegio, municipios de Urabá.

Genera public/data/saber11_colegios.json a partir del dataset Socrata
"Resultados Únicos Saber 11" (id kgxf-xxbe, ICFES, ~7.1M filas/estudiante),
agregando REMOTO (SoQL avg/count) por colegio para los 9 municipios de
Urabá, periodos 2022-2024 (ver docs/investigacion/2026-07-07/
social-seguridad.md §6.2 y verificación adversarial hallazgo 5).

NO se descarga el dataset completo — se consulta agregado por municipio con
$group/$select (count(*), avg(punt_global::number)) para mantener el
volumen de descarga mínimo.

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

URL_SABER11 = "https://www.datos.gov.co/resource/kgxf-xxbe.json"

PERIODO_MIN = "20221"  # 2022, periodo 1
PERIODO_MAX = "20244"  # 2024, periodo 4


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


def main():
    print("Descargando Saber 11 agregado por colegio (Socrata kgxf-xxbe, ICFES)...")
    colegios = []
    errores = []
    for cod, nombre in MUNICIPIOS.items():
        soql = {
            "$select": "cole_cod_dane_establecimiento,cole_nombre_establecimiento,"
            "count(*) as n_evaluados,avg(punt_global::number) as prom",
            "$where": f"cole_cod_mcpio_ubicacion = '{cod}' AND periodo >= '{PERIODO_MIN}' "
            f"AND periodo <= '{PERIODO_MAX}' AND punt_global is not null",
            "$group": "cole_cod_dane_establecimiento,cole_nombre_establecimiento",
            "$limit": 500,
        }
        url = URL_SABER11 + "?" + urllib.parse.urlencode(soql)
        try:
            data = fetch_json(url)
        except Exception as e:  # noqa: BLE001 — reportar y seguir con el resto de municipios
            print(f"  [ERROR] {nombre} ({cod}): {e}")
            errores.append(f"{nombre}: {e}")
            continue
        print(f"  {nombre}: {len(data)} colegios")
        for r in data:
            colegios.append(
                {
                    "cod_dane": r["cole_cod_dane_establecimiento"],
                    "nombre": r["cole_nombre_establecimiento"],
                    "municipio": nombre,
                    "n_evaluados": int(r["n_evaluados"]),
                    "punt_global_prom": round(float(r["prom"]), 1),
                }
            )
        time.sleep(0.3)

    # --- Sanity checks ---
    assert len(colegios) > 50, f"Muy pocos colegios agregados: {len(colegios)} (se esperaban >50)"
    municipios_con_dato = {c["municipio"] for c in colegios}
    print(f"  Sanity check OK: {len(colegios)} colegios en {len(municipios_con_dato)}/9 municipios")

    colegios.sort(key=lambda c: (c["municipio"], -c["punt_global_prom"]))

    out = {
        "_meta": {
            "fuente": "Instituto Colombiano para la Evaluación de la Educación (ICFES) — "
            "'Resultados Únicos Saber 11' (microdato individual por estudiante, ~7.1M filas; "
            "agregado remoto por colegio vía SoQL, no descargado completo)",
            "url": URL_SABER11,
            "filtro": f"cole_cod_mcpio_ubicacion in (9 códigos DANE de Urabá), periodo entre "
            f"{PERIODO_MIN} y {PERIODO_MAX} (2022-2024), punt_global no nulo",
            "fecha_consulta": HOY,
            "nota": "punt_global_prom = promedio simple del puntaje global Saber 11 de los "
            "estudiantes evaluados 2022-2024 en cada colegio (campo `punt_global`, texto en la "
            "fuente, convertido a número). n_evaluados = número de presentaciones individuales "
            "agregadas (un mismo estudiante puede presentar el examen más de una vez). Cruza con "
            "`cole_cod_dane_establecimiento` = mismo código DANE de establecimiento que usa "
            "`simat.geojson` (180 sedes) para vincular desempeño con presencia física.",
            "municipios_con_dato": sorted(municipios_con_dato),
            "municipios_sin_dato": sorted(set(MUNICIPIOS.values()) - municipios_con_dato),
            "errores": errores,
        },
        "colegios": colegios,
    }
    with open(BASE + "saber11_colegios.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("OK → saber11_colegios.json")


if __name__ == "__main__":
    main()
