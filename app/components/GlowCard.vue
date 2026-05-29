<template>
  <component
    :is="tag"
    ref="cardRef"
    class="glow-card"
    :class="[$attrs.class]"
    v-bind="omitClass($attrs)"
    @mousemove="onMove"
    @mouseleave="onLeave"
  >
    <slot />
  </component>
</template>

<script setup>
import { ref, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })
defineProps({ tag: { type: String, default: 'div' } })

const cardRef = ref(null)
const attrs = useAttrs()

function omitClass(a) {
  const { class: _, ...rest } = a
  return rest
}

function onMove(e) {
  const el = cardRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1)
  const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1)
  el.style.setProperty('--glow-x', `${x}%`)
  el.style.setProperty('--glow-y', `${y}%`)
}

function onLeave() {
  const el = cardRef.value
  if (el) {
    el.style.setProperty('--glow-x', '50%')
    el.style.setProperty('--glow-y', '50%')
  }
}
</script>
