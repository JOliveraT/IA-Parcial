<template>
  <main class="app">
    <header class="topbar">
      <h1>Genetic Walker</h1>
      <div class="controls">
        <button @click="sim?.start()">Iniciar</button>
        <button @click="sim?.pause()">Pausar</button>
        <button @click="sim?.reset()">Reiniciar</button>
        <button @click="sim?.showBestNow()">Ver mejor</button>
      </div>
    </header>

    <section class="hud">
      <p>Generación: <strong>{{ stats.generation }}</strong></p>
      <p>Mejor distancia: <strong>{{ stats.bestDistance.toFixed(1) }}</strong></p>
      <p>Estado: <strong>{{ stats.status }}</strong></p>
      <p>Visual: <strong>{{ stats.replayLabel }}</strong></p>
    </section>

    <canvas id="world"></canvas>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { createSimulation } from './scenes/simulation';

const stats = ref({ generation: 0, bestDistance: 0, reachedGoal: false, status: 'Pausado', replayLabel: 'Listo para iniciar' });
let sim = null;

onMounted(() => {
  sim = createSimulation(stats, { value: {} });
});
</script>
