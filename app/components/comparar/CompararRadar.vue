<template>
  <svg :viewBox="`0 0 ${size} ${size}`" class="radar" role="img" :aria-label="`Radar de dimensiones ${label}`">
    <!-- anillos de referencia -->
    <polygon
      v-for="r in rings"
      :key="r"
      :points="ringPoints(r)"
      class="radar-ring"
    />
    <!-- ejes -->
    <line
      v-for="(d, i) in dims"
      :key="`ax-${i}`"
      :x1="cx" :y1="cy"
      :x2="axisPoint(i).x" :y2="axisPoint(i).y"
      class="radar-axis"
    />
    <!-- polígono de datos -->
    <polygon :points="dataPoints" class="radar-area" :style="{ fill: fillColor, stroke: color }" />
    <!-- vértices -->
    <circle
      v-for="(d, i) in dims"
      :key="`v-${i}`"
      :cx="valuePoint(i).x" :cy="valuePoint(i).y"
      r="3"
      :fill="color"
    />
    <!-- etiquetas -->
    <text
      v-for="(d, i) in dims"
      :key="`l-${i}`"
      :x="labelPoint(i).x" :y="labelPoint(i).y"
      class="radar-label"
      :text-anchor="labelAnchor(i)"
    >{{ d.short }}</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // dims: [{ short, value (0-100) }]
  dims:  { type: Array,  required: true },
  color: { type: String, default: '#1B6B6D' },
  label: { type: String, default: '' },
})

const size = 220
const cx = size / 2
const cy = size / 2
const radius = size / 2 - 34
const rings = [0.25, 0.5, 0.75, 1]

const fillColor = computed(() => {
  // color con baja opacidad
  return hexToRgba(props.color, 0.18)
})

function hexToRgba(hex, a) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function angle(i) {
  // empezar arriba, en sentido horario
  return (-Math.PI / 2) + (i * 2 * Math.PI / props.dims.length)
}

function point(i, r) {
  const a = angle(i)
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
}

function axisPoint(i) { return point(i, radius) }

function valuePoint(i) {
  const v = Math.max(0, Math.min(100, props.dims[i].value ?? 0)) / 100
  return point(i, radius * v)
}

function labelPoint(i) {
  const p = point(i, radius + 16)
  return p
}

function labelAnchor(i) {
  const p = point(i, radius + 16)
  const dx = p.x - cx
  if (Math.abs(dx) < 6) return 'middle'
  return dx > 0 ? 'start' : 'end'
}

function ringPoints(scale) {
  return props.dims.map((_, i) => {
    const p = point(i, radius * scale)
    return `${p.x},${p.y}`
  }).join(' ')
}

const dataPoints = computed(() =>
  props.dims.map((_, i) => {
    const p = valuePoint(i)
    return `${p.x},${p.y}`
  }).join(' ')
)
</script>

<style scoped>
.radar { width: 100%; height: auto; display: block; overflow: visible; }
.radar-ring {
  fill: none;
  stroke: var(--cb, #E5E5E0);
  stroke-width: 1;
}
.radar-axis {
  stroke: var(--cb, #E5E5E0);
  stroke-width: 1;
}
.radar-area {
  stroke-width: 2;
  transition: all 0.4s ease;
}
.radar-label {
  font-family: var(--ff-mono, monospace);
  font-size: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  fill: var(--cm, #5F5F5B);
}
</style>
