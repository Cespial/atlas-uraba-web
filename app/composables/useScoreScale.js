// useScoreScale.js — Fuente única de la escala de score de los PANELES.
// =============================================================================
// Paleta "verde" canónica (definida en main.css como --score-1..6) y sus
// etiquetas. Antes estaba copiada verbatim en FichaMunicipal, ScoreRankingList y
// DiagnosticoPanel, con riesgo de derivar entre sí y respecto a la leyenda.
//
// OJO: el mapa coroplético usa una paleta DISTINTA (teal Tensor, en
// useAtlasMap.buildColorExprFromScore). Son intencionalmente diferentes; no
// unificar aquí sin una decisión de diseño explícita.
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
