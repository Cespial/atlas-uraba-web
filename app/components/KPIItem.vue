<template>
  <div class="flex flex-col items-center leading-none">
    <span class="font-head font-semibold text-[13px] tracking-[-0.26px]"
          :style="{ color: color || '#E6EDF3' }">{{ value }}</span>
    <span class="font-mono text-[7px] uppercase tracking-[0.15em] text-atlas-muted mt-0.5">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({ label: String, value: String, color: String })
</script>
