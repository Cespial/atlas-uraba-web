# Handoff — 2026-07-08 (Ola 2 completa)

## Estado actual
- **Branch**: `main` limpio y sincronizado; deploy https://uraba.tensor.lat verificado vivo
  (¡verificar SIEMPRE con una ruta nueva tras cada push — ver incidente prerender en git log!).
- **Investigación**: `docs/investigacion/2026-07-07/` (6 dossiers + INFORME + LINEA-SEGURIDAD-V31
  + impacto-v31 + terridata-reconciliacion).
- Metodología de ejecución: orquestador Fable + workers Sonnet en worktrees (workflows),
  review final de rama por ola. Olas 1 y 2: veredicto READY.

## OLA 2 ENTREGADA (encima de la Ola 1 — ver git log 23b2ac7..HEAD)
1. **PMTiles**: 7 capas pesadas convertidas (catastro 17→1.6 MB); preflight+fallback GeoJSON;
   CompararMiniMapa a pmtiles. Al montar solo hay HEADs de 0 KB.
2. **Índice v3.1 (seguridad trazable)**: fórmula de anclas fijas (LINEA-SEGURIDAD-V31.md),
   gate de impacto ejecutado (ρ=0.7733; Chigorodó tenía 1.0000 falso con tasa real 41.5/100k).
   **Adoptado en la capa citable** (brief 64/100 Apartadó, API, comparar, metodología) con
   contrato de API retrocompatible y caveat visible Arboletes/San Juan (2 de 3 años SIEDCO).
   **⚠️ PENDIENTE RATIFICACIÓN USUARIO: re-bake del mapa de manzanas a v3.1** (atlas_enriquecido
   + atlas.pmtiles + quintiles — cambia los colores de las 7.028 manzanas; script recalc_v31.py listo).
3. **/metodologia**: fórmulas desde _meta reales, glosario (LISA/Gini/IRCA/PDET), catálogo de
   ~70 capas (build_catalogo_capas.py — mapeo manual, actualizarlo al agregar capas), principios.
4. **Estado en URL**: /comparar?a=X&b=Y y /simulador?t/lat/lng compartibles + copiar enlace.
5. **Datos nuevos**: RUV (snapshot año corriente), Saber 11 agregado remoto (capa por colegio,
   join 89/131 con simat — simat no cubre Chigorodó/Mutatá/Necoclí), delitos sexuales tasados,
   MEN matrícula/deserción, RUNT (5/9 en fuente), MinTIC completado 9/9. EVA 2025 aún no
   publicado por MADR (reintentar). DiagnosticoPanel con RUV/MEN/delitos.
6. **TerriData reconciliado**: la capa 'nbi' mostraba NBI cabecera como total; corregido contra
   DANE oficial; etiquetas honestas; analfabetismo sigue discrepante (documentado, sin tocar).
7. **Ficha unificada**: useMunicipioResumen comparte carga entre ficha modal y brief (la ficha
   sigue v1/gap deliberadamente — pendiente conocido); perfiles similares en brief; bloque FAO
   conservador en /cadena.
8. **API**: endpoint de descubrimiento es **/api/uraba/info** (Vercel estático nunca sirve
   archivos `…/index` — normaliza a index.html). 12 archivos en server assets.

## Pendientes / decisiones del usuario
- [ ] **Ratificar re-bake del mapa a v3.1** (ítem 2 — el único switch visual grande que falta).
- [ ] SIPSA serie 2013-2024 (microdatos DANE catálogo 776 — descarga semi-manual, no automatizada).
- [ ] EVA 2025 cuando MADR publique · serie histórica RUV (export manual RNI).
- [ ] Ficha modal aún v1 (gap_analysis) — reconciliar visualmente con v3.1 o retirarla en favor del brief.
- [ ] Ola 3: versión EN, SSR real (Build Command), OGC/BYOD, gestión institucional (SUI, ART, certificadoras).
- [ ] Minors: DiagnosticoPanel duplica 4 fetches vs singleton (cache navegador lo cubre);
  analfabetismo TerriData; homónimos Saber11 dentro de un mismo municipio.

## Setup
```bash
npm run dev|build|generate      # generate = lo que corre Vercel
bash scripts/build_pmtiles.sh   # re-tilear capas pesadas (tippecanoe)
python3 scripts/recalc_v31.py   # índice v3.1 (stats candidatos)
python3 scripts/build_catalogo_capas.py  # tras agregar capas al mapa
python3 scripts/fetch_*.py      # refresh de datos por fuente
```
