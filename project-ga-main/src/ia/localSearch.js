import { clamp01 } from './chromosome';

function gaussianRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function hillClimbElite(elite, evaluateOne, config) {
  let best = { ...elite, genes: [...elite.genes] };
  let improved = false;

  for (let n = 0; n < config.hillClimbNeighbors; n++) {
    const neighborGenes = [...best.genes];
    const changes = Math.random() < 0.5 ? 1 : 2;

    for (let c = 0; c < changes; c++) {
      const idx = Math.floor(Math.random() * neighborGenes.length);
      neighborGenes[idx] = clamp01(neighborGenes[idx] + gaussianRandom() * config.hillClimbSigma);
    }

    const fitness = evaluateOne(neighborGenes);
    if (fitness > best.fitness) {
      best = { genes: neighborGenes, fitness };
      improved = true;
    }
  }

  return { elite: best, improved };
}
