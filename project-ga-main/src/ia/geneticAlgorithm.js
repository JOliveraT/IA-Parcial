import { tournamentSelection } from "./selection";
import { crossover } from "./crossover";
import { mutate } from "./mutation";

export class GeneticAlgorithm {
  nextGeneration(population) {
    population.sort((a, b) => b.fitness - a.fitness);

    const newPopulation = [];

    // Elitismo
    newPopulation.push(population[0].genes);

    while (newPopulation.length < population.length) {
      const parentA = tournamentSelection(population);

      const parentB = tournamentSelection(population);

      let child = crossover(parentA.genes, parentB.genes);

      child = mutate(child);

      newPopulation.push(child);
    }

    return newPopulation;
  }
}
