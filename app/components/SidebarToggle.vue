<template>
  <button
    v-if="showToggle"
    class="sidebar-toggle"
    :style="{ left: isOpen ? 'var(--atlas-panel-w,260px)' : '0' }"
    @click="$emit('toggle')"
    :aria-label="isOpen ? 'Ocultar panel' : 'Mostrar panel'"
  >
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path :d="isOpen ? 'M7 2L3 5l4 3' : 'M3 2l4 3-4 3'"
        stroke="#5F5F5B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({ isOpen: Boolean })
defineEmits(['toggle'])

const showToggle = ref(false)

function checkSize() {
  showToggle.value = window.innerWidth >= 640 && window.innerWidth < 1024
}

onMounted(() => { checkSize(); window.addEventListener('resize', checkSize) })
onUnmounted(() => window.removeEventListener('resize', checkSize))
</script>

<style scoped>
.sidebar-toggle {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 48px;
  background: var(--dk-panel, #161B22);
  border: 1px solid var(--dk-border, #30363D);
  border-left: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  transition: left 0.25s ease, background 0.15s ease;
  padding: 0;
}

.sidebar-toggle:hover {
  background: var(--dk-border, #30363D);
}
</style>
