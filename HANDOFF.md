# Handoff — 2026-07-07

## Objetivo de la sesión
Sprint "Atlas para decisores": índice de equidad intra-municipal, página `/cadena`
(producción→precio→exportación) y policy brief A4 por municipio. Ejecutado con
subagentes por tarea + review por tarea (spec + calidad) + QA visual headless.

## Estado actual
- **Branch**: `main` (limpio, sincronizado con `origin/main`)
- **Último commit**: `85b4eb4` — fix: prerender de las 8 rutas /brief/*
- **Deploy**: Vercel → https://uraba.tensor.lat · push a `main` dispara producción
- **Spec/plan**: `docs/superpowers/specs/2026-07-07-atlas-decisores-design.md` · `docs/superpowers/plans/2026-07-07-atlas-decisores.md`

## Hecho en esta sesión
1. `scripts/compute_equidad.py` → `public/data/equidad_municipios.json` (Gini, brecha
   p90−p10, manzanas críticas bajo p25 regional=0.5346, por municipio; auto-verificado).
2. `useEquidad()` (composable, fail-quiet) + bloque "Equidad interna" en `FichaMunicipal`.
3. `ScoreRankingList` con toggle score/desigualdad (Arboletes 0.12 el más desigual;
   Chigorodó 0.01 el más parejo).
4. Página `/cadena`: EVA 2019–2024 + SIPSA 2024 + FOB 2019–2025 con Chart.js
   (primer uso en el repo; registro explícito de controladores). Link en header.
5. `/brief/[municipio]`: policy brief A4 imprimible (window.print, sin lib PDF);
   404 para slugs inválidos; `app/utils/briefSlugs.js` con `MUNICIPIO_SLUGS`/`slugFor`.
6. Accesos al brief desde la ficha y `/comparar` (con guard `/brief/null`).
7. QA headless (Playwright/Python): 24 checks PASS — brief renderiza datos reales
   (score 72 Apartadó, top-5 manzanas, equidad, agro), **PDF = exactamente 1 página A4**
   (Apartadó y San Juan), 3 charts de /cadena con cifras verificadas (FOB 2024 US$560M,
   Italia top destino), toggle gini funcional, mapa sin regresión.

## Hallazgo de infraestructura (IMPORTANTE)
El proyecto Vercel construye con **`nuxt generate` → vercel-static**: producción es
un sitio ESTÁTICO, no SSR como asume `nuxt.config.ts` (`preset: 'vercel'`).
Consecuencias:
- **La API REST `/api/uraba/**` (FASE 4) está 404 en producción** — pre-existente,
  no lo causó este sprint. `sync-api-assets.mjs` + server assets viajan muertos.
- Las rutas dinámicas requieren prerender explícito → fix `85b4eb4` agrega las 8
  rutas `/brief/*` a `nitro.prerender.routes`.
- **Decisión pendiente del usuario**: cambiar el Build Command de Vercel a
  `npm run build` restauraría SSR + API pública (arquitectura que el repo declara).

## Pendiente
- [ ] **Narrativa desactualizada en el brief**: `gap_analysis.json` (narrativa y
  dimensiones) usa scores v1 — en Apartadó dice "Accesibilidad (40/100) es la brecha"
  pero la tabla v3 muestra Accesibilidad=87/Ambiental=40. Contradicción visible en el
  artefacto insignia. Ruta de cierre: regenerar narrativas desde stats v3 (script corto).
- [ ] Decisión SSR vs estático en Vercel (ver hallazgo arriba).
- [ ] Paleta verde vs teal (pendiente previo, ~8 componentes).
- [ ] Menores del sprint: SIPSA/FOB sin estado vacío textual; `Filler` de Chart.js
  registrado sin uso; `compute_equidad.py` con path absoluto (patrón heredado de
  `recalc_v3.py`); score del brief sin Math.round en la ruta gap_analysis.

## Setup notes
```bash
cd /Users/cristianespinal/atlas-uraba-web
npm run dev          # dev server localhost:3000
npm run build        # build SSR local (pasa verde)
npm run generate     # lo que corre Vercel (prerender 11 rutas incl. 8 briefs)
python3 scripts/compute_equidad.py   # regenerar equidad_municipios.json
```
QA headless: scripts en scratchpad de la sesión (qa_final.py / qa_final2.py, Playwright
Python de anaconda3; chromium-headless-shell instalado).

## Prompt para reanudar
```
Estoy retomando atlas-uraba-web (uraba.tensor.lat) en /Users/cristianespinal/atlas-uraba-web,
branch main limpio. Último sprint (2026-07-07): equidad intra-municipal + /cadena +
/brief/[municipio] A4, todo desplegado y verificado (ver HANDOFF.md).
El siguiente paso concreto es: regenerar las narrativas de gap_analysis.json desde los
scores v3 (hoy contradicen la tabla v3 en el brief) y decidir si el Build Command de
Vercel pasa de `nuxt generate` a `npm run build` para restaurar SSR + API pública.
Lee HANDOFF.md para el detalle.
```
