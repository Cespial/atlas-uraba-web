# Handoff — 2026-07-08

## Objetivo de la sesión
Investigación completa multi-agente (6 frentes, verificación adversarial) + integración de la
**Ola 1** del plan resultante, con metodología ultracode: orquestador + workers en worktrees
aislados, QA headless por stream y review final de rama (veredicto READY, 0 Critical/Important).

## Estado actual
- **Branch**: `main` limpio, sincronizado (pendiente 1 micro-commit de dedup .gitignore).
- **Deploy**: https://uraba.tensor.lat (push a main → prod; Vercel construye ESTÁTICO con `nuxt generate`).
- **Investigación**: `docs/investigacion/2026-07-07/` — 6 dossiers + `INFORME.md` (71 hallazgos, plan 3 olas).

## Ola 1 ENTREGADA (17+ commits, todo en prod)
1. **Mapa lazy**: carga inicial 81.5 MB → **5.4 MB (−93%)** — `optionalLayerRegistrars` en
   `useAtlasMap.js`, capas opcionales se descargan al primer toggle y sobreviven al reload de satélite.
2. **API pública desplegada**: `/api/uraba{,/municipios,/ranking,/municipio/<nombre>}` prerenderizada
   estática + headers JSON/CORS/cache en vercel.json + docs en `/api` + link en footer.
3. **FilterBar en desktop** (SidePanel, con a11y) + **PresentationMode** montado + **badge
   calidad de dato** (real/proxy) en LayerPanel desde `admin_data_status.json`.
4. **Seguridad trazable**: `scripts/fetch_seguridad.py` → homicidios MinDefensa (m8fd-ahd9) tasados
   por 100k con proyecciones DANE 2018-2042 como denominador; capa coroplética + DiagnosticoPanel D7
   + brief; siempre con nota "hechos reportados (SIEDCO/MinDefensa)"; 2025/2026 parciales excluidos.
5. **Corrección PDET** (bloqueante de integridad): `es_pdet` oficial Decreto 893/2017 en
   municipios.geojson + badge en brief — Arboletes y San Juan de Urabá = NO PDET.
6. **IRCA calidad de agua** (INS nxt2-39c3): JSON 9/9 municipios 2018-2024 + capa coroplética +
   KPI/tendencia en brief.
7. **/cadena due-diligence**: Puerto Antioquia feb-2026, FOB/kg implícito por año, corrección
   metodológica SIPSA≠FOB, 4º bloque precio internacional (Pink Sheet, ¡ya viene en US$/kg!),
   contexto Augura 2025, badge Foc R4T (Res. ICA 095026/2021) en brief.
8. **Quick wins**: cache /data 86400+CORS, WCAG pie del brief (9px, 5.36:1), useHead OG por página,
   sitemap.xml, app/error.vue de marca, 7 huérfanos borrados (14.3 MB), fix .gitignore `dist`.
9. **Fix scroll** en páginas largas (overflow del wrapper; mapa intacto; salvaguarda print).

## Incidente resuelto post-review (0c14f77)
El prerender de la API tumbaba el deploy COMPLETO en Vercel ("Atlas data asset no encontrado"):
el preset nuxtjs de Vercel relocaliza el buildDir a `node_modules/.cache/nuxt/.nuxt` y los
server assets de Nitro no se resuelven durante `nuxt generate` (local sí funciona). Fix:
`readData()` en `server/utils/uraba.js` con fallback a `public/data` por filesystem. Si se
agregan archivos a la API, deben existir en `public/data` (fuente de verdad).

## Minors diferidos (review final, no bloqueantes)
- IRCA/seguridad cargan municipios.geojson como sources separadas (redundancia pequeña, cacheada).
- toggleSatellite: setLayoutProperty a +200ms puede ganar la carrera al registrar async (ruido de
  consola capturado; auto-sanable). El +200ms es herencia del código previo — timing-based.
- Brief fija seguridad en '2024' duro; mapa/panel derivan "último año completo" dinámico. Si un
  re-run completa 2025, actualizar el brief.
- Warning de hidratación preexistente en /brief/[municipio] (anterior a esta ola).

## Siguiente: OLA 2 (INFORME.md §3, semanas)
PMTiles para capas pesadas (catastro 16MB P0) · estado en URL para /comparar y /simulador ·
página /metodologia + catálogo de capas · serie histórica RUV · reconstrucción documentada del
score_seguridad v3 (recalc con homicidios tasados) · Saber 11 por colegio · SIPSA 2013-2024 +
EVA 2025 · reconciliar terridata_full vs terridata_indicadores (¡contradicen! NBI Chigorodó
21.19 vs 31.8) · unificar FichaMunicipal/brief · perfiles similares.

## OLA 3 / decisiones pendientes del usuario
- SSR real en Vercel (Build Command → `npm run build`) si la API estática se queda corta.
- Versión EN (cooperación) · gestión institucional (SUI energía, ART/PDET inversión, certificadoras).

## Setup
```bash
npm run dev / npm run build / npm run generate   # generate = lo que corre Vercel (52 rutas)
python3 scripts/fetch_seguridad.py|fetch_irca.py|fetch_banano_internacional.py  # refresh datos
python3 scripts/compute_equidad.py | scripts/patch_pdet.py
```
QA headless: playwright Python (anaconda3) + chromium-headless-shell; PDFs con pg.pdf() (print media).
