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
      <!-- Shape real de Urabá derivado de MGN DANE 2024 -->
      <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg" class="uraba-svg">
        <path
          d="M 126.1,207.6 L 175.6,268.4 L 139.7,262.8 L 133.3,270.0 L 128.0,269.0 L 119.3,252.9 L 87.5,232.3 L 84.6,226.6 L 101.8,223.6 L 83.2,223.2 L 73.4,209.8 L 43.4,201.3 L 20.0,176.6 L 34.7,163.1 L 48.1,140.7 L 46.8,114.5 L 53.2,122.3 L 52.6,133.0 L 70.0,131.1 L 65.6,144.6 L 54.0,147.3 L 55.5,159.4 L 75.2,162.0 L 86.1,152.7 L 81.8,95.2 L 73.5,82.9 L 53.9,70.7 L 63.5,63.1 L 97.3,56.0 L 108.0,47.6 L 142.7,30.0 L 146.5,45.7 L 174.4,70.6 L 180.0,91.7 L 162.3,107.4 L 153.3,127.6 L 141.9,139.4 L 140.3,158.2 L 130.2,178.9 L 126.1,207.6 Z"
          class="uraba-fill"
        />
        <!-- Golfo de Urabá (agua) -->
        <path d="M 43.4,201.3 L 87.5,232.3 L 101.8,223.6 L 83.2,223.2 L 73.4,209.8 Z"
              fill="rgba(65,182,196,0.12)" stroke="none"/>
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
  width: 70px;
  height: 105px;
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
