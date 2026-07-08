#!/usr/bin/env python3
"""Delitos sexuales — reporte por municipio-año (Gobernación de Antioquia).

Genera public/data/delitos_municipios.json a partir del dataset Socrata
"Reporte de delitos sexuales... Antioquia" (id 2u9p-fa2g, republica datos de
Policía Nacional/SIEDCO), tasado por 100k habitantes con
poblacion_municipios.json (mismo patrón que seguridad_municipios.json — ver
docs/investigacion/2026-07-07/social-seguridad.md §1.2/§13 y verificación
adversarial hallazgo 11).

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

URL_DELITOS = "https://www.datos.gov.co/resource/2u9p-fa2g.json"

ANIO_MIN = "2018"


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


def cargar_poblacion():
    with open(BASE + "poblacion_municipios.json") as fh:
        return json.load(fh)["municipios"]


def main():
    poblacion = cargar_poblacion()

    print("Descargando delitos sexuales por municipio-año (Socrata 2u9p-fa2g, Gob. Antioquia)...")
    municipios_delitos = {nombre: {} for nombre in MUNICIPIOS.values()}
    errores = []
    for cod, nombre in MUNICIPIOS.items():
        soql = {
            "$select": "municipio,substring(fecha_hecho,7,4) as anio,count(*) as n",
            "$where": f"codigo_dane like '{cod}%' AND substring(fecha_hecho,7,4) >= '{ANIO_MIN}'",
            "$group": "municipio,anio",
            "$order": "anio",
            "$limit": 200,
        }
        url = URL_DELITOS + "?" + urllib.parse.urlencode(soql)
        try:
            data = fetch_json(url)
        except Exception as e:  # noqa: BLE001
            print(f"  [ERROR] {nombre} ({cod}): {e}")
            errores.append(f"{nombre}: {e}")
            continue
        print(f"  {nombre}: {len(data)} filas año")
        for r in data:
            anio = r["anio"]
            n = int(r["n"])
            pob = poblacion.get(nombre, {}).get(anio)
            tasa = round(n / pob * 100000, 1) if pob else None
            prev = municipios_delitos[nombre].get(anio, {"delitos_sexuales": 0, "tasa_100k": None})
            total_n = prev["delitos_sexuales"] + n
            municipios_delitos[nombre][anio] = {
                "delitos_sexuales": total_n,
                "tasa_100k": round(total_n / pob * 100000, 1) if pob else None,
            }
        time.sleep(0.3)

    # --- Sanity checks ---
    con_datos = [n for n, serie in municipios_delitos.items() if serie]
    assert len(con_datos) >= 8, f"Muy pocos municipios con datos: {con_datos}"
    anios_totales = sorted({a for serie in municipios_delitos.values() for a in serie})
    assert anios_totales and anios_totales[0] >= ANIO_MIN, f"Años fuera de rango: {anios_totales}"
    print(f"  Sanity check OK: {len(con_datos)}/9 municipios, años {anios_totales[0]}-{anios_totales[-1]}")

    out = {
        "_meta": {
            "fuente": "Gobernación de Antioquia (republica datos SIEDCO de Policía Nacional) — "
            "'Reporte de delitos sexuales' departamental",
            "url": URL_DELITOS,
            "consulta": "codigo_dane LIKE '<5 dígitos DANE>%' AND año(fecha_hecho) >= 2018, "
            "agrupado por municipio-año",
            "fecha_consulta": HOY,
            "nota": "Hechos reportados a autoridad (denuncia/investigación), no el total real de "
            "casos — mismo principio de subregistro que aplica a seguridad_municipios.json. "
            "`codigo_dane` en la fuente usa 8 dígitos (5 DIVIPOLA + 3 de corregimiento/comuna); "
            "se agregan todas las sub-ubicaciones de cada municipio con LIKE 'XXXXX%'. El año más "
            "reciente puede estar incompleto por rezago administrativo de reporte. "
            "tasa_100k = delitos_sexuales / población (proyección DANE del mismo año) × 100.000.",
            "anios_disponibles": anios_totales,
            "municipios_con_dato": sorted(con_datos),
            "errores": errores,
        },
        "municipios": municipios_delitos,
    }
    with open(BASE + "delitos_municipios.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("OK → delitos_municipios.json")


if __name__ == "__main__":
    main()
