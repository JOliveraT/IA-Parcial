export const GENE_SPECS = [
  { key: 'hipAmplitude', min: 0.25, max: 0.96 }, // ~14º..55º
  { key: 'kneeAmplitude', min: 0.5, max: 1.9 }, // ~29º..109º
  { key: 'stepFrequency', min: 1.0, max: 3.2 },
  { key: 'phaseOffset', min: 2.6, max: 3.7 }, // anti-phase
  { key: 'hipBias', min: -0.3, max: 0.22 },
  { key: 'kneeBias', min: 0.08, max: 0.82 },
  { key: 'kneePhase', min: -0.95, max: 1.05 },
  { key: 'bodyPitchAmplitude', min: 0.0, max: 0.16 },
  { key: 'bodyPitchBias', min: -0.12, max: 0.12 },
  { key: 'strideLength', min: 1.1, max: 3.6 },
  { key: 'stabilityFactor', min: 0.45, max: 1.35 },
  { key: 'energyFactor', min: 0.35, max: 1.45 },
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
