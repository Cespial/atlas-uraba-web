#!/usr/bin/env python3
"""Catálogo de capas — inventaria public/data/*.{json,geojson,csv,pmtiles}.

Genera public/data/catalogo_capas.json con, por archivo: nombre, tamaño,
tipo, fuente (lee _meta.fuente / _meta.fuente si el JSON la trae), fecha de
generación si existe, y — para las capas que sí se pintan en el mapa — el
label/tema del LayerPanel y el estado real/proxy que ya conoce
admin_data_status.json.

Solo librería estándar. Idempotente: puede correrse varias veces.

Mantenimiento: LAYERPANEL_CAPAS y ARCHIVO_A_CAPA duplican a mano el mapeo
real de app/components/LayerPanel.vue (temas/capas) y
app/composables/useAtlasMap.js (qué archivo alimenta cada `addSource`). Un
parser real de un .vue de 500+ líneas con sintaxis JS libre es frágil y
menos mantenible que esta tabla explícita — si se agrega una capa nueva al
mapa, hay que agregar su fila aquí también (el CI/QA de /metodologia no
falla si no se hace, pero la capa saldría del catálogo sin match).
"""
import json
import os
import datetime

BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data"))
OUT_PATH = os.path.join(BASE, "catalogo_capas.json")

# ── 1. Temas/capas del LayerPanel (id → label, desc, tema) ─────────────
# Copiado a mano de app/components/LayerPanel.vue `temas` (2026-07-08).
LAYERPANEL_CAPAS = {
    'veredas':    {'label': 'Veredas', 'desc': '611 límites veredales', 'tema': 'Territorio base'},
    'municipios': {'label': 'Municipios', 'desc': '9 municipios con scores', 'tema': 'Territorio base'},
    'waterways':  {'label': 'Ríos y ciénagas', 'desc': 'Red hídrica Urabá', 'tema': 'Territorio base'},
    'roads':      {'label': 'Red vial', 'desc': 'Carreteras principales', 'tema': 'Territorio base'},
    'infraestructura': {'label': 'Puerto Antioquia', 'desc': 'Operativo feb 2026 · BID Invest', 'tema': 'Infraestructura'},
    'tic':        {'label': 'Cobertura 4G', 'desc': 'MinTIC 2023 por municipio', 'tema': 'Infraestructura'},
    'eva-banano': {'label': 'Producción banano', 'desc': 'EVA MADR 2019-2024 · ha sembradas', 'tema': 'Agricultura'},
    'sipra':      {'label': 'Aptitud bananera', 'desc': 'SIPRA UPRA · zonificación', 'tema': 'Agricultura'},
    'sipra-excl': {'label': 'Zonas de exclusión', 'desc': 'Restricciones legales de siembra', 'tema': 'Agricultura'},
    'fincas':     {'label': 'Fincas bananeras', 'desc': '402 fincas georeferenciadas', 'tema': 'Agricultura'},
    'manglares':  {'label': 'Manglares', 'desc': 'Pendiente: Global Mangrove Watch 2020', 'tema': 'Medio ambiente'},
    'carbono':    {'label': 'Carbono en bosques', 'desc': '62.5 MtCO₂ · GFW 2020', 'tema': 'Medio ambiente'},
    'agua':       {'label': 'Calidad del agua', 'desc': 'Pendiente: Corpourabá / IDEAM SIRH', 'tema': 'Medio ambiente'},
    'deforestacion': {'label': 'Deforestación', 'desc': 'Alertas SMByC · rojo=pérdida', 'tema': 'Medio ambiente'},
    'runap':      {'label': 'Áreas protegidas', 'desc': '23 áreas RUNAP · Parques Nacionales', 'tema': 'Medio ambiente'},
    'nbi':        {'label': 'Pobreza (NBI)', 'desc': 'Necesidades básicas insatisfechas', 'tema': 'Gestión social'},
    'terridata-full': {'label': 'NBI TerriData DNP', 'desc': '9 municipios · NBI total CNPV 2018 · 30 indicadores', 'tema': 'Gestión social'},
    'sui-servicios': {'label': 'Cobertura acueducto', 'desc': 'SUI Superservicios · acueducto/alcantarillado/aseo', 'tema': 'Gestión social'},
    'uariv':      {'label': 'Desplazamiento', 'desc': 'UARIV · expulsados por municipio', 'tema': 'Gestión social'},
    'resguardos-ant': {'label': 'Resguardos indígenas', 'desc': '20 resguardos · ANT oficial Embera/Tule', 'tema': 'Gestión social'},
    'zomac':      {'label': 'ZOMAC', 'desc': '7 municipios · beneficios tributarios', 'tema': 'Gestión social'},
    'reps':       {'label': 'Salud (prestadores)', 'desc': '339 IPS geocodificadas · REPS', 'tema': 'Gestión social'},
    'simat':      {'label': 'Colegios', 'desc': '180 establecimientos · SIMAT', 'tema': 'Gestión social'},
    'epidemiologia': {'label': 'Enf. tropicales', 'desc': 'Dengue, malaria · SIVIGILA', 'tema': 'Gestión social'},
    'irca':       {'label': 'Calidad de agua (IRCA)', 'desc': 'INS — SIVICAP · 2024 · 9 municipios', 'tema': 'Gestión social'},
    'seguridad':  {'label': 'Homicidios (tasa 100k)', 'desc': 'hechos reportados · SIEDCO/MinDefensa · 2024', 'tema': 'Seguridad'},
    'inundacion': {'label': 'Zonas inundables', 'desc': 'IDEAM TR50 · período retorno 50 años', 'tema': 'Riesgo territorial'},
    'enriquecido-atlas-v2': {'label': 'Atlas Score v2', 'desc': 'Índice compuesto con GHSL + NDVI · 7.028 manzanas', 'tema': 'Indicadores v2'},
    'enriquecido-accesibilidad-v2': {'label': 'Accesibilidad v2', 'desc': 'Densidad GHSL + distancia a equipamientos', 'tema': 'Indicadores v2'},
    'enriquecido-ndvi': {'label': 'Vegetación NDVI', 'desc': 'Sentinel-2 · índice verde normalizado 2023', 'tema': 'Indicadores v2'},
    'enriquecido-ambiental-v2': {'label': 'Ambiental v2', 'desc': 'NDVI + cobertura vegetal + riesgo hídrico', 'tema': 'Indicadores v2'},
    'enriquecido-impermeabilizacion': {'label': 'Impermeabilización', 'desc': 'GHSL · superficie construida por manzana', 'tema': 'Indicadores v2'},
    'red-vial':   {'label': 'Red vial primaria', 'desc': '344 seg · trunk/primary/secondary · OSM + INVÍAS', 'tema': 'Transporte y conectividad'},
    'red-vial-invias': {'label': 'Red Vial Nacional INVÍAS', 'desc': '11 troncales/transversales · OpenData INVÍAS', 'tema': 'Transporte y conectividad'},
    'aislamiento': {'label': 'Índice aislamiento', 'desc': 'Conectividad compuesta por manzana · 4 niveles', 'tema': 'Transporte y conectividad'},
    'conflicto-uso': {'label': 'Conflicto de uso suelo', 'desc': '4.197 manzanas zona exclusión · 121 fincas conflicto', 'tema': 'Conflicto de uso'},
    'corpouraba-agua': {'label': 'Concesiones agua', 'desc': '371 concesiones subterráneas · CORPOURABÁ', 'tema': 'Conflicto de uso'},
    'prioridad-inversion': {'label': 'Prioridad de inversión', 'desc': '4 niveles · Crítica→Baja · 7.028 manzanas', 'tema': 'Ordenamiento territorial'},
    'catastro':   {'label': 'Catastro urbano', 'desc': '5.468 manzanas · predios · GeoAntioquia LADM-COL', 'tema': 'Ordenamiento territorial'},
    'clasificacion-suelo': {'label': 'Clasificación del suelo', 'desc': '7.028 manzanas CNPV · 6 categorías derivadas', 'tema': 'Ordenamiento territorial'},
    'zonas-funcionales': {'label': 'Zonas funcionales', 'desc': '9 municipios · clasificación por dimensiones', 'tema': 'Ordenamiento territorial'},
    'osm-landuse': {'label': 'Usos del suelo OSM', 'desc': '335 polígonos trazados · orchard, residencial, bosque', 'tema': 'Ordenamiento territorial'},
    'equipamientos': {'label': 'Equipamientos', 'desc': '1.117 puntos · salud, educación, culto', 'tema': 'Ordenamiento territorial'},
}

# ── 2. Archivo (basename sin extensión, o con) → id de capa ────────────
# Copiado a mano de app/composables/useAtlasMap.js `addSource(...)`.
ARCHIVO_A_CAPA = {
    'reps.geojson': 'reps',
    'simat.geojson': 'simat',
    'sipra.geojson': 'sipra',
    'sipra_exclusion.geojson': 'sipra-excl',
    'fincas.geojson': 'fincas',
    'waterways.geojson': 'waterways',
    'roads.geojson': 'roads',
    'uariv_desplazamiento.geojson': 'uariv',
    'manglares_uraba.geojson': 'manglares',
    'gfw_carbono_bosques.geojson': 'carbono',
    'calidad_agua_uraba.geojson': 'agua',
    'tic_cobertura.geojson': 'tic',
    'sivigila_epidemiologia.geojson': 'epidemiologia',
    'infraestructura.geojson': 'infraestructura',
    'eva_agro.geojson': 'eva-banano',
    'ideam_inundacion.geojson': 'inundacion',
    'smbyc_deforestacion_uraba.geojson': 'deforestacion',
    'resguardos_indigenas.geojson': None,  # reemplazado por resguardos_ant
    'clasificacion_suelo.geojson': 'clasificacion-suelo',
    'prioridad_inversion.geojson': 'prioridad-inversion',
    'zonas_funcionales.geojson': 'zonas-funcionales',
    'osm_landuse.geojson': 'osm-landuse',
    'equipamientos.geojson': 'equipamientos',
    'zomac_uraba.geojson': 'zomac',
    'red_vial_primaria.geojson': 'red-vial',
    'corpouraba_agua.geojson': 'corpouraba-agua',
    'aislamiento_manzanas.geojson': 'aislamiento',
    'conflicto_uso_manzanas.geojson': 'conflicto-uso',
    'atlas_enriquecido.geojson': 'enriquecido-atlas-v2',
    'catastro_igac_uraba.geojson': 'catastro',
    'red_vial_invias.geojson': 'red-vial-invias',
    'sui_servicios.geojson': 'sui-servicios',
    'terridata_full.geojson': 'terridata-full',
    'resguardos_ant.geojson': 'resguardos-ant',
    'runap_areas.geojson': 'runap',
    'irca_municipios.json': 'irca',
    'seguridad_municipios.json': 'seguridad',
    'municipios.geojson': 'municipios',
    'veredas.geojson': 'veredas',
    'atlas.geojson': None,  # capa base v1, sin id propio en LayerPanel
}

TIPOS_EXT = {'.json': 'json', '.geojson': 'geojson', '.csv': 'csv', '.pmtiles': 'pmtiles'}


def humanize_size(n):
    for unidad in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f"{n:.1f} {unidad}" if unidad != 'B' else f"{n} {unidad}"
        n /= 1024
    return f"{n:.1f} TB"


def leer_meta_json(path):
    """Lee _meta (o meta) de un JSON/GeoJSON sin cargar geometrías completas si es posible.
    Fail-quiet: si no parsea o no hay _meta, retorna {}."""
    try:
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
    except Exception:
        return {}
    if not isinstance(data, dict):
        return {}
    meta = data.get('_meta') or data.get('meta') or {}
    if not isinstance(meta, dict):
        return {}
    return meta


def extraer_fuente_y_fecha(meta):
    fuente = meta.get('fuente') or meta.get('source')
    fecha = (meta.get('generado') or meta.get('generated') or meta.get('fecha_consulta')
             or meta.get('fecha') or meta.get('fecha_generacion'))
    return fuente, fecha


def status_admin(admin_status, archivo_a_capa_key):
    """Cruza contra admin_data_status.json para marcar real/proxy cuando aplica."""
    if not admin_status:
        return None
    claves_relevantes = {
        'catastro_igac_uraba.geojson': 'igac_catastro',
        'corpouraba_agua.geojson': 'corpouraba_concesiones_agua',
    }
    clave = claves_relevantes.get(archivo_a_capa_key)
    if not clave:
        return None
    fuente = admin_status.get('sources', {}).get(clave)
    if not fuente:
        return None
    status = fuente.get('status')
    if status in ('disponible_api_activa', 'disponible_descarga_manual'):
        return 'real'
    if status in ('proxy', 'estimado'):
        return 'proxy'
    return None


def main():
    admin_status = {}
    try:
        with open(os.path.join(BASE, 'admin_data_status.json'), encoding='utf-8') as f:
            admin_status = json.load(f)
    except Exception:
        pass

    archivos = sorted(
        f for f in os.listdir(BASE)
        if os.path.splitext(f)[1].lower() in TIPOS_EXT and not f.startswith('.')
    )

    capas = []
    matched_ids = set()
    for nombre in archivos:
        path = os.path.join(BASE, nombre)
        ext = os.path.splitext(nombre)[1].lower()
        tipo = TIPOS_EXT[ext]
        size = os.path.getsize(path)

        fuente, fecha = None, None
        if tipo in ('json', 'geojson'):
            meta = leer_meta_json(path)
            fuente, fecha = extraer_fuente_y_fecha(meta)

        capa_id = ARCHIVO_A_CAPA.get(nombre)
        layer_info = LAYERPANEL_CAPAS.get(capa_id) if capa_id else None
        if capa_id:
            matched_ids.add(capa_id)

        real_proxy = status_admin(admin_status, nombre)
        # Capas marcadas explícitamente "sin datos" en LayerPanel (ver `sinDatos` allí).
        if capa_id in ('manglares', 'agua', 'inundacion') and real_proxy is None:
            real_proxy = 'proxy'

        capas.append({
            'archivo': nombre,
            'tipo': tipo,
            'tamano_bytes': size,
            'tamano_legible': humanize_size(size),
            'fuente': fuente,
            'fecha_generacion': fecha,
            'capa_mapa_id': capa_id,
            'capa_mapa_label': layer_info['label'] if layer_info else None,
            'capa_mapa_tema': layer_info['tema'] if layer_info else None,
            'real_o_proxy': real_proxy,
        })

    # Capas del LayerPanel que no matchearon ningún archivo (chequeo de integridad,
    # no bloqueante — se listan para que el mantenimiento manual las note).
    capas_sin_archivo = sorted(set(LAYERPANEL_CAPAS) - matched_ids)

    out = {
        '_meta': {
            'generado': datetime.date.today().isoformat(),
            'script': 'scripts/build_catalogo_capas.py',
            'total_archivos': len(capas),
            'total_capas_mapa_matched': len(matched_ids),
            'capas_layerpanel_sin_archivo_directo': capas_sin_archivo,
            'nota': ('capas_layerpanel_sin_archivo_directo incluye capas que se arman con join '
                     'en runtime (irca, seguridad) o derivan de atlas_enriquecido.geojson '
                     '(enriquecido-*) — no son huérfanas, solo no tienen archivo 1:1.'),
        },
        'capas': capas,
    }

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"OK: {len(capas)} archivos inventariados → {OUT_PATH}")
    print(f"  {len(matched_ids)} matchean una capa del mapa; "
          f"{len(LAYERPANEL_CAPAS) - len(matched_ids)} capas del LayerPanel sin archivo 1:1 (join/derivadas).")


if __name__ == '__main__':
    main()
