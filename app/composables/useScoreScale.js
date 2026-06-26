// useScoreScale.js — Escala de score VERDE compartida por FichaMunicipal y
// ScoreRankingList (antes copiada verbatim en ambos).
// =============================================================================
// ALCANCE: solo consolida esos dos paneles. NO es aún la fuente única de la app:
// - DiagnosticoPanel usa var(--score-N), que en main.css resuelve a la paleta
//   TEAL Tensor (la "nueva escala"), por lo que hoy pinta distinto que estos dos.
// - MobileSheet, ManzanaPanel, MapLegend y HistogramPanel mantienen su propia
//   copia (verde); PanoramaPanel y comparar usan teal hardcodeado.
// La convergencia a una sola paleta (verde vs teal) es una decisión de diseño
// pendiente, deliberadamente fuera de este módulo.
// Entrada esperada: score normalizado en [0, 1].
// =============================================================================

export function scoreColor(v) {
  const n = +v
  if (n >= 0.85) return '#1a9850'
  if (n >= 0.70) return '#66bd63'
  if (n >= 0.55) return '#a6d96a'
  if (n >= 0.40) return '#fdae61'
  if (n >= 0.20) return '#f46d43'
  return '#d73027'
}

export function scoreLabel(v) {
  const n = +v
  if (n >= 0.85) return 'Excelente'
  if (n >= 0.70) return 'Alto'
  if (n >= 0.55) return 'Medio-alto'
  if (n >= 0.40) return 'Medio-bajo'
  if (n >= 0.20) return 'Bajo'
  return 'Crítico'
}

export function useScoreScale() {
  return { scoreColor, scoreLabel }
}
