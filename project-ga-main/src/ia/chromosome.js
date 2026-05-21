export const GENE_SPECS = [
  { key: 'hipAmplitude', min: 0.2, max: 0.9 },
  { key: 'kneeAmplitude', min: 0.2, max: 1.2 },
  { key: 'stepFrequency', min: 0.8, max: 3.2 },
  { key: 'phaseOffset', min: 2.4, max: 3.9 },
  { key: 'hipBias', min: -0.35, max: 0.25 },
  { key: 'kneeBias', min: 0.1, max: 0.9 },
  { key: 'kneePhase', min: -1.2, max: 1.3 },
  { key: 'bodyPitchAmplitude', min: 0.01, max: 0.35 },
  { key: 'bodyPitchBias', min: -0.2, max: 0.2 },
  { key: 'strideLength', min: 35, max: 150 },
  { key: 'stabilityFactor', min: 0.3, max: 1.3 },
  { key: 'energyFactor', min: 0.3, max: 1.5 },
];

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function randomChromosome() {
  return GENE_SPECS.map(() => Math.random());
}

export function decodeChromosome(chromosome) {
  const decoded = {};
  for (let i = 0; i < GENE_SPECS.length; i += 1) {
    const spec = GENE_SPECS[i];
    const normalized = clamp01(chromosome[i] ?? 0.5);
    decoded[spec.key] = spec.min + normalized * (spec.max - spec.min);
  }
  return decoded;
}
