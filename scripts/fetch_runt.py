#!/usr/bin/env python3
"""RUNT — parque automotor por municipio (motorización), Antioquia/Urabá.

Genera public/data/runt_municipios.json a partir del dataset Socrata
"CRECIMIENTO DEL PARQUE AUTOMOTOR RUNT2.0" (id u3vn-bdcy), filtrado por
departamento Antioquia y los 9 municipios de Urabá (ver
docs/investigacion/2026-07-07/datos-institucionales.md §10).

Limitaciones documentadas en el dossier, capturadas en _meta.nota:
  - `fecha_de_registro` trae valores sospechosos tipo placeholder ("1900",
    "1946") — NO se usa para antigüedad del parque, solo se agrega
    `cantidad` por clase/servicio.
  - El dataset solo tiene registros para 5 de los 9 municipios de Urabá
    (Apartadó, Carepa, Chigorodó, Necoclí, Turbo) — Arboletes, Mutatá, San
    Juan de Urabá y San Pedro de Urabá no tienen ningún registro (verificado
    con LIKE amplio, no es un problema de nombre/tilde).

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

# Nombre tal como lo trae el dataset RUNT (mayúsculas, sin tilde) -> canónico del atlas.
NOMBRES_RUNT = {
    "APARTADO": "Apartadó",
    "ARBOLETES": "Arboletes",
    "CAREPA": "Carepa",
    "CHIGORODO": "Chigorodó",
    "MUTATA": "Mutatá",
    "NECOCLI": "Necoclí",
    "SAN JUAN DE URABA": "San Juan de Urabá",
    "SAN PEDRO DE URABA": "San Pedro de Urabá",
    "TURBO": "Turbo",
}

URL_RUNT = "https://www.datos.gov.co/resource/u3vn-bdcy.json"


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


def main():
    print("Descargando parque automotor RUNT (Socrata u3vn-bdcy)...")
    municipios_soql = ",".join(f"'{n}'" for n in NOMBRES_RUNT)
    soql = {
        "$select": "nombre_municipio,nombre_servicio,nombre_de_la_clase,"
        "estado_del_vehiculo,sum(cantidad) as total",
        "$where": f"upper(nombre_departamento)='ANTIOQUIA' AND upper(nombre_municipio) "
        f"in({municipios_soql})",
        "$group": "nombre_municipio,nombre_servicio,nombre_de_la_clase,estado_del_vehiculo",
        "$limit": 2000,
    }
    url = URL_RUNT + "?" + urllib.parse.urlencode(soql)
    data = fetch_json(url)
    print(f"  OK, {len(data)} filas crudas")

    municipios_runt = {nombre: {"por_clase": {}, "por_servicio": {}, "total": 0} for nombre in MUNICIPIOS.values()}
    for r in data:
        nombre_runt = r["nombre_municipio"]
        nombre = NOMBRES_RUNT.get(nombre_runt)
        if nombre is None:
            continue
        if r.get("estado_del_vehiculo") != "ACTIVO":
            continue
        cantidad = int(float(r["total"]))
        clase = r["nombre_de_la_clase"]
        servicio = r["nombre_servicio"]
        m = municipios_runt[nombre]
        m["por_clase"][clase] = m["por_clase"].get(clase, 0) + cantidad
        m["por_servicio"][servicio] = m["por_servicio"].get(servicio, 0) + cantidad
        m["total"] += cantidad

    for nombre, m in municipios_runt.items():
        m["por_clase"] = dict(sorted(m["por_clase"].items(), key=lambda kv: -kv[1]))
        m["por_servicio"] = dict(sorted(m["por_servicio"].items(), key=lambda kv: -kv[1]))

    con_datos = sorted(n for n, m in municipios_runt.items() if m["total"] > 0)
    sin_datos = sorted(n for n, m in municipios_runt.items() if m["total"] == 0)

    # --- Sanity checks ---
    assert set(con_datos) == {"Apartadó", "Carepa", "Chigorodó", "Necoclí", "Turbo"}, (
        f"Cobertura de municipios distinta a la documentada en el dossier: {con_datos}"
    )
    assert municipios_runt["Apartadó"]["total"] > 0, "Apartadó sin vehículos activos"
    print(f"  Sanity check OK: {len(con_datos)}/9 municipios con registro RUNT ({con_datos})")

    out = {
        "_meta": {
            "fuente": "RUNT 2.0 — 'CRECIMIENTO DEL PARQUE AUTOMOTOR RUNT2.0'",
            "url": URL_RUNT,
            "consulta": "nombre_departamento='ANTIOQUIA' AND nombre_municipio IN (9 municipios "
            "de Urabá), estado_del_vehiculo='ACTIVO', agregado por municipio/clase/servicio",
            "fecha_consulta": HOY,
            "nota": "El dataset solo tiene registros para 5 de los 9 municipios de Urabá "
            "(Apartadó, Carepa, Chigorodó, Necoclí, Turbo) — Arboletes, Mutatá, San Juan de Urabá "
            "y San Pedro de Urabá no aparecen en absoluto (verificado con LIKE amplio sobre el "
            "nombre, no es un problema de tilde/mayúsculas); probablemente porque esos municipios "
            "no tienen oficina de tránsito propia y sus vehículos quedan registrados en el "
            "municipio donde sí la hay. NO usar `fecha_de_registro` para antigüedad del parque: "
            "trae valores placeholder sospechosos ('1900', '1946') en varios registros — este "
            "pipeline solo agrega `cantidad` por clase/servicio, sin tocar esa columna.",
            "municipios_con_dato": con_datos,
            "municipios_sin_dato": sin_datos,
        },
        "municipios": municipios_runt,
    }
    with open(BASE + "runt_municipios.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("OK → runt_municipios.json")


if __name__ == "__main__":
    main()


