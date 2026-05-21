export const GENE_SPECS = [
  { key: 'hipAmplitude', min: 0.18, max: 0.72 },
  { key: 'kneeAmplitude', min: 0.2, max: 1.2 },
  { key: 'stepFrequency', min: 1.2, max: 3.2 },
  { key: 'phaseOffset', min: 2.7, max: 3.5 },
  { key: 'hipBias', min: -0.25, max: 0.25 },
  { key: 'kneeBias', min: 0.08, max: 0.5 },
  { key: 'motorStrength', min: 0.004, max: 0.02 },
  { key: 'bodyStability', min: 0.003, max: 0.03 },
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
