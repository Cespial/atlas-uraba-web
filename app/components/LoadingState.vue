<template>
  <div class="loading-overlay">
    <!-- Logo Tensor animado -->
    <div class="loading-logo">
      <svg width="40" height="40" viewBox="0 0 36 36" fill="none" class="logo-spin">
        <rect x="7" y="7" width="22" height="22" rx="2.5"
              stroke="#1B6B6D" stroke-width="1.8" stroke-opacity="0.5"
              transform="rotate(45 18 18)" />
      </svg>
      <svg width="40" height="40" viewBox="0 0 36 36" fill="none" class="logo-inner">
        <rect x="12" y="12" width="12" height="12" rx="1.5"
              fill="#1B6B6D" fill-opacity="0.9"
              transform="rotate(45 18 18)" />
      </svg>
    </div>

    <!-- Texto -->
    <div class="loading-text">
      <p class="loading-title">Atlas Urabá</p>
      <p class="loading-sub">Cargando datos territoriales...</p>
    </div>

    <!-- Skeleton forma aproximada de Urabá -->
    <div class="uraba-skeleton" aria-hidden="true">
      <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" class="uraba-svg">
        <!-- Forma aproximada del Urabá antioqueño — polígono simplificado -->
        <path
          d="M55 8
             C62 6, 72 10, 78 18
             C85 26, 88 35, 86 45
             C90 52, 92 60, 88 70
             C84 80, 78 88, 75 98
             C80 106, 82 116, 78 126
             C74 136, 65 142, 56 145
             C46 148, 36 144, 30 136
             C22 128, 20 116, 24 106
             C28 96, 35 88, 34 78
             C30 68, 26 58, 28 48
             C30 38, 36 28, 42 20
             C46 14, 50 9, 55 8Z"
          class="uraba-fill"
        />
        <!-- Ríos internos estilizados (Atrato + León) -->
        <path
          d="M42 30 C44 45, 40 60, 38 75 C36 90, 38 108, 40 124"
          class="uraba-river"
          stroke-linecap="round"
        />
        <path
          d="M60 50 C65 58, 72 64, 76 74"
          class="uraba-river"
          stroke-linecap="round"
        />
      </svg>
    </div>

    <!-- Barra de progreso shimmer -->
    <div class="loading-bar">
      <div class="loading-bar-fill" />
    </div>

    <!-- Chips de fuentes -->
    <div class="loading-chips">
      <span class="chip">CNPV 2018</span>
      <span class="chip">REPS MinSalud</span>
      <span class="chip">SIMAT MEN</span>
      <span class="chip">OSM Colombia</span>
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.loading-overlay {
  position: absolute; inset: 0; z-index: 50;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: #0D1117; gap: 16px;
}

.loading-logo {
  position: relative; width: 40px; height: 40px;
}
.logo-spin {
  position: absolute; inset: 0;
  animation: spin 3s linear infinite;
}
.logo-inner {
  position: absolute; inset: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

.loading-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px; font-weight: 600;
  letter-spacing: -0.36px; color: #E6EDF3;
  margin: 0;
}
.loading-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; text-transform: uppercase;
  letter-spacing: 0.18em; color: #1B6B6D;
  margin: 4px 0 0;
}

/* ── Skeleton Urabá ───────────────────────────────────── */
.uraba-skeleton {
  width: 80px;
  height: 107px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.uraba-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 6px rgba(27, 107, 109, 0.25));
}

.uraba-fill {
  fill: rgba(27, 107, 109, 0.18);
  stroke: #1B6B6D;
  stroke-width: 1.5;
  animation: uraba-pulse 2s ease-in-out infinite;
}

.uraba-river {
  stroke: rgba(65, 182, 196, 0.45);
  stroke-width: 1.2;
  fill: none;
  animation: uraba-pulse 2s ease-in-out infinite;
  animation-delay: 0.3s;
}

@keyframes uraba-pulse {
  0%, 100% {
    opacity: 0.4;
    stroke-opacity: 0.4;
    fill-opacity: 0.12;
  }
  50% {
    opacity: 1;
    stroke-opacity: 1;
    fill-opacity: 0.28;
  }
}

.loading-bar {
  width: 160px; height: 2px;
  background: #30363D; border-radius: 1px; overflow: hidden;
}
.loading-bar-fill {
  height: 100%; border-radius: 1px;
  background: linear-gradient(90deg, transparent, #1B6B6D, #41b6c4, transparent);
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.loading-chips {
  display: flex; flex-wrap: wrap;
  gap: 6px; justify-content: center;
  max-width: 300px;
}
.chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px; text-transform: uppercase;
  letter-spacing: 0.1em; color: #8B949E;
  padding: 2px 7px; border-radius: 3px;
  background: rgba(255,255,255,0.04);
  border: 1px solid #30363D;
}
</style>
