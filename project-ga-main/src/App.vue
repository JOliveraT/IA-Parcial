<template>
  <div>
    <h1>Genetic Walker</h1>

    <div class="stats">
      <p>Generation: {{ generation }}</p>
      <p>Best Fitness: {{ bestFitness.toFixed(2) }}</p>
    </div>

    <canvas id="world"></canvas>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { startSimulation } from "./scenes/simulation";

const generation = ref(0);
const bestFitness = ref(0);

onMounted(() => {
  startSimulation(generation, bestFitness);
});
</script>

<style>
body {
  margin: 0;
  overflow: hidden;
  background: #111;
  color: white;
  font-family: Arial;
}

.stats {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
}
</style>
