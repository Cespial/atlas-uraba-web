<template>
  <div v-if="texto" class="editorial-card">
    <div class="ed-header">
      <span class="ed-label">{{ texto.nombre }}</span>
    </div>
    <p class="ed-desc">{{ texto.descripcion }}</p>
    <div v-if="munTexto" class="ed-mun">
      {{ munTexto.score_nota }}
    </div>
    <div v-if="texto.contexto_uraba" class="ed-context">
      {{ texto.contexto_uraba }}
    </div>
    <div class="ed-fuente">{{ texto.fuente }}</div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAtlasStore } from '~/stores/atlas'

const store = useAtlasStore()
const editorial = ref(null)

onMounted(async () => {
  try {
    const res = await fetch('/data/editorial.json')
    editorial.value = await res.json()
  } catch(e) {}
})

const texto = computed(() => editorial.value?.indicadores?.[store.dimension] ?? null)
const munTexto = computed(() => {
  if (!editorial.value || store.municipioActivo === 'Todos') return null
  return editorial.value.municipios?.[store.municipioActivo] ?? null
})
</script>

<style scoped>
.editorial-card {
  padding: 10px 12px;
  background: var(--cbg, #F2F1EE);
  border: 1px solid var(--cb, #E5E5E0);
  border-left: 3px solid var(--ca, #1B6B6D);
  border-radius: 0 6px 6px 0;
  margin-bottom: 10px;
}
.ed-header { margin-bottom: 5px; }
.ed-label {
  font-family: var(--ff-mono); font-size: 8px; text-transform: uppercase;
  letter-spacing: 0.15em; color: var(--ca, #1B6B6D); font-weight: 500;
}
.ed-desc {
  font-family: var(--ff-body); font-size: 11.5px; color: var(--c2, #3D3D3D);
  line-height: 1.55; margin: 0 0 6px;
}
.ed-mun {
  padding: 5px 8px; background: rgba(27,107,109,0.07); border-radius: 4px;
  font-family: var(--ff-mono); font-size: 9px; color: var(--ca, #1B6B6D);
  margin-bottom: 6px;
}
.ed-context {
  font-family: var(--ff-body); font-size: 11px; color: var(--cm, #5F5F5B);
  line-height: 1.5; margin-bottom: 6px;
  padding: 4px 0; border-top: 1px solid var(--cb, #E5E5E0);
}
.ed-fuente {
  font-family: var(--ff-mono); font-size: 7.5px; color: var(--cm, #5F5F5B);
  letter-spacing: 0.08em; border-top: 1px solid var(--cb, #E5E5E0); padding-top: 5px;
}
</style>
