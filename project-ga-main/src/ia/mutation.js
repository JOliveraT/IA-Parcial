import { clamp01 } from './chromosome';

function gaussianRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function mutateGaussianBounded(chromosome, config) {
  const perGeneRate = config.mutationRate ?? 1 / chromosome.length;
  const sigma = config.mutationSigma ?? 0.08;

  return chromosome.map((gene) => {
    if (Math.random() >= perGeneRate) return gene;
    return clamp01(gene + gaussianRandom() * sigma);
  });
}
