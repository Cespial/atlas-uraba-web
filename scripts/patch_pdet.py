#!/usr/bin/env python3
"""Corrección PDET — agrega es_pdet a public/data/municipios.geojson.

La subregión PDET "Urabá Antioqueño" oficial (Decreto 893/2017,
MunicipiosPDET.xlsx del gobierno, ver docs/investigacion/2026-07-07/
social-seguridad.md e INFORME.md §1 "Bloqueante de integridad") es:
Apartadó, Carepa, Chigorodó, Dabeiba, Mutatá, Necoclí, San Pedro de Urabá,
Turbo. Dabeiba NO está en el geojson del atlas (se ignora). Arboletes y
San Juan de Urabá NO son PDET pese a estar dentro de los 9 municipios que
cubre el atlas.

Solo librería estándar. Idempotente: puede correrse varias veces.
"""
import json
import os
import unicodedata

BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data"))
GEOJSON_PATH = os.path.join(BASE, "municipios.geojson")

# Composición oficial PDET "Urabá Antioqueño" (Decreto 893/2017).
# Dabeiba se incluye por completitud normativa aunque no esté en el geojson.
PDET_OFICIAL = {
    "APARTADO",
    "CAREPA",
    "CHIGORODO",
    "DABEIBA",
    "MUTATA",
    "NECOCLI",
    "SAN PEDRO DE URABA",
    "TURBO",
}


def normaliza(nombre):
    """Mayúsculas sin tildes, para comparar sin depender de codificación."""
    nfkd = unicodedata.normalize("NFKD", nombre.upper())
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip()


def main():
    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    cambios = []
    for feature in geojson["features"]:
        props = feature["properties"]
        nombre = props.get("municipio", "")
        es_pdet = normaliza(nombre) in PDET_OFICIAL
        props["es_pdet"] = es_pdet
        cambios.append((nombre, es_pdet))

    # Se preserva el formato compacto original (una sola línea, sin espacios
    # extra) para no inflar el peso del archivo servido en producción.
    with open(GEOJSON_PATH, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, separators=(",", ":"))

    for nombre, es_pdet in sorted(cambios):
        print(f"{'PDET' if es_pdet else 'no PDET':8} · {nombre}")

    # Auto-verificación: Arboletes y San Juan de Urabá NO deben quedar como PDET.
    no_pdet_esperado = {"ARBOLETES", "SAN JUAN DE URABA"}
    for nombre, es_pdet in cambios:
        if normaliza(nombre) in no_pdet_esperado:
            assert not es_pdet, f"{nombre} no debería ser PDET (Decreto 893/2017)"
    print("\nOK: Arboletes y San Juan de Urabá quedaron marcados como NO PDET.")


if __name__ == "__main__":
    main()
