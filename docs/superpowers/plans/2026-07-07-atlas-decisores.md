# Atlas para Decisores — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Índice de equidad intra-municipal + página `/cadena` (producción→precio→exportación) + policy brief A4 imprimible por municipio, todo sobre datos ya existentes en `public/data`.

**Architecture:** Un script Python genera `equidad_municipios.json` (estático, ~2 KB). Tres superficies Vue nuevas/modificadas lo consumen junto a JSON ya existentes, siempre con fetch client-side (`server: false`, patrón de `comparar.vue`) y fail-quiet. Nada toca el flujo del mapa (`useAtlasMap.js`).

**Tech Stack:** Nuxt 4 (dir `app/`), Vue 3 `<script setup>`, Pinia, Chart.js 4 + vue-chartjs (ya en deps, **sin uso previo** — hay que registrar controladores), Python 3 stdlib.

## Global Constraints

- **Cero dependencias nuevas** — todo con lo que ya está en `package.json`.
- **No tocar** `app/composables/useAtlasMap.js` ni el flujo de carga del mapa (recién estabilizado en code-review).
- **Escalas:** `gap_analysis.json` usa 0–100 (enteros); `atlas_stats_v3.json`, `benchmarks.json`, `top_prioridad.json` y el nuevo `equidad_municipios.json` usan 0–1. Presentación siempre en 0–100, normalizando en el punto de render.
- **Datos faltantes → bloque omitido**, nunca ceros inventados. Cada visualización cita su fuente institucional.
- **Español con tildes correctas** en todo copy (feedback del usuario).
- **Commits sin atribución a Claude** (feedback del usuario: sin `Co-Authored-By`). Commit + push al cerrar cada tarea.
- **No hay framework de tests JS** en el repo. Verificación = `npm run build` en verde + QA en la app corriendo (`npm run dev`, convención del proyecto según HANDOFF.md). El script Python se auto-verifica con `assert`.
- La paleta verde vs teal es un pendiente PREVIO y queda fuera: usar `useScoreScale().scoreColor` donde aplique y no introducir escalas nuevas.
- Nombres canónicos de municipios (claves en todos los JSON): `Apartadó, Turbo, Chigorodó, Carepa, Necoclí, Arboletes, San Pedro de Urabá, San Juan de Urabá`.

## Formas de datos verificadas (leer antes de codear)

- `atlas_enriquecido.geojson` — 7.028 features; `properties.municipio`, `properties.atlas_score_v3` (0–1), `properties.cod_manzana`.
- `atlas_stats_v3.json` — `{ _meta, ranking_municipios_v3: [{municipio,...}], municipios: { <nombre>: { count, avg: { atlas_score_v3, score_accesibilidad_v3, score_ambiental_v3, score_socioeconomico_v3, score_seguridad, score_ndvi, score_calor, lst_c, viirs_rad, ... } } } }`.
- `gap_analysis.json` — `{ <nombre>: { atlas_score (0–100), nivel, dimensiones{...0–100}, gaps_vs_uraba{...}, narrativa } }`.
- `benchmarks.json` — `referencias.{colombia_promedio, antioquia_promedio, medellin, uraba_promedio}` con scores 0–1.
- `top_prioridad.json` — `{ <nombre>: [ {cod_manzana, prioridad, prioridad_pct, atlas_score(0–1)} ×5 ] }`.
- `eva_produccion_serie.json` — `{ _meta, data: { '05045 - Apartadó': { codigo_dane, municipio, cultivos: { Banano: { grupo_cultivo, series: { '2019': OBJETO ó ARRAY de desagregaciones } } } } } }`. ⚠️ Cada año puede ser **objeto o array**: normalizar con `Array.isArray(v) ? v : [v]`. Campos: `area_sembrada_ha, area_cosechada_ha, produccion_ton, rendimiento_ton_ha, desagregacion`.
- `sipsa_precios.json` — `{ _meta, datos: { 'Banano Urabá': { '<mercado>': { '2024-01': <COP/kg int>, … '2024-12' } } } }`. 9 productos banano/plátano.
- `expo_banano_fob.json` — `{ _meta, '2019'…'2025': { ton, fob_usd, destinos: [{pais, fob}] } }` (2025 parcial).

---

### Task 1: Script de equidad intra-municipal

**Files:**
- Create: `scripts/compute_equidad.py`
- Create (generado): `public/data/equidad_municipios.json`
- Modify: `scripts/sync-api-assets.mjs:15` (lista `FILES`)

**Interfaces:**
- Produces: `public/data/equidad_municipios.json` con forma
  `{ _meta: { fuente, formula, umbral_critico, generado, n_total, n_sin_score }, municipios: { <nombre>: { gini, p10, p90, brecha_p90_p10, manzanas_criticas, pct_criticas, n_manzanas } } }` — scores 0–1, `pct_criticas` 0–1.

- [ ] **Step 1: Escribir el script completo**

```python
#!/usr/bin/env python3
"""Índice de equidad intra-municipal — desigualdad interna del atlas_score_v3.

Por municipio: Gini, brecha p90-p10 y manzanas críticas (score bajo el p25
regional de Urabá). Lee atlas_enriquecido.geojson, escribe
public/data/equidad_municipios.json. Se auto-verifica con asserts.
"""
import json
import datetime

BASE = "/Users/cristianespinal/atlas-uraba-web/public/data/"

atlas = json.load(open(BASE + "atlas_enriquecido.geojson"))
feats = atlas["features"]
print("Cargadas %d manzanas" % len(feats))

by_mun = {}
all_scores = []
n_sin_score = 0
for f in feats:
    p = f["properties"]
    s = p.get("atlas_score_v3")
    if s is None:
        n_sin_score += 1
        continue
    s = float(s)
    by_mun.setdefault(p["municipio"], []).append(s)
    all_scores.append(s)

assert len(by_mun) == 8, f"Se esperaban 8 municipios, hay {len(by_mun)}: {sorted(by_mun)}"

all_sorted = sorted(all_scores)


def pctl(vals_sorted, q):
    """Percentil por índice más cercano sobre lista YA ordenada."""
    idx = min(len(vals_sorted) - 1, max(0, round(q * (len(vals_sorted) - 1))))
    return vals_sorted[idx]


UMBRAL = pctl(all_sorted, 0.25)
print(f"Umbral crítico regional (p25 Urabá): {UMBRAL:.4f}")


def gini(vals):
    """Coeficiente de Gini (fórmula de rangos sobre lista ordenada)."""
    v = sorted(vals)
    n = len(v)
    tot = sum(v)
    if n == 0 or tot == 0:
        return 0.0
    cum = sum(i * x for i, x in enumerate(v, 1))
    return (2.0 * cum) / (n * tot) - (n + 1.0) / n


municipios = {}
total = 0
for mun in sorted(by_mun):
    v = sorted(by_mun[mun])
    n = len(v)
    g = gini(v)
    assert 0.0 <= g <= 1.0, f"Gini fuera de rango en {mun}: {g}"
    p10 = pctl(v, 0.10)
    p90 = pctl(v, 0.90)
    criticas = sum(1 for x in v if x < UMBRAL)
    municipios[mun] = {
        "gini": round(g, 4),
        "p10": round(p10, 4),
        "p90": round(p90, 4),
        "brecha_p90_p10": round(p90 - p10, 4),
        "manzanas_criticas": criticas,
        "pct_criticas": round(criticas / n, 4),
        "n_manzanas": n,
    }
    total += n
    print(f"  {mun:22s} gini={g:.3f} brecha={p90 - p10:.3f} críticas={criticas} ({criticas / n:.0%}) n={n}")

assert total + n_sin_score == len(feats), "Las manzanas no cuadran con el geojson"
print(f"Total manzanas con score: {total} · sin score: {n_sin_score}")

out = {
    "_meta": {
        "fuente": "Cálculo propio Atlas Urabá sobre atlas_enriquecido.geojson (atlas_score_v3, CNPV 2018 + satélite GEE + isócronas OSRM)",
        "formula": "Por municipio: Gini(atlas_score_v3 de sus manzanas); brecha_p90_p10 = p90 - p10; manzanas_criticas = score < p25 regional de Urabá",
        "umbral_critico": round(UMBRAL, 4),
        "generado": datetime.date.today().isoformat(),
        "n_total": total,
        "n_sin_score": n_sin_score,
    },
    "municipios": municipios,
}

with open(BASE + "equidad_municipios.json", "w") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
print("OK → equidad_municipios.json")
```

- [ ] **Step 2: Ejecutarlo y verificar salida**

Run: `cd /Users/cristianespinal/atlas-uraba-web && python3 scripts/compute_equidad.py`
Expected: imprime 8 municipios con gini/brecha/críticas, "Las manzanas cuadran" implícito (sin AssertionError), termina con `OK → equidad_municipios.json`.

Luego: `python3 -c "import json; d=json.load(open('public/data/equidad_municipios.json')); print(len(d['municipios']), d['_meta']['umbral_critico'])"`
Expected: `8` y un umbral ∈ (0, 1).

- [ ] **Step 3: Agregar el JSON a la lista de sync**

En `scripts/sync-api-assets.mjs`, cambiar:

```js
const FILES = ['atlas_stats_v3.json', 'gap_analysis.json', 'atlas.geojson']
```

por:

```js
const FILES = ['atlas_stats_v3.json', 'gap_analysis.json', 'atlas.geojson', 'equidad_municipios.json']
```

Run: `node scripts/sync-api-assets.mjs`
Expected: 4 líneas `[sync-api-assets] …`, incluida `equidad_municipios.json`.

- [ ] **Step 4: Commit + push**

```bash
git add scripts/compute_equidad.py public/data/equidad_municipios.json scripts/sync-api-assets.mjs server/assets/data/equidad_municipios.json
git commit -m "feat: índice de equidad intra-municipal (Gini, brecha p90-p10, manzanas críticas)"
git push
```

---

### Task 2: Composable useEquidad + fila en FichaMunicipal

**Files:**
- Create: `app/composables/useEquidad.js`
- Modify: `app/components/FichaMunicipal.vue` (script: bloque "Datos externos"; template: nueva sección tras `ficha-dimensiones`; style: clases nuevas)

**Interfaces:**
- Consumes: `public/data/equidad_municipios.json` (Task 1).
- Produces: `useEquidad()` → `{ equidad }` donde `equidad` es `ref` con el JSON completo o `null` (fail-quiet). Lo reutiliza Task 3 y Task 5.

- [ ] **Step 1: Escribir el composable**

```js
// useEquidad.js — carga única y compartida de equidad_municipios.json.
// Fail-quiet: si el archivo no existe o falla la red, equidad queda null y
// los consumidores ocultan su UI (mismo patrón defensivo que stats).
import { ref } from 'vue'

const equidad = ref(null)
let started = false

export function useEquidad() {
  if (!started && import.meta.client) {
    started = true
    fetch('/data/equidad_municipios.json')
      .then(r => (r.ok ? r.json() : null))
      .then(j => { equidad.value = j })
      .catch(() => { equidad.value = null })
  }
  return { equidad }
}
```

- [ ] **Step 2: Consumirlo en FichaMunicipal**

En `app/components/FichaMunicipal.vue`, en `<script setup>` junto a los otros imports:

```js
import { useEquidad } from '~/composables/useEquidad'
```

y tras la sección "Datos externos":

```js
// ─── Equidad interna (Task equidad intra-municipal) ──────────────────────────
const { equidad } = useEquidad()
const equidadEntry = computed(() => {
  if (store.municipioActivo === 'Todos') return null
  return equidad.value?.municipios?.[store.municipioActivo] ?? null
})
```

- [ ] **Step 3: Nueva sección en el template**

Insertar inmediatamente después del `</section>` que cierra `class="ficha-dimensiones"`:

```html
          <!-- ════════════════════════════════════════════════════
               BLOQUE D2 — Equidad interna (desigualdad entre manzanas)
          ════════════════════════════════════════════════════ -->
          <section v-if="equidadEntry" class="ficha-equidad">
            <div class="equidad-header">EQUIDAD INTERNA · desigualdad entre manzanas</div>
            <div class="equidad-grid">
              <div class="equidad-item">
                <span class="equidad-val">{{ equidadEntry.gini.toFixed(2) }}</span>
                <span class="equidad-label">Gini del score v3</span>
              </div>
              <div class="equidad-item">
                <span class="equidad-val">{{ Math.round(equidadEntry.brecha_p90_p10 * 100) }}</span>
                <span class="equidad-label">Brecha p90−p10 (pts)</span>
              </div>
              <div class="equidad-item">
                <span class="equidad-val">{{ equidadEntry.manzanas_criticas }}</span>
                <span class="equidad-label">Manzanas críticas ({{ Math.round(equidadEntry.pct_criticas * 100) }}%)</span>
              </div>
            </div>
            <p class="equidad-nota">
              Crítica = manzana bajo el p25 regional de Urabá.
              Fuente: cálculo propio sobre CNPV 2018 + satélite GEE + isócronas OSRM.
            </p>
          </section>
```

- [ ] **Step 4: Estilos**

Dentro del `<style scoped>` existente de `FichaMunicipal.vue`, junto a los estilos de `.ficha-dimensiones` (misma familia visual — light mode, tipografía mono para labels):

```css
.ficha-equidad { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.08); }
.equidad-header { font-family: ui-monospace, monospace; font-size: 8px; letter-spacing: 0.15em; color: #8a8a85; margin-bottom: 8px; }
.equidad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.equidad-item { display: flex; flex-direction: column; gap: 2px; }
.equidad-val { font-size: 20px; font-weight: 700; color: #1B6B6D; font-variant-numeric: tabular-nums; }
.equidad-label { font-size: 9.5px; color: #5F5F5B; }
.equidad-nota { margin-top: 8px; font-size: 8.5px; color: #8a8a85; }
```

- [ ] **Step 5: Verificar en la app corriendo**

Run: `npm run dev` → abrir `http://localhost:3000`, seleccionar Apartadó, abrir la ficha.
Expected: bloque "EQUIDAD INTERNA" con Gini ~0.1–0.3, brecha en puntos y nº de manzanas críticas coherente con `equidad_municipios.json`. Con municipio "Todos" el bloque NO aparece. Renombrar temporalmente el JSON y recargar → la ficha funciona igual sin el bloque (fail-quiet); restaurar.

- [ ] **Step 6: Build + commit + push**

Run: `npm run build`
Expected: build verde sin warnings nuevos.

```bash
git add app/composables/useEquidad.js app/components/FichaMunicipal.vue
git commit -m "feat: bloque de equidad interna en la ficha municipal"
git push
```

---

### Task 3: Toggle de ordenamiento en el ranking (score vs desigualdad)

**Files:**
- Modify: `app/components/ScoreRankingList.vue` (archivo completo, 53 líneas)

**Interfaces:**
- Consumes: `useEquidad()` de Task 2; `store.stats` y `useScoreScale` existentes.

- [ ] **Step 1: Reemplazar el componente completo**

```html
<template>
  <div v-if="municipios.length" class="mt-3">
    <div class="flex items-center justify-between mb-2">
      <div class="font-mono text-[8px] uppercase tracking-[0.15em] text-atlas-muted">
        Ranking regional
      </div>
      <button
        v-if="equidad"
        @click="ordenarPor = ordenarPor === 'score' ? 'gini' : 'score'"
        class="font-mono text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-white/10 text-atlas-muted hover:text-atlas-text transition-colors"
        :title="ordenarPor === 'score' ? 'Ordenar por desigualdad interna (Gini)' : 'Ordenar por score'"
      >
        {{ ordenarPor === 'score' ? 'score' : 'desigualdad' }}
      </button>
    </div>
    <div class="space-y-1.5">
      <div
        v-for="(m, i) in municipios"
        :key="m.nombre"
        @click="store.setMunicipio(m.nombre)"
        class="flex items-center gap-2 cursor-pointer group"
      >
        <span class="font-mono text-[8px] text-atlas-muted w-4 flex-shrink-0 text-right">
          {{ i + 1 }}
        </span>
        <span class="font-mono text-[8px] flex-1 truncate transition-colors"
              :class="store.municipioActivo === m.nombre ? 'text-tensor-teal' : 'text-atlas-muted group-hover:text-atlas-text'">
          {{ m.short }}
        </span>
        <div class="w-16 bg-white/5 rounded-full h-1 overflow-hidden flex-shrink-0">
          <div
            class="h-1 rounded-full transition-all duration-500"
            :style="{ width: m.barPct + '%', background: m.color }"
          />
        </div>
        <span class="font-mono text-[9px] w-7 flex-shrink-0 text-right" :style="{ color: m.color }">
          {{ m.display }}
        </span>
      </div>
    </div>
    <p v-if="ordenarPor === 'gini'" class="font-mono text-[7.5px] text-atlas-muted mt-1.5 leading-snug">
      Gini interno del score v3 — mayor = más desigual entre manzanas.
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAtlasStore } from '~/stores/atlas'
import { useScoreScale } from '~/composables/useScoreScale'
import { useEquidad } from '~/composables/useEquidad'

const store = useAtlasStore()
const { scoreColor } = useScoreScale()
const { equidad } = useEquidad()

const ordenarPor = ref('score')   // 'score' | 'gini'

const municipios = computed(() => {
  const dim = store.dimension
  const rows = Object.entries(store.stats).map(([nombre, s]) => {
    const score = s.avg?.[dim] ?? 0
    const gini = equidad.value?.municipios?.[nombre]?.gini ?? null
    return {
      nombre,
      short: nombre.replace('San ', 'S.').replace(' de Urabá', '').replace(' de Antioquia', ''),
      score,
      gini,
    }
  })

  if (ordenarPor.value === 'gini' && equidad.value) {
    // Barra normalizada al Gini máximo del grupo para que el ranking sea legible.
    const maxG = Math.max(...rows.map(r => r.gini ?? 0), 0.0001)
    return rows
      .filter(r => r.gini != null)
      .sort((a, b) => b.gini - a.gini)
      .map(r => ({
        ...r,
        barPct: Math.round((r.gini / maxG) * 100),
        display: r.gini.toFixed(2),
        color: '#f46d43',
      }))
  }

  return rows
    .sort((a, b) => b.score - a.score)
    .map(r => ({
      ...r,
      barPct: Math.round(r.score * 100),
      display: String(Math.round(r.score * 100)),
      color: scoreColor(r.score),
    }))
})
</script>
```

Nota: se elimina el import sin uso `DIMENSIONES` (ya no se referencia).

- [ ] **Step 2: Verificar en la app corriendo**

Run: `npm run dev` → panel lateral con el ranking.
Expected: por defecto idéntico a hoy (score, colores de escala). Click en el toggle → ordena por Gini descendente, valores `0.xx` en naranja, nota al pie. Sin `equidad_municipios.json` (renombrar y recargar) el toggle no aparece y el ranking clásico sigue funcionando; restaurar.

- [ ] **Step 3: Build + commit + push**

Run: `npm run build` → verde.

```bash
git add app/components/ScoreRankingList.vue
git commit -m "feat: ranking regional ordenable por score o por desigualdad interna"
git push
```

---

### Task 4: Página `/cadena` — cadena de valor agro

**Files:**
- Create: `app/pages/cadena.vue`
- Modify: `app/components/AppHeader.vue:50` (agregar link tras el NuxtLink de `/simulador`)

**Interfaces:**
- Consumes: `/data/eva_produccion_serie.json`, `/data/sipsa_precios.json`, `/data/expo_banano_fob.json` (formas en "Formas de datos verificadas").
- Produces: ruta `/cadena` navegable; Task 5 enlaza a ella desde el brief.

- [ ] **Step 1: Crear `app/pages/cadena.vue`**

Chart.js NO se ha usado antes en el repo: registrar controladores explícitamente (tree-shaking de Chart 4). Página con el patrón visual/estructural de `comparar.vue` (header propio + `useFetch` client-side).

```html
<template>
  <div class="cad-root">
    <header class="cad-header">
      <NuxtLink to="/" class="cad-back">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Volver al mapa
      </NuxtLink>
      <div class="cad-title-wrap">
        <h1 class="cad-title">Cadena de valor agro</h1>
        <span class="cad-subtitle">Producción → Precio → Exportación · Urabá</span>
      </div>
    </header>

    <main class="cad-main">
      <div v-if="pending" class="cad-state">Cargando datos…</div>
      <div v-else-if="error" class="cad-state cad-state--err">No se pudieron cargar los datos.</div>

      <template v-else>
        <!-- ── BLOQUE 1 · PRODUCCIÓN (EVA) ─────────────────────── -->
        <section class="cad-block">
          <div class="cad-block-head">
            <h2 class="cad-h2"><span class="cad-step">1</span> Producción municipal</h2>
            <div class="cad-selects">
              <select v-model="munSel" class="cad-select">
                <option v-for="m in munNombres" :key="m" :value="m">{{ m }}</option>
              </select>
              <select v-model="cultivoSel" class="cad-select">
                <option v-for="c in cultivosDisponibles" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
          <div v-if="serieEva.length" class="cad-chart-grid">
            <div class="cad-chart">
              <Bar :data="chartEva" :options="optsEva" />
            </div>
            <div class="cad-mini-table">
              <div v-for="r in serieEva" :key="r.anio" class="cad-mini-row">
                <span class="cad-mini-y">{{ r.anio }}</span>
                <span>{{ fmt(r.produccion) }} t</span>
                <span>{{ fmt(r.area) }} ha</span>
                <span>{{ r.rendimiento.toFixed(1) }} t/ha</span>
              </div>
            </div>
          </div>
          <p v-else class="cad-empty">Sin registros EVA de {{ cultivoSel }} en {{ munSel }}.</p>
          <p class="cad-fuente">Fuente: {{ evaFuente }}</p>
        </section>

        <!-- ── BLOQUE 2 · PRECIO MAYORISTA (SIPSA) ─────────────── -->
        <section class="cad-block">
          <div class="cad-block-head">
            <h2 class="cad-h2"><span class="cad-step">2</span> Precio mayorista 2024</h2>
            <div class="cad-selects">
              <select v-model="productoSel" class="cad-select">
                <option v-for="p in productosSipsa" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>
          <div class="cad-chart cad-chart--wide">
            <Line :data="chartSipsa" :options="optsSipsa" />
          </div>
          <p class="cad-fuente">Fuente: DANE — SIPSA, precios mayoristas mensuales (COP/kg).</p>
        </section>

        <!-- ── BLOQUE 3 · EXPORTACIÓN FOB ──────────────────────── -->
        <section class="cad-block">
          <div class="cad-block-head">
            <h2 class="cad-h2"><span class="cad-step">3</span> Exportación de banano — Antioquia</h2>
            <div class="cad-selects">
              <select v-model="anioFobSel" class="cad-select">
                <option v-for="a in aniosFob" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
          </div>
          <div class="cad-chart-grid">
            <div class="cad-chart">
              <Bar :data="chartFob" :options="optsFob" />
            </div>
            <div class="cad-mini-table">
              <div class="cad-mini-head">
                Top destinos {{ anioFobSel }} · US${{ fmt(Math.round(fobAnio.fob_usd / 1e6)) }} M · {{ fmt(fobAnio.ton) }} t
              </div>
              <div v-for="d in topDestinos" :key="d.pais" class="cad-mini-row">
                <span class="cad-mini-y">{{ d.pais }}</span>
                <span>US${{ fmt(Math.round(d.fob / 1e6)) }} M</span>
                <span>{{ d.pct }}%</span>
              </div>
            </div>
          </div>
          <p class="cad-fuente">Fuente: DANE — Exportaciones (partida HS 0803, Antioquia), vía Datos Abiertos Colombia.</p>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import {
  Chart, BarController, BarElement, LineController, LineElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line } from 'vue-chartjs'

Chart.register(BarController, BarElement, LineController, LineElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)

const TEAL = '#1B6B6D'
const AMBER = '#f59e0b'

// Carga client-side (mismo patrón y razón que comparar.vue).
const { data: evaRaw,   pending: p1, error: e1 } = await useFetch('/data/eva_produccion_serie.json', { server: false, lazy: true })
const { data: sipsaRaw, pending: p2, error: e2 } = await useFetch('/data/sipsa_precios.json', { server: false, lazy: true })
const { data: fobRaw,   pending: p3, error: e3 } = await useFetch('/data/expo_banano_fob.json', { server: false, lazy: true })

const pending = computed(() => p1.value || p2.value || p3.value)
const error   = computed(() => e1.value || e2.value || e3.value)

function fmt(n) { return (n ?? 0).toLocaleString('es-CO') }

// ── EVA ──────────────────────────────────────────────────────────
const evaFuente = computed(() => evaRaw.value?._meta?.fuente ?? 'DANE/MADR — EVA')
// data está indexado por '05045 - Apartadó' → mapear a nombre limpio.
const munIndex = computed(() => {
  const out = {}
  Object.values(evaRaw.value?.data ?? {}).forEach(m => { out[m.municipio] = m })
  return out
})
const munNombres = computed(() => Object.keys(munIndex.value).sort())
const munSel = ref(null)
const cultivoSel = ref('Banano')
watchEffect(() => {
  if (!munSel.value && munNombres.value.length) munSel.value = munNombres.value[0]
})
const cultivosDisponibles = computed(() => {
  const c = munIndex.value[munSel.value]?.cultivos ?? {}
  return Object.keys(c).sort()
})
watchEffect(() => {
  // Si el cultivo elegido no existe en el municipio, caer a Banano o al primero.
  const disp = cultivosDisponibles.value
  if (disp.length && !disp.includes(cultivoSel.value)) {
    cultivoSel.value = disp.includes('Banano') ? 'Banano' : disp[0]
  }
})

// ⚠️ Cada año de `series` puede ser objeto O array de desagregaciones.
const serieEva = computed(() => {
  const series = munIndex.value[munSel.value]?.cultivos?.[cultivoSel.value]?.series ?? {}
  return Object.keys(series).sort().map(anio => {
    const arr = Array.isArray(series[anio]) ? series[anio] : [series[anio]]
    const produccion = arr.reduce((t, d) => t + (+d.produccion_ton || 0), 0)
    const area = arr.reduce((t, d) => t + (+d.area_sembrada_ha || 0), 0)
    const cosechada = arr.reduce((t, d) => t + (+d.area_cosechada_ha || 0), 0)
    return { anio, produccion, area, rendimiento: cosechada ? produccion / cosechada : 0 }
  })
})

const chartEva = computed(() => ({
  labels: serieEva.value.map(r => r.anio),
  datasets: [{
    label: 'Producción (t)',
    data: serieEva.value.map(r => r.produccion),
    backgroundColor: TEAL + 'cc',
    borderRadius: 3,
  }],
}))
const optsEva = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('es-CO') } } },
}

// ── SIPSA ────────────────────────────────────────────────────────
const productosSipsa = computed(() => Object.keys(sipsaRaw.value?.datos ?? {}).sort())
const productoSel = ref('Banano Urabá')
watchEffect(() => {
  const disp = productosSipsa.value
  if (disp.length && !disp.includes(productoSel.value)) productoSel.value = disp[0]
})
const MESES = ['2024-01','2024-02','2024-03','2024-04','2024-05','2024-06',
               '2024-07','2024-08','2024-09','2024-10','2024-11','2024-12']
const PALETA = [TEAL, AMBER, '#a78bfa', '#60a5fa', '#34d399']
const chartSipsa = computed(() => {
  const mercados = sipsaRaw.value?.datos?.[productoSel.value] ?? {}
  return {
    labels: MESES.map(m => m.slice(5)),
    datasets: Object.entries(mercados).map(([mercado, serie], i) => ({
      label: mercado,
      data: MESES.map(m => serie[m] ?? null),
      borderColor: PALETA[i % PALETA.length],
      backgroundColor: 'transparent',
      tension: 0.3,
      spanGaps: true,
      pointRadius: 2,
    })),
  }
})
const optsSipsa = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
  scales: { y: { ticks: { callback: v => '$' + v.toLocaleString('es-CO') } } },
}

// ── FOB ──────────────────────────────────────────────────────────
const aniosFob = computed(() => Object.keys(fobRaw.value ?? {}).filter(k => k !== '_meta').sort())
const anioFobSel = ref('2024')
watchEffect(() => {
  const a = aniosFob.value
  if (a.length && !a.includes(anioFobSel.value)) anioFobSel.value = a[a.length - 1]
})
const fobAnio = computed(() => fobRaw.value?.[anioFobSel.value] ?? { ton: 0, fob_usd: 0, destinos: [] })
const topDestinos = computed(() =>
  (fobAnio.value.destinos ?? []).slice(0, 8).map(d => ({
    ...d,
    pct: fobAnio.value.fob_usd ? Math.round((d.fob / fobAnio.value.fob_usd) * 100) : 0,
  }))
)
const chartFob = computed(() => ({
  labels: aniosFob.value,
  datasets: [{
    label: 'FOB (millones USD)',
    data: aniosFob.value.map(a => Math.round((fobRaw.value?.[a]?.fob_usd ?? 0) / 1e6)),
    backgroundColor: aniosFob.value.map(a => a === anioFobSel.value ? TEAL : TEAL + '55'),
    borderRadius: 3,
  }],
}))
const optsFob = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { callback: v => 'US$' + v + 'M' } } },
}

useHead({ title: 'Cadena de valor agro · Atlas Urabá' })
</script>

<style scoped>
.cad-root { min-height: 100vh; background: #0d1211; color: #e7e5e0; }
.cad-header { display: flex; align-items: center; gap: 20px; padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.cad-back { display: inline-flex; align-items: center; gap: 6px; font-family: ui-monospace, monospace; font-size: 11px; color: #8a8a85; text-decoration: none; }
.cad-back:hover { color: #e7e5e0; }
.cad-title { font-size: 16px; font-weight: 700; }
.cad-subtitle { font-family: ui-monospace, monospace; font-size: 10px; color: #8a8a85; letter-spacing: 0.08em; }
.cad-main { max-width: 1060px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 22px; }
.cad-state { padding: 60px 0; text-align: center; font-family: ui-monospace, monospace; font-size: 12px; color: #8a8a85; }
.cad-state--err { color: #f46d43; }
.cad-block { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 18px 20px; }
.cad-block-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.cad-h2 { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }
.cad-step { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 999px; background: #1B6B6D; color: #fff; font-family: ui-monospace, monospace; font-size: 11px; }
.cad-selects { display: flex; gap: 8px; }
.cad-select { background: #16201e; color: #e7e5e0; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; font-size: 11px; padding: 5px 8px; }
.cad-chart-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: start; }
.cad-chart { height: 230px; position: relative; }
.cad-chart--wide { height: 260px; position: relative; }
.cad-mini-table { font-family: ui-monospace, monospace; font-size: 10.5px; display: flex; flex-direction: column; gap: 4px; }
.cad-mini-head { font-size: 10px; color: #8a8a85; letter-spacing: 0.06em; margin-bottom: 4px; }
.cad-mini-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 6px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.cad-mini-row > .cad-mini-y { color: #8a8a85; }
.cad-empty { font-family: ui-monospace, monospace; font-size: 11px; color: #8a8a85; padding: 20px 0; }
.cad-fuente { margin-top: 10px; font-size: 9px; color: #6b6b66; }
@media (max-width: 760px) { .cad-chart-grid { grid-template-columns: 1fr; } }
</style>
```

Nota: `.cad-mini-row` del bloque EVA tiene 4 columnas — usar `grid-template-columns: repeat(4, 1fr)` vía clase adicional si desborda; aceptable ajustar en QA visual.

- [ ] **Step 2: Link en AppHeader**

En `app/components/AppHeader.vue`, después del `</NuxtLink>` de `/simulador` (línea 50), dentro del mismo `<nav class="header-tools">`:

```html
      <NuxtLink to="/cadena" class="tool-nav-link" title="Cadena de valor agro">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 13h12M3 13V8m3.3 5V5.5m3.4 7.5V7m3.3 6V3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="tool-nav-label">Cadena agro</span>
      </NuxtLink>
```

- [ ] **Step 3: Verificar en la app corriendo**

Run: `npm run dev` → `http://localhost:3000/cadena`.
Expected: (1) barras EVA de Banano en Apartadó con pico >400.000 t (2023 exporta 426.160 t); tabla con t/ha ~40; (2) líneas SIPSA de "Banano Urabá" 12 meses; cambiar producto redibuja; (3) barras FOB 2019–2025 con 2024 ≈ US$560M resaltado y top destinos encabezados por Italia. Municipio sin un cultivo (p. ej. cambiar a un cultivo exótico) → mensaje "Sin registros EVA…" sin errores en consola. Link "Cadena agro" visible en el header del mapa.

- [ ] **Step 4: Build + commit + push**

Run: `npm run build` → verde.

```bash
git add app/pages/cadena.vue app/components/AppHeader.vue
git commit -m "feat: página /cadena — producción EVA, precios SIPSA y exportación FOB en un solo flujo"
git push
```

---

### Task 5: Policy brief A4 `/brief/[municipio]`

**Files:**
- Create: `app/utils/briefSlugs.js`
- Create: `app/pages/brief/[municipio].vue`

**Interfaces:**
- Consumes: `useEquidad()` (Task 2); JSONs `atlas_stats_v3, gap_analysis, benchmarks, top_prioridad, eva_produccion_serie`.
- Produces: `MUNICIPIO_SLUGS` (objeto slug→nombre) y `slugFor(nombre)` — los usa Task 6 para los botones. Ruta `/brief/<slug>` con 404 para slugs desconocidos.

- [ ] **Step 1: Utilidad de slugs**

`app/utils/briefSlugs.js` (Nuxt 4 auto-importa `app/utils/`):

```js
// briefSlugs.js — mapeo slug de URL ↔ nombre canónico de municipio.
export const MUNICIPIO_SLUGS = {
  'apartado': 'Apartadó',
  'turbo': 'Turbo',
  'chigorodo': 'Chigorodó',
  'carepa': 'Carepa',
  'necocli': 'Necoclí',
  'arboletes': 'Arboletes',
  'san-pedro-de-uraba': 'San Pedro de Urabá',
  'san-juan-de-uraba': 'San Juan de Urabá',
}

export function slugFor(nombre) {
  return Object.keys(MUNICIPIO_SLUGS).find(s => MUNICIPIO_SLUGS[s] === nombre) ?? null
}
```

- [ ] **Step 2: Crear `app/pages/brief/[municipio].vue`**

```html
<template>
  <div class="brief-wrap">
    <!-- Barra de acciones — NO se imprime -->
    <div class="brief-bar no-print">
      <NuxtLink to="/" class="bb-back">← Atlas</NuxtLink>
      <span class="bb-title">Policy brief · {{ nombre }}</span>
      <button class="bb-print" @click="descargarPdf">Descargar PDF</button>
    </div>

    <div v-if="pending" class="brief-state no-print">Cargando datos…</div>

    <!-- ══════════ HOJA A4 ══════════ -->
    <article v-else class="brief-a4">
      <!-- 1 · Encabezado -->
      <header class="b-head">
        <div class="b-brand">
          <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
            <rect x="7" y="7" width="22" height="22" rx="2.5" stroke="#1B6B6D" stroke-width="1.8" transform="rotate(45 18 18)"/>
            <rect x="12" y="12" width="12" height="12" rx="1.5" fill="#1B6B6D" transform="rotate(45 18 18)"/>
          </svg>
          <span>ATLAS URABÁ · TENSOR</span>
        </div>
        <span class="b-fecha">Generado {{ hoy }} · uraba.tensor.lat</span>
      </header>

      <h1 class="b-mun">{{ nombre }}</h1>
      <p class="b-sub">Policy brief territorial · Antioquia, región Urabá · 1 página</p>

      <!-- 2 · Score + dimensiones vs benchmarks -->
      <section class="b-scores">
        <div class="b-score-big">
          <span class="b-score-n">{{ score }}</span>
          <span class="b-score-d">/100 · Índice v3</span>
          <span class="b-nivel">{{ nivel }}</span>
        </div>
        <table class="b-dims">
          <thead>
            <tr><th>Dimensión</th><th>{{ nombre }}</th><th>Urabá</th><th>Antioquia</th><th>Colombia</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in dims" :key="d.label">
              <td>{{ d.label }}</td>
              <td class="b-strong" :style="{ color: d.color }">{{ d.mun }}</td>
              <td>{{ d.uraba }}</td>
              <td>{{ d.antioquia }}</td>
              <td>{{ d.colombia }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 3 · Narrativa de gaps -->
      <section v-if="narrativa" class="b-block">
        <h2 class="b-h2">Diagnóstico</h2>
        <p class="b-texto">{{ narrativa }}</p>
      </section>

      <!-- 4 · Equidad interna -->
      <section v-if="eq" class="b-block">
        <h2 class="b-h2">Equidad interna</h2>
        <p class="b-texto">
          Gini del score entre manzanas: <strong>{{ eq.gini.toFixed(2) }}</strong> ·
          brecha p90−p10: <strong>{{ Math.round(eq.brecha_p90_p10 * 100) }} pts</strong> ·
          <strong>{{ eq.manzanas_criticas }}</strong> manzanas críticas
          ({{ Math.round(eq.pct_criticas * 100) }}% de {{ eq.n_manzanas.toLocaleString('es-CO') }}),
          bajo el p25 regional de Urabá.
        </p>
      </section>

      <!-- 5 · Top-5 manzanas prioritarias -->
      <section v-if="top5.length" class="b-block">
        <h2 class="b-h2">Manzanas prioritarias de inversión</h2>
        <table class="b-top5">
          <thead><tr><th>#</th><th>Código DANE manzana</th><th>Prioridad</th><th>Score</th></tr></thead>
          <tbody>
            <tr v-for="(m, i) in top5" :key="m.cod_manzana">
              <td>{{ i + 1 }}</td>
              <td class="b-mono">{{ m.cod_manzana }}</td>
              <td>{{ m.prioridad }} ({{ m.prioridad_pct }}%)</td>
              <td>{{ Math.round(m.atlas_score * 100) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 6 · Agro (condicional) + 7 · satélite -->
      <section class="b-block b-cols">
        <div v-if="agro">
          <h2 class="b-h2">Economía agro ({{ agro.anio }})</h2>
          <p class="b-texto">
            Banano: <strong>{{ agro.produccion.toLocaleString('es-CO') }} t</strong> en
            {{ agro.area.toLocaleString('es-CO') }} ha sembradas
            ({{ agro.rendimiento.toFixed(1) }} t/ha). Detalle en uraba.tensor.lat/cadena.
          </p>
        </div>
        <div v-if="satelite">
          <h2 class="b-h2">Señales satelitales</h2>
          <p class="b-texto">
            Temp. superficial media <strong>{{ satelite.lst }} °C</strong> (Landsat) ·
            radiancia nocturna <strong>{{ satelite.viirs }}</strong> nW/cm²·sr (VIIRS).
          </p>
        </div>
      </section>

      <!-- 8 · Fuentes -->
      <footer class="b-fuentes">
        <strong>Fuentes:</strong> DANE CNPV 2018 · DANE/MADR EVA · DANE SIPSA · DANE-DIAN exportaciones ·
        isócronas OSRM · Sentinel-2/Landsat 9/VIIRS (Google Earth Engine) · REPS · SIMAT ·
        cálculos propios Atlas Urabá v3. Índice de equidad: cálculo propio (Gini sobre atlas_score_v3).
        Documento generado automáticamente — verificar cifras críticas antes de uso oficial.
      </footer>
    </article>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEquidad } from '~/composables/useEquidad'
import { MUNICIPIO_SLUGS } from '~/utils/briefSlugs'

const route = useRoute()
const nombre = MUNICIPIO_SLUGS[route.params.municipio]
if (!nombre) {
  throw createError({ statusCode: 404, statusMessage: 'Municipio no encontrado' })
}

const { data: statsRaw, pending: p1 } = await useFetch('/data/atlas_stats_v3.json', { server: false, lazy: true })
const { data: gapRaw,   pending: p2 } = await useFetch('/data/gap_analysis.json', { server: false, lazy: true })
const { data: benchRaw, pending: p3 } = await useFetch('/data/benchmarks.json', { server: false, lazy: true })
const { data: topRaw,   pending: p4 } = await useFetch('/data/top_prioridad.json', { server: false, lazy: true })
const { data: evaRaw,   pending: p5 } = await useFetch('/data/eva_produccion_serie.json', { server: false, lazy: true })
const { equidad } = useEquidad()

const pending = computed(() => p1.value || p2.value || p3.value || p4.value || p5.value)

const hoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

const pct = v => Math.round((v ?? 0) * 100)
const avg = computed(() => statsRaw.value?.municipios?.[nombre]?.avg ?? {})
const gap = computed(() => gapRaw.value?.[nombre] ?? {})

const score = computed(() => gap.value.atlas_score ?? pct(avg.value.atlas_score_v3))
const nivel = computed(() => {
  const n = gap.value.nivel ?? ''
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : ''
})
const narrativa = computed(() => gap.value.narrativa ?? '')

// Dimensiones v3 municipio vs benchmarks (todo llevado a 0–100).
const DIMS = [
  { label: 'Accesibilidad',  v3: 'score_accesibilidad_v3',  bench: 'score_accesibilidad' },
  { label: 'Ambiental',      v3: 'score_ambiental_v3',      bench: 'score_ambiental' },
  { label: 'Socioeconómico', v3: 'score_socioeconomico_v3', bench: 'score_socioeconomico' },
  { label: 'Seguridad',      v3: 'score_seguridad',         bench: 'score_seguridad' },
]
const dims = computed(() => {
  const refs = benchRaw.value?.referencias ?? {}
  return DIMS.map(d => {
    const mun = pct(avg.value[d.v3])
    const uraba = pct(refs.uraba_promedio?.[d.bench])
    return {
      label: d.label,
      mun,
      uraba,
      antioquia: pct(refs.antioquia_promedio?.[d.bench]),
      colombia: pct(refs.colombia_promedio?.[d.bench]),
      color: mun >= uraba ? '#1a9850' : '#d73027',
    }
  })
})

const eq = computed(() => equidad.value?.municipios?.[nombre] ?? null)
const top5 = computed(() => (topRaw.value?.[nombre] ?? []).slice(0, 5))

// Agro: banano del municipio, último año con datos. Omitir si no hay.
const agro = computed(() => {
  const m = Object.values(evaRaw.value?.data ?? {}).find(x => x.municipio === nombre)
  const series = m?.cultivos?.Banano?.series
  if (!series) return null
  const anios = Object.keys(series).sort()
  if (!anios.length) return null
  const ult = anios[anios.length - 1]
  const arr = Array.isArray(series[ult]) ? series[ult] : [series[ult]]
  const produccion = arr.reduce((t, d) => t + (+d.produccion_ton || 0), 0)
  const area = arr.reduce((t, d) => t + (+d.area_sembrada_ha || 0), 0)
  const cosechada = arr.reduce((t, d) => t + (+d.area_cosechada_ha || 0), 0)
  if (!produccion) return null
  return { anio: ult, produccion, area, rendimiento: cosechada ? produccion / cosechada : 0 }
})

const satelite = computed(() => {
  const a = avg.value
  if (a.lst_c == null && a.viirs_rad == null) return null
  return {
    lst: a.lst_c != null ? (Math.round(a.lst_c * 10) / 10).toLocaleString('es-CO') : '—',
    viirs: a.viirs_rad != null ? (Math.round(a.viirs_rad * 10) / 10).toLocaleString('es-CO') : '—',
  }
})

function descargarPdf() { window.print() }

useHead({ title: `Brief · ${nombre} · Atlas Urabá` })
</script>

<style scoped>
/* Pantalla: hoja centrada sobre fondo neutro. */
.brief-wrap { min-height: 100vh; background: #e8e8e4; padding-bottom: 40px; }
.brief-bar { display: flex; align-items: center; gap: 16px; padding: 12px 24px; background: #0d1211; color: #e7e5e0; }
.bb-back { color: #8a8a85; text-decoration: none; font-size: 12px; }
.bb-back:hover { color: #e7e5e0; }
.bb-title { flex: 1; font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: 0.08em; }
.bb-print { background: #1B6B6D; color: #fff; border: 0; border-radius: 6px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
.bb-print:hover { filter: brightness(1.1); }
.brief-state { padding: 60px; text-align: center; font-family: ui-monospace, monospace; color: #5F5F5B; }

/* Hoja A4: 210mm de ancho, alto libre en pantalla (una página al imprimir). */
.brief-a4 { width: 210mm; min-height: 280mm; margin: 24px auto 0; background: #fff; color: #1c1c1a;
  padding: 14mm 16mm; box-shadow: 0 2px 24px rgba(0,0,0,0.18); box-sizing: border-box;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; font-size: 10.5px; line-height: 1.45; }
.b-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.b-brand { display: flex; align-items: center; gap: 7px; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: 0.14em; color: #1B6B6D; font-weight: 700; }
.b-fecha { font-size: 8.5px; color: #8a8a85; }
.b-mun { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; margin: 2px 0 0; }
.b-sub { font-size: 10px; color: #5F5F5B; margin: 2px 0 12px; }
.b-scores { display: grid; grid-template-columns: 130px 1fr; gap: 18px; align-items: center; padding: 10px 0 12px; border-top: 2px solid #1B6B6D; border-bottom: 1px solid #e2e2de; }
.b-score-big { display: flex; flex-direction: column; }
.b-score-n { font-size: 44px; font-weight: 700; color: #1B6B6D; line-height: 1; }
.b-score-d { font-size: 9px; color: #8a8a85; }
.b-nivel { margin-top: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #5F5F5B; }
.b-dims { width: 100%; border-collapse: collapse; font-size: 10px; }
.b-dims th { text-align: right; font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a8a85; padding: 3px 6px; }
.b-dims th:first-child, .b-dims td:first-child { text-align: left; }
.b-dims td { text-align: right; padding: 3px 6px; border-top: 1px solid #f0f0ec; }
.b-strong { font-weight: 700; }
.b-block { margin-top: 11px; }
.b-h2 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: #1B6B6D; margin-bottom: 4px; font-weight: 700; }
.b-texto { margin: 0; }
.b-top5 { width: 100%; border-collapse: collapse; font-size: 9.5px; }
.b-top5 th { text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a8a85; padding: 2px 6px; }
.b-top5 td { padding: 2.5px 6px; border-top: 1px solid #f0f0ec; }
.b-mono { font-family: ui-monospace, monospace; font-size: 8.5px; }
.b-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.b-fuentes { margin-top: 14px; padding-top: 8px; border-top: 1px solid #e2e2de; font-size: 7.8px; color: #8a8a85; line-height: 1.5; }

/* Impresión: solo la hoja, exactamente una página A4. */
@media print {
  .no-print { display: none !important; }
  .brief-wrap { background: #fff; padding: 0; }
  .brief-a4 { width: auto; min-height: 0; margin: 0; box-shadow: none; padding: 0; }
  @page { size: A4; margin: 12mm; }
}
</style>
```

- [ ] **Step 3: Verificar en la app corriendo**

Run: `npm run dev` →
1. `http://localhost:3000/brief/apartado` — hoja A4 con score (72 según gap_analysis), tabla 4 dimensiones × 4 columnas de benchmark, narrativa, equidad, top-5 manzanas con códigos DANE de 22 dígitos, bloque agro (Apartadó tiene banano) y señales satelitales.
2. `http://localhost:3000/brief/san-pedro-de-uraba` — carga; si no tiene banano en EVA, el bloque agro NO aparece (sin errores de consola).
3. `http://localhost:3000/brief/medellin` — página 404 de Nuxt.
4. Botón "Descargar PDF" → diálogo de impresión; en la vista previa el brief ocupa **exactamente 1 página** sin cortes (ajustar tamaños de fuente/márgenes si desborda — este es el criterio de aceptación duro).

- [ ] **Step 4: Build + commit + push**

Run: `npm run build` → verde.

```bash
git add app/utils/briefSlugs.js app/pages/brief/
git commit -m "feat: policy brief A4 imprimible por municipio en /brief/[municipio]"
git push
```

---

### Task 6: Accesos al brief desde la ficha y el comparador

**Files:**
- Modify: `app/components/FichaMunicipal.vue` (bloque `ficha-actions`, líneas 12–33)
- Modify: `app/pages/comparar.vue` (bajo cada `<MunicipioCard>`, líneas 50–52 y 93–95)

**Interfaces:**
- Consumes: `slugFor(nombre)` de `app/utils/briefSlugs.js` (auto-import de Nuxt).

- [ ] **Step 1: Botón en FichaMunicipal**

En `<script setup>` de `FichaMunicipal.vue`:

```js
import { slugFor } from '~/utils/briefSlugs'

const briefUrl = computed(() => {
  const s = slugFor(store.municipioActivo)
  return s ? `/brief/${s}` : null
})
```

En el template, dentro de `<div class="ficha-actions no-print">`, antes del botón "Imprimir":

```html
            <NuxtLink v-if="briefUrl" :to="briefUrl" class="action-btn" title="Policy brief A4">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 2h6l3 3v9H4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
                <path d="M10 2v3h3M6.5 9h4M6.5 11.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              Brief PDF
            </NuxtLink>
```

(Con municipio "Todos", `briefUrl` es `null` y el botón no aparece.)

- [ ] **Step 2: Enlaces en comparar**

En `app/pages/comparar.vue`, dentro de cada `<section class="cmp-col">`, después del `<MunicipioCard>`:

```html
            <NuxtLink :to="`/brief/${slugFor(munA)}`" class="cmp-brief-link">Policy brief A4 →</NuxtLink>
```

(y `munB` en la columna B). En el `<style scoped>` de la página:

```css
.cmp-brief-link { display: inline-block; margin-top: 10px; font-family: ui-monospace, monospace; font-size: 10px; color: #1B6B6D; text-decoration: none; letter-spacing: 0.06em; }
.cmp-brief-link:hover { text-decoration: underline; }
```

`slugFor` se auto-importa desde `app/utils/`; si el linter lo pide explícito: `import { slugFor } from '~/utils/briefSlugs'`.

- [ ] **Step 3: Verificar en la app corriendo**

Expected: ficha de Apartadó muestra "Brief PDF" → navega a `/brief/apartado`; con "Todos" no hay botón. En `/comparar`, ambas columnas tienen su enlace y navegan al municipio correcto.

- [ ] **Step 4: Build + commit + push**

Run: `npm run build` → verde.

```bash
git add app/components/FichaMunicipal.vue app/pages/comparar.vue
git commit -m "feat: accesos al policy brief desde la ficha municipal y el comparador"
git push
```

---

### Task 7: Verificación final integrada

**Files:** ninguno nuevo — QA de cierre.

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: verde; el prebuild sincroniza 4 archivos (incluido `equidad_municipios.json`).

- [ ] **Step 2: Recorrido completo en dev**

Run: `npm run dev` y recorrer:
1. Mapa principal → ranking con toggle score/desigualdad → ficha de Turbo con bloque equidad → botón "Brief PDF".
2. `/cadena`: los 3 bloques con datos reales y fuentes citadas; cambiar municipio/cultivo/producto/año sin errores de consola.
3. `/brief/turbo`: 1 página exacta en vista previa de impresión; imprimir a PDF real (Guardar como PDF) y revisar el archivo.
4. Regresión del flujo crítico del mapa: hover de manzanas, cambio de dimensión, satélite on/off — sin errores (no se tocó `useAtlasMap.js`, pero verificar).

- [ ] **Step 3: Deploy y verificación en prod**

Push a `main` despliega a `uraba.tensor.lat` (Vercel). Verificar `/cadena` y `/brief/apartado` en producción (los JSON estáticos viajan en `public/`).

- [ ] **Step 4: Actualizar HANDOFF.md**

Reescribir `HANDOFF.md` con el estado de este sprint (qué se agregó, pendientes que siguen: paleta verde/teal, rutas defensivas, carga eager). Commit + push:

```bash
git add HANDOFF.md
git commit -m "docs: handoff sprint atlas para decisores"
git push
```

---

## Self-review (hecho al escribir el plan)

- **Cobertura del spec:** Pieza 1 → Tasks 1–3 · Pieza 2 → Task 4 · Pieza 3 → Tasks 5–6 · verificación → Task 7. Nota de escalas → Global Constraints + `pct()` en código. Sync de assets → Task 1 Step 3. Validación 404 → Task 5. Fail-quiet → Tasks 2, 3, 5.
- **Tipos consistentes:** `useEquidad()` → `{ equidad }` (Tasks 2, 3, 5); `equidad.municipios[nombre].{gini,p10,p90,brecha_p90_p10,manzanas_criticas,pct_criticas,n_manzanas}` idéntico entre el script Python y todos los consumidores; `MUNICIPIO_SLUGS`/`slugFor` (Tasks 5–6).
- **Sin placeholders:** todo step de código incluye el código completo; los pasos de verificación traen valores esperados concretos (426.160 t, US$560M, score 72, Italia como destino #1).
