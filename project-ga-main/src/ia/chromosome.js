const DEG = Math.PI / 180;

const KEYFRAME_COUNT = 8;
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
  { key: 'cycleDuration', min: 1.0, max: 2.6 },
  { key: 'dutyFactor', min: 0.35, max: 0.65 },
  { key: 'hipHeightBias', min: -16, max: 16 },
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const randn = () => {
  let u = 0; let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export function clamp01(v) { return clamp(v, 0, 1); }

function encodeValue(value, spec) {
  return clamp01((value - spec.min) / (spec.max - spec.min));
}

function buildChromosomeFromDecoded(decoded) {
  return GENE_SPECS.map((spec) => encodeValue(decoded[spec.key], spec));
}

export function randomChromosome() {
  return GENE_SPECS.map(() => Math.random());
}

export function createWalkingSeed() {
  const baseFrames = [
    { leftHip: 30 * DEG, leftKnee: 18 * DEG, rightHip: -30 * DEG, rightKnee: 96 * DEG, bodyPitch: -7 * DEG },
    { leftHip: 20 * DEG, leftKnee: 12 * DEG, rightHip: -12 * DEG, rightKnee: 72 * DEG, bodyPitch: -4 * DEG },
    { leftHip: -10 * DEG, leftKnee: 18 * DEG, rightHip: 20 * DEG, rightKnee: 20 * DEG, bodyPitch: 2 * DEG },
    { leftHip: -30 * DEG, leftKnee: 96 * DEG, rightHip: 30 * DEG, rightKnee: 18 * DEG, bodyPitch: 7 * DEG },
    { leftHip: -12 * DEG, leftKnee: 72 * DEG, rightHip: 20 * DEG, rightKnee: 12 * DEG, bodyPitch: 4 * DEG },
    { leftHip: 20 * DEG, leftKnee: 20 * DEG, rightHip: -10 * DEG, rightKnee: 18 * DEG, bodyPitch: -2 * DEG },
    { leftHip: 30 * DEG, leftKnee: 18 * DEG, rightHip: -30 * DEG, rightKnee: 96 * DEG, bodyPitch: -7 * DEG },
    { leftHip: 22 * DEG, leftKnee: 14 * DEG, rightHip: -18 * DEG, rightKnee: 78 * DEG, bodyPitch: -5 * DEG },
  ];

  const decoded = {};
  for (let frame = 0; frame < KEYFRAME_COUNT; frame += 1) {
    const kf = baseFrames[frame];
    decoded[`kf_${frame}_leftHip`] = kf.leftHip;
    decoded[`kf_${frame}_leftKnee`] = kf.leftKnee;
    decoded[`kf_${frame}_rightHip`] = kf.rightHip;
    decoded[`kf_${frame}_rightKnee`] = kf.rightKnee;
    decoded[`kf_${frame}_bodyPitch`] = kf.bodyPitch;
  }

  decoded.cycleDuration = 1.3;
  decoded.dutyFactor = 0.58;
  decoded.hipHeightBias = -4;

  return buildChromosomeFromDecoded(decoded);
}

export function createMutatedWalkingSeed(sigma = 0.12) {
  const seed = decodeChromosome(createWalkingSeed());
  const decoded = {};

  for (const spec of GENE_SPECS) {
    const value = seed[spec.key] + randn() * sigma * (spec.max - spec.min);
    decoded[spec.key] = clamp(value, spec.min, spec.max);
  }

  return buildChromosomeFromDecoded(decoded);
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
