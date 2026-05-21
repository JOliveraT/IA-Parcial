<template>
  <main class="app">
    <header class="topbar">
      <h1>Genetic Walker</h1>
      <div class="controls">
        <button @click="sim?.start()">Iniciar</button>
        <button @click="sim?.pause()">Pausar</button>
        <button @click="sim?.reset()">Reiniciar</button>
        <button @click="sim?.showBestNow()">Ver mejor individuo</button>
      </div>
    </header>

    <section class="hud">
      <p>Generación actual: <strong>{{ stats.generation }}</strong></p>
      <p>Mejor distancia: <strong>{{ stats.bestDistance.toFixed(1) }}</strong></p>
      <p>Estado: <strong>{{ stats.status }}</strong></p>
    </section>

    <canvas id="world"></canvas>

    <details class="details">
      <summary>Opciones avanzadas</summary>
      <button @click="sim?.step()">Ejecutar 1 generación</button>
      <p>Úsalo solo para pruebas puntuales. El flujo principal recomendado es automático con “Iniciar”.</p>
    </details>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { createSimulation } from './scenes/simulation';

const stats = ref({ generation: 0, bestDistance: 0, reachedGoal: false, status: 'Pausado' });
let sim = null;

onMounted(() => {
  sim = createSimulation(stats, { value: {} });
});
</script>
