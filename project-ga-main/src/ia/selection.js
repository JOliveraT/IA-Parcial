export function tournamentSelection(population) {
  const size = 3;

  let best = null;

  for (let i = 0; i < size; i++) {
    const random = population[Math.floor(Math.random() * population.length)];

    if (!best || random.fitness > best.fitness) {
      best = random;
    }
  }

  return best;
}
