import { clamp01 } from './chromosome';

function gaussianRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function hillClimbElite(elite, evaluateOne, config) {
  let best = { ...elite, chromosome: [...elite.chromosome] };
  let improved = false;

  for (let n = 0; n < config.hillClimbNeighbors; n += 1) {
    const neighbor = [...best.chromosome];
    const changes = Math.random() < 0.5 ? 1 : 2;

    for (let c = 0; c < changes; c += 1) {
      const idx = Math.floor(Math.random() * neighbor.length);
      neighbor[idx] = clamp01(neighbor[idx] + gaussianRandom() * config.hillClimbSigma);
    }

    const fitness = evaluateOne(neighbor);
    if (fitness > best.fitness) {
      best = { ...best, chromosome: neighbor, fitness };
      improved = true;
    }
  }

  return { elite: best, improved };
}
