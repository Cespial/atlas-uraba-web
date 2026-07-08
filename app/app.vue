<template>
  <!-- overflow-y-auto: el mapa (index) mide exactamente h-screen y no scrollea;
       las páginas largas (/cadena, /brief, /comparar) sí. -->
  <div class="h-screen w-screen overflow-x-hidden overflow-y-auto bg-atlas-bg text-atlas-text">
    <NuxtPage />
  </div>
</template>
