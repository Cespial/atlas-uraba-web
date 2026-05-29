<template>
  <header class="fixed top-0 left-0 right-0 z-30 flex items-center justify-between
                 px-4 h-[52px] bg-atlas-bg border-b border-atlas-border
                 backdrop-blur-sm">
    <!-- Logo -->
    <TensorLogo />

    <!-- Centro: selector municipio (md+) -->
    <div class="hidden md:flex items-center gap-1">
      <button
        v-for="mun in MUNICIPIOS_SHORT"
        :key="mun.nombre"
        @click="store.setMunicipio(mun.nombre)"
        :class="[
          'px-2.5 py-1 rounded-md font-mono text-[9px] uppercase tracking-[0.12em] transition-all',
          store.municipioActivo === mun.nombre
            ? 'bg-tensor-teal/20 text-tensor-teal border border-tensor-teal/40'
            : 'text-atlas-muted hover:text-atlas-text hover:bg-white/5 border border-transparent'
        ]"
      >{{ mun.short }}</button>
    </div>

    <!-- Derecha: badges info -->
    <div class="flex items-center gap-2">
      <span class="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md
                   bg-white/5 border border-atlas-border">
        <span class="w-1.5 h-1.5 rounded-full bg-tensor-teal animate-pulse" />
        <span class="font-mono text-[9px] uppercase tracking-[0.12em] text-atlas-muted">
          7,028 manzanas
        </span>
      </span>
      <span class="hidden lg:block font-mono text-[9px] uppercase tracking-[0.1em] text-atlas-muted">
        CNPV 2018
      </span>
    </div>
  </header>
</template>

<script setup>
import { useAtlasStore, MUNICIPIOS } from '~/stores/atlas'
const store = useAtlasStore()
const MUNICIPIOS_SHORT = MUNICIPIOS.map(m => ({
  nombre: m.nombre,
  short: m.nombre === 'Todos' ? 'Todos' : m.nombre.replace('San ', 'S.').split(',')[0].split(' de')[0]
}))
</script>
