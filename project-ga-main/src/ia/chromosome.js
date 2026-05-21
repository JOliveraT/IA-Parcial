export const GENE_SPECS = [
  { key: 'hipAmplitude', min: 0.15, max: 0.75 },
  { key: 'kneeAmplitude', min: 0.1, max: 0.9 },
  { key: 'stepFrequency', min: 1.0, max: 3.0 },
  { key: 'phaseOffset', min: 2.8, max: 3.4 },
  { key: 'hipBias', min: -0.2, max: 0.2 },
  { key: 'kneeBias', min: 0.1, max: 0.5 },
  { key: 'motorStrength', min: 0.002, max: 0.015 },
  { key: 'torsoStability', min: 0.001, max: 0.01 },
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
