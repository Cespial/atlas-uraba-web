<template>
  <footer class="absolute bottom-0 left-0 right-0 z-20 h-7
                 flex items-center justify-between px-4
                 bg-atlas-bg/80 border-t border-atlas-border/50">
    <span class="font-mono text-[8px] uppercase tracking-[0.1em] text-atlas-muted">
      © 2025 Tensor · CNPV 2018 · REPS MinSalud · SIMAT MEN · OSM Colombia · MGN DANE 2024
    </span>
    <span class="flex items-center gap-3">
      <NuxtLink to="/metodologia"
         class="font-mono text-[8px] uppercase tracking-[0.1em] text-tensor-teal/70
                hover:text-tensor-teal transition-colors">
        Metodología
      </NuxtLink>
      <NuxtLink to="/api"
         class="font-mono text-[8px] uppercase tracking-[0.1em] text-tensor-teal/70
                hover:text-tensor-teal transition-colors">
        API pública
      </NuxtLink>
      <a href="https://tensor.lat" target="_blank"
         class="font-mono text-[8px] uppercase tracking-[0.1em] text-tensor-teal/70
                hover:text-tensor-teal transition-colors">
        tensor.lat
      </a>
    </span>
  </footer>
</template>
<script setup></script>
