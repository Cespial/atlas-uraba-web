#!/usr/bin/env python3
"""RUV — víctimas por hecho victimizante y municipio (Unidad para las Víctimas).

Genera public/data/ruv_victimas.json a partir del dataset Socrata
"Cifras de Víctimas por Hechos Municipal" (id 9qih-4vkc), dueño Unidad para
la Atención y Reparación Integral a las Víctimas (ver docs/investigacion/
2026-07-07/social-seguridad.md §3 y §13).

Limitación documentada por la propia fuente: el dataset Socrata **solo trae
información del año en curso** (actualización mensual), no serie histórica
2012-2025 — eso requeriría exportación manual del portal RNI
(cifras.unidadvictimas.gov.co), fuera de alcance de este script. Se captura
explícitamente en _meta.nota.

Nota de calidad de dato: el campo `hecho` del dataset trae variantes con
codificación corrupta (mojibake) para "Desaparición forzada", "Minas
Antipersonal..." y "Vinculación de Niños Niñas..." — se normalizan por
prefijo a su forma canónica antes de sumar.

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

URL_RUV = "https://www.datos.gov.co/resource/9qih-4vkc.json"

# Normalización por prefijo de las variantes con codificación corrupta
# observadas en el dataset (mismo hecho, distinto encoding según el registro).
PREFIJOS_CANONICOS = [
    ("Desaparici", "Desaparición forzada"),
    ("Minas Antipersonal", "Minas Antipersonal, Munición sin Explotar y Artefacto Explosivo improvisado"),
    ("Vinculaci", "Vinculación de Niños Niñas y Adolescentes a Actividades Relacionadas con grupos armados"),
]


def normalizar_hecho(h):
    for prefijo, canonico in PREFIJOS_CANONICOS:
        if h.startswith(prefijo):
            return canonico
    return h


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
    print("Descargando víctimas por hecho, municipio (Socrata 9qih-4vkc, Unidad Víctimas)...")
    codigos = ",".join(f"'{c}'" for c in MUNICIPIOS)
    soql = {
        "$select": "ciudad_municipio,cod_ciudad_muni,hecho,sum(per_ocu) as personas",
        "$where": f"cod_ciudad_muni in({codigos})",
        "$group": "ciudad_municipio,cod_ciudad_muni,hecho",
        "$order": "hecho,ciudad_municipio",
        "$limit": 2000,
    }
    url = URL_RUV + "?" + urllib.parse.urlencode(soql)
    data = fetch_json(url)
    print(f"  OK, {len(data)} filas municipio×hecho (crudas, antes de normalizar)")

    municipios_ruv = {nombre: {} for nombre in MUNICIPIOS.values()}
    for r in data:
        cod = str(r["cod_ciudad_muni"]).zfill(5)
        if cod not in MUNICIPIOS:
            continue
        nombre = MUNICIPIOS[cod]
        hecho = normalizar_hecho(r["hecho"])
        personas = int(round(float(r.get("personas") or 0)))
        municipios_ruv[nombre][hecho] = municipios_ruv[nombre].get(hecho, 0) + personas

    out_municipios = {}
    for nombre, hechos in municipios_ruv.items():
        total = sum(hechos.values())
        out_municipios[nombre] = {
            "hechos": dict(sorted(hechos.items(), key=lambda kv: -kv[1])),
            "total": total,
        }

    # --- Sanity checks ---
    for nombre in MUNICIPIOS.values():
        assert out_municipios[nombre]["hechos"], f"{nombre}: sin hechos registrados"
    assert out_municipios["Turbo"]["hechos"].get("Desplazamiento forzado", 0) > 0, (
        "Turbo debería tener desplazamiento forzado > 0"
    )
    hechos_totales = sorted({h for m in out_municipios.values() for h in m["hechos"]})
    assert len(hechos_totales) >= 10, f"Muy pocos tipos de hecho distintos: {len(hechos_totales)}"
    print(f"  Sanity check OK: {len(hechos_totales)} tipos de hecho distintos tras normalizar")

    out = {
        "_meta": {
            "fuente": "Unidad Administrativa Especial para la Atención y Reparación Integral a "
            "las Víctimas (Unidad para las Víctimas) — dataset 'Cifras de Víctimas por Hechos "
            "Municipal'",
            "url": URL_RUV,
            "consulta": soql["$select"] + " WHERE " + soql["$where"] + " GROUP BY " + soql["$group"],
            "fecha_consulta": HOY,
            "nota": "El dataset Socrata 9qih-4vkc SOLO contiene información del año en curso "
            "(actualización mensual, según la propia descripción del dataset) — NO es una serie "
            "histórica 2012-2025. Los conteos (`personas` = suma de per_ocu, personas por "
            "ocurrencia) reflejan el corte vigente al momento de esta consulta, no el acumulado "
            "histórico completo del conflicto en cada municipio. Para serie histórica se requiere "
            "exportación manual del portal RNI (cifras.unidadvictimas.gov.co), fuera de alcance "
            "de este pipeline automatizado. El campo `hecho` traía variantes con codificación "
            "corrupta para 'Desaparición forzada', 'Minas Antipersonal...' y 'Vinculación de "
            "Niños Niñas...' — se normalizaron por prefijo antes de sumar. Un mismo hecho puede "
            "involucrar a la misma persona más de una vez (declaraciones múltiples), por lo que "
            "`total` no equivale a 'víctimas únicas' sino a la suma de eventos declarados por "
            "tipo de hecho.",
            "hechos_catalogados": hechos_totales,
        },
        "municipios": out_municipios,
    }
    with open(BASE + "ruv_victimas.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("OK → ruv_victimas.json")


if __name__ == "__main__":
    main()
