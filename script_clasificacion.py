#!/usr/bin/env python3
"""
Clasificación del Suelo - Atlas Urabá
Genera clasificacion_suelo.geojson cruzando las capas existentes del Atlas.

Nota metodológica sobre IDEAM:
Los polígonos de ideam_inundacion.geojson son zonas de alerta hidrológica
a nivel de subzona hidrográfica (SZH/NSS), cubriendo el 99.5% del área del
Atlas. Para derivar riesgo real de inundación se cruzan SOLO los polígonos
de Alerta Roja con manzanas de bajo desempeño (atlas_score < 0.4),
excluyendo las zonas ya marcadas como protección ambiental.

Prioridad de clasificación: protección > riesgo > rural > urbano
"""

import geopandas as gpd
import pandas as pd
import numpy as np
from shapely.ops import unary_union
import warnings
import os
warnings.filterwarnings('ignore')

DATA_DIR = "/Users/cristianespinal/atlas-uraba-web/public/data"
OUTPUT   = f"{DATA_DIR}/clasificacion_suelo.geojson"

print("=" * 60)
print("CLASIFICACIÓN DEL SUELO - ATLAS URABÁ")
print("=" * 60)

# ── 1. Cargar capa base ─────────────────────────────────────────
print("\n[1/7] Cargando atlas.geojson...")
atlas = gpd.read_file(f"{DATA_DIR}/atlas.geojson")
print(f"  → {len(atlas)} manzanas | CRS: {atlas.crs}")

# ── 2. Cargar capas de soporte ──────────────────────────────────
print("\n[2/7] Cargando capas de soporte...")
sipra      = gpd.read_file(f"{DATA_DIR}/sipra.geojson")
fincas     = gpd.read_file(f"{DATA_DIR}/fincas.geojson")
manglares  = gpd.read_file(f"{DATA_DIR}/manglares_uraba.geojson")
inundacion = gpd.read_file(f"{DATA_DIR}/ideam_inundacion.geojson")
waterways  = gpd.read_file(f"{DATA_DIR}/waterways.geojson")

print(f"  sipra:      {len(sipra)} polígonos")
print(f"  fincas:     {len(fincas)} polígonos")
print(f"  manglares:  {len(manglares)} polígonos")
print(f"  inundación: {len(inundacion)} subzonas IDEAM")
print(f"  waterways:  {len(waterways)} ríos/quebradas")

# ── 3. Reproyectar a métrico ────────────────────────────────────
print("\n[3/7] Reproyectando a EPSG:9377 para operaciones métricas...")
CRS_M = "EPSG:9377"
atlas_m      = atlas.to_crs(CRS_M)
sipra_m      = sipra.to_crs(CRS_M)
fincas_m     = fincas.to_crs(CRS_M)
manglares_m  = manglares.to_crs(CRS_M)
inundacion_m = inundacion.to_crs(CRS_M)
waterways_m  = waterways.to_crs(CRS_M)

def safe_union(geom_series):
    """Unión robusta: corrige geometrías inválidas con buffer(0) antes de unir."""
    fixed = geom_series.apply(lambda g: g.buffer(0) if not g.is_valid else g)
    return unary_union(fixed)

# ── 4. Construir zonas temáticas ────────────────────────────────
print("\n[4/7] Construyendo zonas temáticas...")

# 4a. Protección: manglares + buffer 200m sobre ríos
manglares_u  = safe_union(manglares_m.geometry)
ww_buf200    = waterways_m.geometry.buffer(200)   # GeoSeries, no GeoDataFrame
ww_buf200_u  = safe_union(ww_buf200)
proteccion_u = manglares_u.union(ww_buf200_u)
print(f"  → Protección ambiental (manglares + buffer 200m ríos): lista")

# 4b. Riesgo/Restricción:
#     IDEAM Alerta Roja (cuencas en alerta crítica)
#     Nota: las subzonas IDEAM cubren todo el territorio;
#     el riesgo efectivo se filtra por atlas_score < 0.4
#     (manzanas con baja resiliencia + ubicadas en zona de alerta roja)
roja_m  = inundacion_m[inundacion_m['alerta_actual'] == 'Roja']
roja_u  = safe_union(roja_m.geometry)
print(f"  → Zona IDEAM Roja (alerta hidrológica): {len(roja_m)} subzonas")

# 4c. Rural productivo: fincas bananeras ∪ SIPRA aptitud alta
sipra_alta = sipra_m[sipra_m['aptitud'] == 'Aptitud alta']
fincas_u   = safe_union(fincas_m.geometry)
if len(sipra_alta) > 0:
    sipra_u = safe_union(sipra_alta.geometry)
    rural_u = fincas_u.union(sipra_u)
    print(f"  → Rural productivo (fincas + SIPRA alta, {len(sipra_alta)} polígonos): listo")
else:
    rural_u = fincas_u
    print(f"  → Rural productivo (solo fincas): listo")

# ── 5. Evaluar intersecciones por manzana ──────────────────────
print("\n[5/7] Evaluando intersecciones espaciales...")

ag  = atlas_m['geometry']
sa  = atlas['score_accesibilidad']    # proxy urbanización (en atlas, no atlas_m)
asc = atlas['atlas_score']

# Flags espaciales (sin filtro de prioridad aún)
flag_prot_raw  = ag.intersects(proteccion_u)
flag_roja_raw  = ag.intersects(roja_u)
flag_rural_raw = ag.intersects(rural_u)

# Aplicar jerarquía para flags finales
flag_prot   = flag_prot_raw
# Riesgo: IDEAM Roja + baja capacidad adaptativa (score < 0.4) + no en protección + no rural
flag_riesgo = flag_roja_raw & (asc < 0.4) & ~flag_prot & ~flag_rural_raw
# Rural: intersecta fincas/SIPRA alta + no en protección
flag_rural  = flag_rural_raw & ~flag_prot

print(f"  → Protección ambiental:   {flag_prot.sum():>5} manzanas")
print(f"  → Riesgo/Restricción:     {flag_riesgo.sum():>5} manzanas "
      f"(IDEAM Roja + atlas_score < 0.4)")
print(f"  → Rural productivo:       {flag_rural.sum():>5} manzanas")

# ── 6. Clasificar ──────────────────────────────────────────────
print("\n[6/7] Clasificando con reglas de prioridad...")

clasificacion = pd.Series("", index=atlas.index, dtype=str)
color         = pd.Series("", index=atlas.index, dtype=str)

# Prioridad baja → alta (las altas sobreescriben)

# Urbano consolidado: score_acc > 0.7 Y atlas_score > 0.5
mask_urb_c = (sa > 0.7) & (asc > 0.5)
clasificacion[mask_urb_c] = "Urbano consolidado"
color[mask_urb_c]         = "#C62828"

# Urbano en desarrollo: score_acc 0.4–0.7
mask_urb_d = (sa >= 0.4) & (sa <= 0.7)
clasificacion[mask_urb_d] = "Urbano en desarrollo"
color[mask_urb_d]         = "#FF8F00"

# Periurbano/Expansión: score_acc < 0.4 (residual no-urbano)
mask_peri = sa < 0.4
clasificacion[mask_peri] = "Periurbano/Expansión"
color[mask_peri]         = "#FDD835"

# Rural productivo (prioridad sobre urbano)
clasificacion[flag_rural] = "Suelo rural productivo"
color[flag_rural]         = "#795548"

# Riesgo/Restricción (prioridad sobre urbano y rural)
clasificacion[flag_riesgo] = "Riesgo/Restricción"
color[flag_riesgo]         = "#EF5350"

# Protección ambiental (máxima prioridad)
clasificacion[flag_prot] = "Protección ambiental"
color[flag_prot]         = "#2E7D32"

# Residuales sin clasificar → Periurbano
sin_cls = clasificacion == ""
if sin_cls.sum() > 0:
    clasificacion[sin_cls] = "Periurbano/Expansión"
    color[sin_cls]         = "#FDD835"

# ── 7. Exportar GeoJSON ─────────────────────────────────────────
print("\n[7/7] Guardando clasificacion_suelo.geojson...")

resultado = atlas.copy()
resultado['clasificacion_suelo'] = clasificacion.values
resultado['color_suelo']         = color.values

resultado = resultado[[
    'cod_manzana', 'municipio', 'atlas_score',
    'zona_atlas', 'quintil',
    'score_accesibilidad', 'score_ambiental',
    'score_socioeconomico', 'score_seguridad',
    'clasificacion_suelo', 'color_suelo',
    'geometry'
]]

resultado.to_file(OUTPUT, driver="GeoJSON")

# ── Reporte ─────────────────────────────────────────────────────
size_kb = os.path.getsize(OUTPUT) / 1024

print("\n" + "=" * 60)
print("REPORTE FINAL")
print("=" * 60)
print(f"Archivo:          {OUTPUT}")
print(f"Tamaño:           {size_kb:.1f} KB  ({size_kb/1024:.2f} MB)")
print(f"Features totales: {len(resultado)}")
print()
print("Distribución por clasificación:")
print("-" * 58)
dist = resultado['clasificacion_suelo'].value_counts()
for cls, cnt in dist.items():
    pct = cnt / len(resultado) * 100
    col = resultado[resultado['clasificacion_suelo'] == cls]['color_suelo'].iloc[0]
    print(f"  {cls:<30} {cnt:>5}  ({pct:5.1f}%)  {col}")

print()
print("Notas metodológicas:")
print("  - score_accesibilidad usada como proxy de dim_accesibilidad")
print("    (campo 'dim_accesibilidad' no existe en atlas.geojson)")
print("  - IDEAM zonas son subzonas hidrológicas (nivel cuenca);")
print("    Riesgo se filtra con atlas_score < 0.4 para precisión.")
print("  - Prioridad aplicada: protección > riesgo > rural > urbano")
print()
print("Clasificación completada exitosamente.")
