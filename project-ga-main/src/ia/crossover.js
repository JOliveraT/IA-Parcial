import { clamp01 } from './chromosome';

export function blxAlpha(parentA, parentB, alpha = 0.2) {
  return parentA.map((geneA, i) => {
    const geneB = parentB[i];
    const min = Math.min(geneA, geneB);
    const max = Math.max(geneA, geneB);
    const range = max - min;
    const low = min - alpha * range;
    const high = max + alpha * range;
    return clamp01(low + Math.random() * (high - low));
  });
}

export function uniformCrossover(parentA, parentB) {
  return parentA.map((gene, i) => (Math.random() < 0.5 ? gene : parentB[i]));
}
