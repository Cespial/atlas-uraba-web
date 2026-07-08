#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Ola 2 · P0 rendimiento — convierte las capas GeoJSON pesadas a PMTiles.
#
# Sigue el precedente de public/data/atlas.pmtiles (generator_options:
# "tippecanoe -z14 -Z9 -l manzanas -o atlas.pmtiles --force atlas.geojson").
# MapLibre `promoteId` en una fuente vector lee el valor de la propiedad al
# vuelo — NO requiere `--use-attribute-for-id` en tippecanoe — así que basta
# con preservar todos los atributos (comportamiento por defecto de tippecanoe)
# para que los `promoteId` ya usados en useAtlasMap.js (`_fid`, `cod_manzana`)
# sigan funcionando igual sobre la fuente vector.
#
# Rango de zoom por capa: -Z4 para las dos capas que hoy se pintan SIN
# minzoom en useAtlasMap.js (inundacion, clasificacion-suelo — deben verse
# desde el zoom mínimo global del mapa, 4); -Z9 para el resto, que ya
# arrancan en minzoom 9-10 en sus capas de pintado. -zg deja que tippecanoe
# elija el maxzoom óptimo por densidad de datos, con
# --extend-zooms-if-still-dropping si a ese maxzoom aún se descartan
# features y --drop-densest-as-needed para no romper el build con polígonos
# muy densos.
#
# Uso: scripts/build_pmtiles.sh
set -euo pipefail

cd "$(dirname "$0")/.."
DATA_DIR="public/data"

TIPPECANOE_FLAGS_COMUN=(--force --drop-densest-as-needed --extend-zooms-if-still-dropping -zg)

convertir() {
  local nombre_layer="$1" archivo_in="$2" archivo_out="$3" minzoom="$4"
  local ruta_in="$DATA_DIR/$archivo_in"
  local ruta_out="$DATA_DIR/$archivo_out"

  if [[ ! -f "$ruta_in" ]]; then
    echo "  [SKIP] $archivo_in no existe"
    return
  fi

  local bytes_in
  bytes_in=$(stat -f%z "$ruta_in" 2>/dev/null || stat -c%s "$ruta_in")

  tippecanoe -Z"$minzoom" "${TIPPECANOE_FLAGS_COMUN[@]}" -l "$nombre_layer" \
    -o "$ruta_out" "$ruta_in" 2>&1 | tail -3

  local bytes_out
  bytes_out=$(stat -f%z "$ruta_out" 2>/dev/null || stat -c%s "$ruta_out")
  printf '  %-28s %10d B  ->  %10d B  (%s)\n' \
    "$archivo_out" "$bytes_in" "$bytes_out" "$nombre_layer"
}

echo "=== Ola 2 · build_pmtiles.sh ==="
echo

echo "-- catastro_igac_uraba (P0, 16MB, minzoom 9) --"
convertir catastro catastro_igac_uraba.geojson catastro_igac_uraba.pmtiles 9

echo "-- atlas_enriquecido (11MB, alimenta 5 sub-capas v2, minzoom 9) --"
convertir enriquecido atlas_enriquecido.geojson atlas_enriquecido.pmtiles 9

echo "-- prioridad_inversion (7.2MB, minzoom 9) --"
convertir prioridad prioridad_inversion.geojson prioridad_inversion.pmtiles 9

echo "-- clasificacion_suelo (7.1MB, sin minzoom en capa -> minzoom 4) --"
convertir clasificacion clasificacion_suelo.geojson clasificacion_suelo.pmtiles 4

echo "-- aislamiento_manzanas (5.8MB, minzoom 9) --"
convertir aislamiento aislamiento_manzanas.geojson aislamiento_manzanas.pmtiles 9

echo "-- conflicto_uso_manzanas (5.4MB, minzoom 9) --"
convertir conflicto conflicto_uso_manzanas.geojson conflicto_uso_manzanas.pmtiles 9

echo "-- ideam_inundacion (4.4MB, sin minzoom en capa -> minzoom 4) --"
convertir inundacion ideam_inundacion.geojson ideam_inundacion.pmtiles 4

echo
echo "=== Resumen tamaños (GeoJSON vs PMTiles) ==="
for par in \
  "catastro_igac_uraba.geojson:catastro_igac_uraba.pmtiles" \
  "atlas_enriquecido.geojson:atlas_enriquecido.pmtiles" \
  "prioridad_inversion.geojson:prioridad_inversion.pmtiles" \
  "clasificacion_suelo.geojson:clasificacion_suelo.pmtiles" \
  "aislamiento_manzanas.geojson:aislamiento_manzanas.pmtiles" \
  "conflicto_uso_manzanas.geojson:conflicto_uso_manzanas.pmtiles" \
  "ideam_inundacion.geojson:ideam_inundacion.pmtiles"; do
  in="${par%%:*}"; out="${par##*:}"
  if [[ -f "$DATA_DIR/$in" && -f "$DATA_DIR/$out" ]]; then
    bin=$(stat -f%z "$DATA_DIR/$in" 2>/dev/null || stat -c%s "$DATA_DIR/$in")
    bout=$(stat -f%z "$DATA_DIR/$out" 2>/dev/null || stat -c%s "$DATA_DIR/$out")
    printf '%-32s %10d -> %10d  (%d%%)\n' "$in" "$bin" "$bout" $((bout * 100 / bin))
  fi
done
echo
echo "Listo. Los .geojson originales NO se borran (fallback + fuente de verdad)."
