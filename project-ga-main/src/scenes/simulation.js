import { IA_CONFIG } from '../ia/config';
import { randomChromosome, decodeChromosome, CHROMOSOME_LAYOUT, createMutatedWalkingSeed, createWalkingSeed } from '../ia/chromosome';
import { computeFitness } from '../ia/fitness';
import { tournamentSelection } from '../ia/selection';
import { blxAlpha } from '../ia/crossover';
import { mutateGaussianBounded } from '../ia/mutation';
import { hillClimbElite } from '../ia/localSearch';
import { Creature } from '../physics/creature';

const GROUND_Y = 480;
const CONTACT_THRESHOLD = 12;
const MINOR_GROUND_PENETRATION_PX = 5;
const MODERATE_GROUND_PENETRATION_PX = 15;
const SEVERE_GROUND_PENETRATION_PX = 24;
const INITIAL_GROUND_GRACE_FRAMES = 20;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const PHASE = { EVAL: 'Evaluando', REPLAY: 'Reproduciendo mejor intento', RESET: 'Reiniciando' };

const creature = new Creature();
const L = creature.cfg.femur;
const T = creature.cfg.tibia;

function samplePose(genes, time) {
  const n = CHROMOSOME_LAYOUT.KEYFRAME_COUNT;
  const t = (time % genes.cycleDuration) / genes.cycleDuration;
  const pos = t * n;
  const i0 = Math.floor(pos) % n;
  const i1 = (i0 + 1) % n;
  const f = pos - Math.floor(pos);
  const a = genes.keyframes[i0];
  const b = genes.keyframes[i1];
  return {
    leftHip: lerp(a.leftHip, b.leftHip, f),
    leftKnee: lerp(a.leftKnee, b.leftKnee, f),
    rightHip: lerp(a.rightHip, b.rightHip, f),
    rightKnee: lerp(a.rightKnee, b.rightKnee, f),
    bodyPitch: lerp(a.bodyPitch, b.bodyPitch, f),
  };
}

function legVector(bodyPitch, hip, knee) {
  const thighAng = bodyPitch + Math.PI / 2 + hip;
  const shinAng = thighAng + knee;
  return { x: Math.cos(thighAng) * L + Math.cos(shinAng) * T, y: Math.sin(thighAng) * L + Math.sin(shinAng) * T };
}

function classifyPenetration(penetration) {
  if (penetration <= 0) return { level: 'none', penalty: 0, severe: false };
  if (penetration <= MINOR_GROUND_PENETRATION_PX) return { level: 'minor', penalty: penetration * 0.9, severe: false };
  if (penetration <= MODERATE_GROUND_PENETRATION_PX) return { level: 'moderate', penalty: 7 + penetration * 2.8, severe: false };
  return { level: 'major', penalty: 30 + penetration * 8, severe: penetration >= SEVERE_GROUND_PENETRATION_PX };
}

function validateInitialPose(chromosome) {
  const genes = decodeChromosome(chromosome);
  const pose = samplePose(genes, 0);
  const stance = 'left';
  const stanceVec = legVector(pose.bodyPitch, pose.leftHip, pose.leftKnee);
  const stanceFoot = { x: IA_CONFIG.startX + stanceVec.x, y: GROUND_Y };
  const x = stanceFoot.x - stanceVec.x;
  const y = stanceFoot.y - stanceVec.y - genes.hipHeightBias;
  const points = creature.getPosePoints({ x, y, pose });
  const leftPenetration = Math.max(0, points.left.foot.y - GROUND_Y);
  const rightPenetration = Math.max(0, points.right.foot.y - GROUND_Y);
  const swingPenetration = Math.max(0, points.right.foot.y - GROUND_Y);
  const correctedY = y + Math.min(3, swingPenetration);
  const correctedPoints = creature.getPosePoints({ x, y: correctedY, pose });
  return {
    stanceLeg: stance,
    x,
    y: correctedY,
    pose,
    leftFootY: correctedPoints.left.foot.y,
    rightFootY: correctedPoints.right.foot.y,
    leftPenetration: Math.max(0, correctedPoints.left.foot.y - GROUND_Y),
    rightPenetration: Math.max(0, correctedPoints.right.foot.y - GROUND_Y),
    reasonOfFailure: Math.max(leftPenetration, rightPenetration) > MODERATE_GROUND_PENETRATION_PX ? 'Pose inicial inválida por penetración excesiva' : null,
  };
}

function runAttempt(chromosome, visual = false) {
  const genes = decodeChromosome(chromosome);
  const duty = genes.dutyFactor;
  let t = 0;
  const initialState = validateInitialPose(chromosome);
  let stance = initialState.stanceLeg;
  let stanceFoot = { x: initialState.x + legVector(initialState.pose.bodyPitch, initialState.pose.leftHip, initialState.pose.leftKnee).x, y: GROUND_Y };
  let bestX = IA_CONFIG.startX;
  let aliveSteps = 0;
  let validSteps = 0;
  let stagnation = 0;
  let invalidPosePenalty = 0;
  let groundPenetrationPenalty = 0;
  let invalidGroundContactPenalty = 0;
  let footSlipPenalty = 0;
  let energyPenalty = 0;
  let alternationGood = 0;
  let alternationTotal = 0;
  let stanceQuality = 0;
  let moderatePenetrationCount = 0;
  let reasonOfFailure = initialState.reasonOfFailure;
  const frames = [];
  const debugState = { leftFootY: initialState.leftFootY, rightFootY: initialState.rightFootY, groundY: GROUND_Y, leftPenetration: initialState.leftPenetration, rightPenetration: initialState.rightPenetration, stanceLeg: stance, phase: 0, reasonOfFailure };

  for (let step = 0; step < IA_CONFIG.maxSteps; step += 1) {
    const phase = (t % genes.cycleDuration) / genes.cycleDuration;
    const desiredStance = phase < duty ? 'left' : 'right';
    const pose = samplePose(genes, t);

    if (desiredStance !== stance) {
      const prevPoints = creature.getPosePoints({ x: bestX, y: GROUND_Y - 120, pose });
      const swingFoot = desiredStance === 'left' ? prevPoints.left.foot : prevPoints.right.foot;
      const swingPenetration = Math.max(0, swingFoot.y - GROUND_Y);
      const nearGround = Math.abs(swingFoot.y - GROUND_Y) <= CONTACT_THRESHOLD;
      const aboveOrOnGround = swingFoot.y <= GROUND_Y;
      const validReach = Math.abs(swingFoot.x - stanceFoot.x) > 6;
      alternationTotal += 1;
      if (nearGround && aboveOrOnGround && validReach) {
        stance = desiredStance;
        stanceFoot = { x: swingFoot.x, y: GROUND_Y };
        validSteps += 1;
        alternationGood += 1;
      } else {
        invalidPosePenalty += 12;
        invalidGroundContactPenalty += 20;
        if (swingPenetration > 0) {
          groundPenetrationPenalty += classifyPenetration(swingPenetration).penalty;
        }
      }
    }

    const stanceVec = stance === 'left'
      ? legVector(pose.bodyPitch, pose.leftHip, pose.leftKnee)
      : legVector(pose.bodyPitch, pose.rightHip, pose.rightKnee);

    const x = stanceFoot.x - stanceVec.x;
    const y = stanceFoot.y - stanceVec.y - genes.hipHeightBias;

    const points = creature.getPosePoints({ x, y, pose });
    const stanceFootNow = stance === 'left' ? points.left.foot : points.right.foot;
    const swingFootNow = stance === 'left' ? points.right.foot : points.left.foot;
    stanceFoot.y = GROUND_Y;
    footSlipPenalty += Math.abs(stanceFootNow.x - stanceFoot.x) * 2.2;
    stanceQuality += clamp(1 - Math.abs(stanceFootNow.x - stanceFoot.x) / 12, 0, 1);

    const stancePenetration = Math.max(0, stanceFootNow.y - GROUND_Y);
    const swingPenetration = Math.max(0, swingFootNow.y - GROUND_Y);
    const maxPenetration = Math.max(stancePenetration, swingPenetration);
    const stanceClass = classifyPenetration(stancePenetration);
    const swingClass = classifyPenetration(swingPenetration);
    groundPenetrationPenalty += stanceClass.penalty + swingClass.penalty;
    if (stanceClass.level === 'minor') invalidGroundContactPenalty += 1;
    if (swingClass.level === 'minor') invalidGroundContactPenalty += 0.6;
    if (stanceClass.level === 'moderate') { invalidGroundContactPenalty += 9; moderatePenetrationCount += 1; }
    if (swingClass.level === 'moderate') { invalidGroundContactPenalty += 6; moderatePenetrationCount += 1; }
    if (stanceClass.level === 'major') invalidGroundContactPenalty += 45;
    if (swingClass.level === 'major') invalidGroundContactPenalty += 26;

    const torsoBottom = Math.max(...points.torso.map((p) => p.y));
    const hipsGap = Math.abs(points.hipL.x - points.hipR.x);
    const legsCrossed = (points.left.knee.x - points.right.knee.x) * (points.left.foot.x - points.right.foot.x) < -20;

    if (Math.abs(pose.bodyPitch) > 0.72) invalidPosePenalty += 14;
    if (torsoBottom >= GROUND_Y + 4) invalidPosePenalty += 22;
    if (torsoBottom < GROUND_Y - 210) invalidPosePenalty += 8;
    if (legsCrossed) invalidPosePenalty += 25;
    if (hipsGap < 8) invalidPosePenalty += 5;

    energyPenalty += (Math.abs(pose.leftHip) + Math.abs(pose.rightHip) + pose.leftKnee + pose.rightKnee) * 0.02;

    bestX = Math.max(bestX, x);
    if (bestX <= x + 0.02) stagnation += 1; else stagnation = 0;

    const stagnated = aliveSteps > IA_CONFIG.minStepsBeforeStagnation && stagnation > 260;
    const severePenetrationNow = stanceClass.severe || swingClass.severe;
    const allowGroundGrace = step < INITIAL_GROUND_GRACE_FRAMES && !severePenetrationNow;
    const penetrationFailure = !allowGroundGrace && (
      maxPenetration > MODERATE_GROUND_PENETRATION_PX
      || moderatePenetrationCount > 8
    );
    const failed = torsoBottom >= GROUND_Y + 12
      || invalidPosePenalty > 2200
      || penetrationFailure
      || stagnated;
    if (!reasonOfFailure && failed) {
      if (penetrationFailure) reasonOfFailure = `Violación del suelo (maxPenetration=${maxPenetration.toFixed(2)})`;
      else if (torsoBottom >= GROUND_Y + 12) reasonOfFailure = 'Torso colisionó con suelo';
      else if (stagnated) reasonOfFailure = 'Estancamiento';
      else reasonOfFailure = 'Pose inválida';
    }
    const done = x >= IA_CONFIG.goalX;
    aliveSteps = step + 1;
    debugState.leftFootY = points.left.foot.y;
    debugState.rightFootY = points.right.foot.y;
    debugState.leftPenetration = stance === 'left' ? stancePenetration : swingPenetration;
    debugState.rightPenetration = stance === 'right' ? stancePenetration : swingPenetration;
    debugState.stanceLeg = stance;
    debugState.phase = phase;
    debugState.reasonOfFailure = reasonOfFailure;

    if (visual) {
      const visualPoints = {
        ...points,
        left: {
          ...points.left,
          foot: { ...points.left.foot, y: Math.min(points.left.foot.y, GROUND_Y) },
        },
        right: {
          ...points.right,
          foot: { ...points.right.foot, y: Math.min(points.right.foot.y, GROUND_Y) },
        },
      };
      frames.push({
        x,
        y,
        pose,
        points: visualPoints,
        failed,
        done,
        stanceLeg: stance,
        phase,
        stanceFoot: { ...stanceFoot },
        penetratedGround: maxPenetration > 0.25,
        reasonOfFailure,
        debug: { ...debugState },
      });
    }
    if (failed || done) break;

    t += IA_CONFIG.fixedDeltaSeconds;
  }

  const distance = Math.max(0, bestX - IA_CONFIG.startX);
  const failed = aliveSteps < IA_CONFIG.maxSteps && (frames.at(-1)?.failed ?? false);
  const reachedGoal = bestX >= IA_CONFIG.goalX;

  const fitness = computeFitness({
    validDistance: distance,
    validSteps,
    stanceQuality: stanceQuality / Math.max(1, aliveSteps),
    alternationQuality: alternationGood / Math.max(1, alternationTotal),
    reachedGoal,
    failed,
    aliveSteps,
    footSlipPenalty,
    stagnationPenalty: stagnation * 2,
    invalidPosePenalty,
    groundPenetrationPenalty,
    invalidGroundContactPenalty,
    energyPenalty,
  });

  if (visual) {
    console.debug('[runAttempt]', debugState);
  }
  return { chromosome: [...chromosome], genes, fitness, distance, failed, reachedGoalFinal: reachedGoal, validSteps, aliveSteps, frames, reasonOfFailure, debug: debugState };
}

export function validateWalkingSeed() {
  const seed = createWalkingSeed();
  const result = runAttempt(seed, false);
  return {
    distance: Number(result.distance.toFixed(2)),
    validSteps: result.validSteps,
    fell: result.failed,
    fitness: Number(result.fitness.toFixed(2)),
    aliveSteps: result.aliveSteps,
    reasonOfFailure: result.reasonOfFailure,
  };
}

export function createSimulation(statsRef) {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  let running = false; let generation = 0; let population = []; let shown = null; let replay = null; let plateaus = 0;

  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize(); addEventListener('resize', resize);

  const resetPopulation = () => {
    population = Array.from({ length: IA_CONFIG.populationSize }, (_, i) => {
      if (i < IA_CONFIG.populationSize * 0.6) return { chromosome: createMutatedWalkingSeed(0.06) };
      if (i < IA_CONFIG.populationSize * 0.8) return { chromosome: createMutatedWalkingSeed(0.18) };
      return { chromosome: randomChromosome() };
    });
    generation = 0; shown = null; replay = null; running = false; plateaus = 0;
    statsRef.value = { generation: 0, bestDistance: 0, status: 'Pausado', replayLabel: 'Listo para iniciar', phase: PHASE.RESET };
  };

  const nextPop = (sorted) => {
    const elites = sorted.slice(0, IA_CONFIG.eliteSize).map((e) => ({ chromosome: [...e.chromosome] }));
    const out = [...elites];
    while (out.length < IA_CONFIG.populationSize) {
      if (plateaus >= IA_CONFIG.plateauLimit) {
        if (Math.random() < 0.5) { out.push({ chromosome: randomChromosome() }); continue; }
        out.push({ chromosome: createMutatedWalkingSeed(0.14) });
        continue;
      }
      const a = tournamentSelection(sorted, IA_CONFIG.tournamentSize);
      const b = tournamentSelection(sorted, IA_CONFIG.tournamentSize);
      out.push({ chromosome: mutateGaussianBounded(blxAlpha(a.chromosome, b.chromosome, IA_CONFIG.crossoverAlpha), IA_CONFIG) });
    }
    return out;
  };

  const trainOneGeneration = () => {
    const evals = population.map((p) => runAttempt(p.chromosome, false)).sort((a, b) => b.fitness - a.fitness);
    if (generation > 0 && shown && evals[0].fitness <= shown.fitness) plateaus += 1; else plateaus = 0;
    if ((generation + 1) % IA_CONFIG.hillClimbEvery === 0) {
      const improved = hillClimbElite(evals[0], (ch) => runAttempt(ch, false).fitness, IA_CONFIG);
      if (improved.improved) evals[0] = runAttempt(improved.elite.chromosome, false);
    }
    shown = evals[0];
    generation += 1;
    replay = { frames: runAttempt(shown.chromosome, true).frames, idx: 0, wait: 0 };
    statsRef.value = { generation, bestDistance: shown.distance, status: `Generación ${generation} - Mejor intento`, replayLabel: `Mejor gen ${generation}`, phase: PHASE.REPLAY };
    population = nextPop(evals);
  };

  const drawCreature = (frame, cameraX) => {
    const sx = (x) => x - cameraX;
    ctx.fillStyle = '#f4a261'; ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2;
    ctx.beginPath(); frame.points.torso.forEach((p, i) => i ? ctx.lineTo(sx(p.x), p.y) : ctx.moveTo(sx(p.x), p.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    const drawLeg = (hip, knee, foot, c, stanceLeg) => {
      ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sx(hip.x), hip.y); ctx.lineTo(sx(knee.x), knee.y); ctx.stroke();
      ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(sx(knee.x), knee.y); ctx.lineTo(sx(foot.x), foot.y); ctx.stroke();
      if (stanceLeg) { ctx.fillStyle = '#111827'; ctx.fillRect(sx(foot.x) - 9, GROUND_Y - 4, 18, 8); }
    };
    drawLeg(frame.points.hipL, frame.points.left.knee, frame.points.left.foot, '#264653', frame.stanceLeg === 'left');
    drawLeg(frame.points.hipR, frame.points.right.knee, frame.points.right.foot, '#2a9d8f', frame.stanceLeg === 'right');
  };

  const loop = () => {
    ctx.fillStyle = '#edf6ff'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (running && !replay) { statsRef.value = { ...statsRef.value, status: `Evaluando generación ${generation + 1}`, phase: PHASE.EVAL }; trainOneGeneration(); }

    if (replay) {
      const frame = replay.frames[Math.min(replay.idx, replay.frames.length - 1)];
      const cameraX = Math.max(0, frame.x - 150);

      ctx.strokeStyle = '#46a758'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(canvas.width, GROUND_Y); ctx.stroke();
      const goalScreenX = IA_CONFIG.goalX - cameraX;
      if (goalScreenX > -40 && goalScreenX < canvas.width + 40) {
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(goalScreenX, GROUND_Y - 140); ctx.lineTo(goalScreenX, GROUND_Y + 8); ctx.stroke();
      }

      drawCreature(frame, cameraX);
      if (frame.penetratedGround) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.75)';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Fallo: penetración del suelo', 18, 36);
      }
      if (frame.reasonOfFailure) {
        ctx.fillStyle = '#111827';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Razón: ${frame.reasonOfFailure}`, 18, 58);
      }
      if (replay.idx < replay.frames.length - 1) replay.idx += 1;
      else {
        replay.wait += 16;
        statsRef.value = {
          ...statsRef.value,
          status: frame.done ? 'Meta alcanzada' : frame.failed ? 'Falló' : `Generación ${generation} - Mejor intento`,
          phase: frame.failed ? PHASE.RESET : PHASE.REPLAY,
        };
        if (replay.wait > IA_CONFIG.generationReplayPauseMs) {
          statsRef.value = { ...statsRef.value, status: 'Reiniciando en A', phase: PHASE.RESET };
          replay = null;
          if (shown.reachedGoalFinal || generation >= IA_CONFIG.maxGenerations) running = false;
        }
      }
    }

    requestAnimationFrame(loop);
  };

  resetPopulation();
  const seedValidation = validateWalkingSeed();
  console.info('Walking seed validation:');
  console.info(`distance: ${seedValidation.distance}`);
  console.info(`validSteps: ${seedValidation.validSteps}`);
  console.info(`fell: ${seedValidation.fell}`);
  console.info(`fitness: ${seedValidation.fitness}`);
  requestAnimationFrame(loop);

  return {
    start() { running = true; },
    pause() { running = false; statsRef.value = { ...statsRef.value, status: 'Pausado' }; },
    reset() { resetPopulation(); },
    showBestNow() { if (shown) replay = { frames: runAttempt(shown.chromosome, true).frames, idx: 0, wait: 0 }; },
    showWalkingSeed() {
      const seedAttempt = runAttempt(createWalkingSeed(), true);
      statsRef.value = {
        ...statsRef.value,
        status: `Marcha base - dist ${seedAttempt.distance.toFixed(1)} | pasos ${seedAttempt.validSteps} | ${seedAttempt.reasonOfFailure ?? 'sin fallo temprano'}`,
        replayLabel: 'Marcha base',
        phase: PHASE.REPLAY,
      };
      replay = { frames: seedAttempt.frames, idx: 0, wait: 0 };
    },
  };
}
