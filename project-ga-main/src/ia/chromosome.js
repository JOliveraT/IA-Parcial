const DEG = Math.PI / 180;

const KEYFRAME_COUNT = 6;
const JOINT_KEYS = ['leftHip', 'leftKnee', 'rightHip', 'rightKnee', 'bodyPitch'];

const JOINT_LIMITS = {
  leftHip: { min: -50 * DEG, max: 50 * DEG },
  rightHip: { min: -50 * DEG, max: 50 * DEG },
  leftKnee: { min: 0, max: 120 * DEG },
  rightKnee: { min: 0, max: 120 * DEG },
  bodyPitch: { min: -25 * DEG, max: 25 * DEG },
};

export const GENE_SPECS = [
  ...Array.from({ length: KEYFRAME_COUNT }).flatMap((_, frame) =>
    JOINT_KEYS.map((joint) => ({ key: `kf_${frame}_${joint}`, ...JOINT_LIMITS[joint] })),
  ),
  { key: 'cycleDuration', min: 0.95, max: 2.4 },
  { key: 'pushScale', min: 0.28, max: 1.1 },
  { key: 'bodyHeightBias', min: -14, max: 14 },
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function clamp01(v) { return clamp(v, 0, 1); }

export function randomChromosome() {
  return GENE_SPECS.map(() => Math.random());
}

export function decodeChromosome(chromosome) {
  const decoded = {};
  for (let i = 0; i < GENE_SPECS.length; i += 1) {
    const spec = GENE_SPECS[i];
    const t = clamp01(chromosome[i] ?? 0.5);
    decoded[spec.key] = spec.min + t * (spec.max - spec.min);
  }

  decoded.keyframes = Array.from({ length: KEYFRAME_COUNT }).map((_, frame) => ({
    leftHip: decoded[`kf_${frame}_leftHip`],
    leftKnee: decoded[`kf_${frame}_leftKnee`],
    rightHip: decoded[`kf_${frame}_rightHip`],
    rightKnee: decoded[`kf_${frame}_rightKnee`],
    bodyPitch: decoded[`kf_${frame}_bodyPitch`],
  }));

  return decoded;
}

export const CHROMOSOME_LAYOUT = { KEYFRAME_COUNT, JOINT_KEYS, JOINT_LIMITS };
