<template>
  <div>
    <h1>Genetic Walker - Aprendizaje de caminata</h1>
    <div class="panel">
      <button @click="sim?.start()">Iniciar entrenamiento</button>
      <button @click="sim?.pause()">Pausar</button>
      <button @click="sim?.reset()">Reiniciar</button>
      <button @click="sim?.step()">Ejecutar 1 generación</button>
      <button @click="sim?.showBestNow()">Mostrar mejor individuo</button>
      <label><input type="checkbox" v-model="options.hillClimbEnabled" /> Hill Climbing</label>
      <label><input type="checkbox" v-model="options.adaptiveMutation" /> Mutación adaptativa</label>
      <label><input type="checkbox" v-model="options.fastMode" /> Modo rápido</label>
      <label><input type="checkbox" v-model="options.showBest" /> Modo visual mejor</label>
    </div>

    <div class="stats">
      <p>Generación: {{ stats.generation }}</p>
      <p>Best: {{ stats.bestFitness.toFixed(2) }} | Avg: {{ stats.avgFitness.toFixed(2) }} | Mediana: {{ stats.medianFitness.toFixed(2) }}</p>
      <p>Diversidad: {{ stats.diversity.toFixed(3) }} | Plateau: {{ stats.plateauGenerations }} | Eval/s: {{ stats.evaluationsPerSecond.toFixed(1) }}</p>
      <p>HC aplicado: {{ stats.hillClimbApplied ? 'Sí' : 'No' }} | Mutación adaptativa: {{ stats.adaptiveMutationApplied ? 'Sí' : 'No' }}</p>
      <pre>{{ stats.bestGenes }}</pre>
      <p>Historial: <span v-for="h in stats.history" :key="h.generation">[G{{ h.generation }} B{{ h.bestFitness.toFixed(1) }} A{{ h.avgFitness.toFixed(1) }}] </span></p>
    </div>

    <canvas id="world"></canvas>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { createSimulation } from './scenes/simulation.js';

const stats = ref({ generation: 0, bestFitness: 0, avgFitness: 0, medianFitness: 0, diversity: 0, plateauGenerations: 0, evaluationsPerSecond: 0, bestGenes: {}, hillClimbApplied: false, adaptiveMutationApplied: false, history: [] });
const options = reactive({ hillClimbEnabled: true, adaptiveMutation: true, fastMode: true, showBest: true });
let sim = null;

onMounted(() => {
  sim = createSimulation(stats, { value: options });
});
</script>
