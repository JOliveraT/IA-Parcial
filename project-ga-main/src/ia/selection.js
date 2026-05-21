export function tournamentSelection(population, tournamentSize = 2) {
  let best = null;
  for (let i = 0; i < tournamentSize; i++) {
    const candidate = population[Math.floor(Math.random() * population.length)];
    if (!best || candidate.fitness > best.fitness) best = candidate;
  }
  return best;
}
