export const GENE_SPECS = [
  { key: 'hipAmplitude', min: 0.1, max: 0.8 },
  { key: 'kneeAmplitude', min: 0.2, max: 1.5 },
  { key: 'stepFrequency', min: 0.8, max: 3.5 },
  { key: 'phaseOffset', min: 2.5, max: 3.8 },
  { key: 'hipBias', min: -0.3, max: 0.3 },
  { key: 'kneeBias', min: 0.05, max: 0.8 },
  { key: 'kneePhase', min: -1.5, max: 1.5 },
  { key: 'motorStrength', min: 0.004, max: 0.03 },
  { key: 'bodyPitchAmplitude', min: 0, max: 0.35 },
  { key: 'bodyPitchBias', min: -0.25, max: 0.25 },
  { key: 'bodyStability', min: 0.004, max: 0.06 },
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
