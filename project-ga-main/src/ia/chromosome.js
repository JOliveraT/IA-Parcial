export const GENE_SPECS = [
  { key: 'hipAmp', min: 0.15, max: 1.2 },
  { key: 'kneeAmp', min: 0.05, max: 0.9 },
  { key: 'frequency', min: 0.6, max: 3.5 },
  { key: 'phaseOffset', min: 2.6, max: 3.7 },
  { key: 'kneeLag', min: 0.1, max: 1.8 },
  { key: 'torsoBias', min: -0.25, max: 0.25 },
  { key: 'stabilityGain', min: 0.0, max: 0.8 },
  { key: 'controlScale', min: 0.2, max: 1.5 },
];

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function randomChromosome() {
  return GENE_SPECS.map(() => Math.random());
}

export function decodeChromosome(chromosome) {
  const decoded = {};

  for (let i = 0; i < GENE_SPECS.length; i++) {
    const spec = GENE_SPECS[i];
    const normalized = clamp01(chromosome[i] ?? 0.5);
    decoded[spec.key] = spec.min + normalized * (spec.max - spec.min);
  }

  return decoded;
}
