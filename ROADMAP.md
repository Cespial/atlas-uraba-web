# Atlas Urabá — Hoja de Ruta Ultra-Detallada

> Plan estratégico por frentes para llevar `uraba.tensor.lat` al atlas territorial
> más completo de Colombia. Anclado en auditoría real del repo · Tensor · 2026-06-01

---

## 0. Estado real (auditado, no narrado)

**Núcleo sólido — datos reales:**
- 7.028 manzanas CNPV 2018 · índice v1 (5 dimensiones) + índice v2 enriquecido
- Equipamientos 1.117 (REPS 339 + SIMAT 180 + OSM) · fincas 402 · veredas 611
- NDVI Sentinel-2 GEE (real) · manglares GMW v3 1.468 polígonos (satélite real)
- SMByC deforestación (621 Urabá + 7.930 Chocó) · IDEAM inundación 18 cuencas
- CORPOURABÁ agua 371 concesiones · red vial 344 · resguardos 35 · SINAP 3
- Ya computado en FASE previa: isócronas, conflicto de uso, índice de aislamiento, prioridad de inversión, gap analysis, ficha municipal

**Proxy — requiere reemplazo por dato real (FASE 2):**
| Campo | Estado actual | Reemplazo |
|-------|---------------|-----------|
| `impermeabilizacion` | proxy GHSL/área | NDBI Sentinel-2 GEE |
| `proxy_luminosidad` | proxy accesibilidad | VIIRS Black Marble GEE |
| `score_via` / `dist_*` | euclidiano | isócrona OSRM real |
| `clasificacion_suelo` | derivado CNPV | catastro IGAC oficial |

**Pendiente institucional (de `admin_data_status.json`):**
- IGAC Catastro → descargable hoy (SharePoint público, sin auth)
- Estratificación → APIs 404, requiere gestión Alcaldías/DANE
- POT/PBOT → SiPOT sin API, requiere gestión municipal

---

## FRENTE 1 — Gestión territorial y pública

| # | Dato | Fuente / método | Estado | Indicador que desbloquea |
|---|------|-----------------|--------|--------------------------|
| 1.1 | **Catastro IGAC Antioquia** | SharePoint público → filtrar MUNICIPIO Urabá | ✅ descarga ya | `U_MANZANA` oficial, área construida, nº predios, clasificación suelo urbano/expansión/rural |
| 1.2 | **Estrato socioeconómico** | Derecho de petición Apartadó/Turbo/Chigorodó | 📨 gestión | El indicador urbano #1 para diferenciar cuadra a cuadra |
| 1.3 | **POT/PBOT/EOT** | SiPOT MVCT + Sec. Planeación | 📨 gestión | Uso del suelo oficial (residencial/comercial/industrial/protección) |
| 1.4 | **TerriData DNP** (ampliar) | API DNP — 800 indicadores | ✅ API | Finanzas, gobierno, educación municipal |
| 1.5 | **Resguardos ANT oficial** | ANT shapefile (reemplaza OSM 35) | ✅ descarga | Territorios étnicos con resolución legal |
| 1.6 | **Consejos comunitarios Ley 70** | ANT | ✅ descarga | Territorios colectivos afro — diferenciador único de Urabá |
| 1.7 | **RUNAP completo** | parquesnacionales.gov.co WFS | ✅ WFS | Todas las AP + DRMI Golfo (reemplaza SINAP 3) |
| 1.8 | **Proyecciones población** | DANE 2018-2035 municipal | ✅ descarga | Denominador para todas las tasas per cápita |

---

## FRENTE 2 — Infraestructura

| # | Dato | Fuente / método | Estado | Indicador |
|---|------|-----------------|--------|-----------|
| 2.1 | **Cobertura servicios públicos** | SUI Superservicios (API) | ✅ API c/registro | % acueducto/alcantarillado/energía/aseo por municipio |
| 2.2 | **Calidad agua potable (IRCA)** | SIVICAP INS | ✅ reporte anual | Riesgo sanitario del agua |
| 2.3 | **Cobertura eléctrica** | UPME ICEE + IPSE ZNI (ya 60) | ✅ Excel/API | Zonas No Interconectadas — déficit energético |
| 2.4 | **Banda ancha fija** | MinTIC SIUST / Atlas TIC | ✅ API | Brecha digital — velocidad media |
| 2.5 | **Construcciones catastrales** | IGAC `U_CONSTRUCCION` (de 1.1) | ✅ con 1.1 | Área construida real → densidad por manzana |
| 2.6 | **Puerto Antioquia logística** | INVÍAS/APC reportes | ⚙️ manual | Zona de influencia + proyección toneladas |

**Índice a construir:** `índice_servicios_básicos` por manzana = f(acueducto, energía, alcantarillado, internet) — el mapa de déficit que un alcalde lleva a cabildo.

---

## FRENTE 3 — Agro y cadena de valor

| # | Dato | Fuente / método | Estado | Indicador |
|---|------|-----------------|--------|-----------|
| 3.1 | **EVA producción** (ampliar serie) | MADR Socrata `uejq-wxrr` 2019-2024 | ✅ API | Área/producción/rendimiento por cultivo y año |
| 3.2 | **Precios mayoristas SIPSA** | DANE Socrata | ✅ API | Precio banano/plátano — margen del productor |
| 3.3 | **Exportaciones FOB** | DANE-DIAN EXPO catálogo 472 | ✅ descarga | Banano Antioquia: toneladas + país destino + USD |
| 3.4 | **Predios exportadores / Foc TR4** | ICA registros sanitarios | 📨 gestión | Sanidad vegetal — riesgo biológico geolocalizado |
| 3.5 | **Frontera agrícola UPRA** | SIPRA (base existente) | ✅ tenemos | Suelo agrícola activo vs vocación |
| 3.6 | **Empacadoras/comercializadoras** | Augura + geocodificación | ⚙️ manual | Eslabón industrial de la cadena |
| 3.7 | **Certificaciones** | Rainforest/Fairtrade/GLOBALG.A.P. | ✅ bases públicas | Fincas certificadas — valor exportador |

**Análisis cruzado único:**
- `conflicto_bananero` = SIPRA exclusión ∩ fincas reales → siembra en zona restringida (ya: 121 fincas / 3.197 ha)
- `cadena_completa` = producción → precio SIPSA → FOB exportación, en un solo flujo

---

## FRENTE 4 — Transporte y conectividad

| # | Dato | Fuente / método | Estado | Indicador |
|---|------|-----------------|--------|-----------|
| 4.1 | **Red vial nacional INVÍAS** | datos.gov.co shapefile | ✅ descarga | Estado pavimento + categoría (reemplaza OSM fallback) |
| 4.2 | **Concesiones viales ANI** | Mar 1/2, Toyo, Conexión Pacífico | ⚙️ manual | Proyectos 4G/5G que transforman accesibilidad |
| 4.3 | **Isócronas OSRM reales** | OSRM API (sin key) | ⚙️ cómputo | Minutos reales a IPS/colegio/cabecera/Puerto/Medellín |
| 4.4 | **Transporte fluvial** | León/Atrato — campo/gobernación | 📨 campo | Eje real sin datos digitales — gran vacío |
| 4.5 | **Parque automotor** | RUNT/Mintransporte municipal | ✅ descarga | Motorización por municipio |

**Índice estrella:** recalcular `índice_aislamiento` con isócronas OSRM reales. No "distancia" sino "minutos de viaje" — el indicador más honesto de desigualdad. (Necoclí: 101 min al IPS, 6,6 h a Puerto Antioquia.)

---

## TRANSVERSAL A — Capa satelital real (GEE, reemplaza proxies)

GEE ya autenticado. Un script multi-banda:
- **NDBI Sentinel-2** → impermeabilización real por manzana
- **LST Landsat 9** → isla de calor por manzana (indicador NUEVO, alto impacto)
- **VIIRS Black Marble** → luminosidad nocturna real → actividad económica + cobertura eléctrica de facto
- **ESA WorldCover / Dynamic World 10m** → cobertura del suelo independiente de OSM
- **Multitemporal 2018→2025** → cambio urbano, frontera agrícola, deforestación anual

---

## TRANSVERSAL B — Producto de decisión (lo que lo hace único)

| Capacidad | Qué hace | Para quién |
|-----------|----------|------------|
| **Comparador de municipios** | Split-screen, mismo zoom/dimensión | Gobernación, OCAD PAZ |
| **Simulador de inversión** | "Si pongo IPS aquí → score sube X" | Alcaldes, planeación |
| **Ficha PDF server-side** | Policy brief 1 pág. por municipio | Reuniones, cooperantes |
| **API pública REST** | `uraba.tensor.lat/api/uraba/...` JSON — construida; desplegada como API estática prerenderizada (2026-07-07) | Integradores, apps |
| **Modo temporal** | CNPV 2005↔2018, deforestación serie | Investigación, prensa |
| **Backend PostGIS + Martin** | Vector tiles dinámicos | Escala (como matrizbht.cl) |

---

## Secuencia recomendada

**FASE 1 — Descargable/computable ya (sin esperar a nadie):**
1.1 Catastro IGAC · 1.4 TerriData · 1.5–1.7 Resguardos/Consejos/RUNAP ·
2.1 SUI · 2.3 IPSE · 2.4 TIC · 3.1 EVA · 3.2 SIPSA · 3.3 EXPO · 4.1 INVÍAS · 4.3 OSRM real

**FASE 2 — Satélite GEE (reemplaza 3 proxies + LST nuevo) → índice v3**

**FASE 3 — Gestión institucional (paralelo desde día 1):**
1.2 Estrato · 1.3 POT · 3.4 ICA Foc TR4 · Corpourabá/GeoAntioquia (enviados)

**FASE 4 — Producto de decisión:**
Comparador · Simulador · Ficha PDF · API pública · Modo temporal · Backend PostGIS

---

## Principios (lecciones aprendidas)

1. **Cero geometrías inventadas** — ningún buffer/blob/óvalo. Solo levantamientos reales.
2. **Marcar proxy vs real** — el usuario debe saber qué es satélite vs estimación.
3. **Citar fuente en cada capa** — trazabilidad institucional.
4. **Granularidad honesta** — manzana donde hay manzana, municipio donde el dato es municipal.

---

## Tesis — por qué sería único a nivel global

Ninguna plataforma territorial en América Latina integra, en un solo sistema y a resolución de
manzana: bienestar humano + cadena de valor agroindustrial (producción→precio→FOB) +
infraestructura portuaria nueva (Puerto Antioquia) + isócronas reales de acceso + conflicto de
uso dinámico actualizable con satélite + dimensión étnica y de posconflicto. Urabá como
laboratorio de convergencia.
