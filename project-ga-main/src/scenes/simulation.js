import { createWorld } from "../physics/world.js";
import { createGround } from "../physics/ground";
import { Creature } from "../physics/creature";

import { GeneticAlgorithm } from "../ia/geneticAlgorithm.js";
import { evaluateFitness } from "../ia/fitness.js";

const POPULATION_SIZE = 20;
const SIMULATION_TIME = 300;

export function startSimulation(generationRef, bestFitnessRef) {
  const { world } = createWorld();

  createGround(world);

  const ga = new GeneticAlgorithm();

  let population = [];
  let generation = 0;
  let currentCreature = null;
  let currentIndex = 0;

  function randomGenes() {
    return [Math.random() * 0.1, Math.random() * 2, Math.random() * 0.05];
  }

  function createPopulation(genesArray = null) {
    population = [];

    for (let i = 0; i < POPULATION_SIZE; i++) {
      const genes = genesArray ? genesArray[i] : randomGenes();

      population.push({
        genes,
        fitness: 0,
      });
    }
  }
  // Crear la criatura en la posicion y tomar X y Y para crear el cuerpo en Creature.JS
  function spawnCurrentCreature() {
    if (currentCreature) {
      currentCreature.remove();
    }

    const individual = population[currentIndex];
    currentCreature = new Creature(world, 100, 578, individual.genes);
  }

  createPopulation();
  spawnCurrentCreature();

  let ticks = 0;

  setInterval(() => {
    currentCreature.update();

    ticks++;

    if (ticks > SIMULATION_TIME) {
      population[currentIndex].fitness = evaluateFitness(currentCreature);

      currentIndex++;

      if (currentIndex >= population.length) {
        population.sort((a, b) => b.fitness - a.fitness);

        bestFitnessRef.value = population[0].fitness;

        generation++;
        generationRef.value = generation;

        const nextGenes = ga.nextGeneration(population);

        createPopulation(nextGenes);
        currentIndex = 0;
      }

      spawnCurrentCreature();
      ticks = 0;
    }
  }, 16);
}
