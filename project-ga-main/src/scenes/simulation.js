import { IA_CONFIG } from '../ia/config';
import { randomChromosome, decodeChromosome, CHROMOSOME_LAYOUT } from '../ia/chromosome';
import { computeFitness } from '../ia/fitness';
import { tournamentSelection } from '../ia/selection';
import { blxAlpha } from '../ia/crossover';
import { mutateGaussianBounded } from '../ia/mutation';
import { hillClimbElite } from '../ia/localSearch';
import { Creature } from '../physics/creature';

const GROUND_Y = 480;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

const creature = new Creature();

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

function runAttempt(chromosome, visual = false) {
  const genes = decodeChromosome(chromosome);
  let state = { x: IA_CONFIG.startX, y: GROUND_Y - 118 + genes.bodyHeightBias, vX: 0, alive: true, t: 0 };
  let prevFeet = null;
  let bestX = state.x;
  let aliveSteps = 0;
  let stagnation = 0;
  let invalidPosePenalty = 0;
  let energyPenalty = 0;
  let contactSum = 0;
  let altSum = 0;
  const frames = [];

  for (let step = 0; step < IA_CONFIG.maxSteps; step += 1) {
    const pose = samplePose(genes, state.t);
    const points = creature.getPosePoints({ ...state, pose });
    const leftTouch = Math.abs(points.left.foot.y - GROUND_Y) < 8;
    const rightTouch = Math.abs(points.right.foot.y - GROUND_Y) < 8;
    const leftDx = prevFeet ? points.left.foot.x - prevFeet.left.x : 0;
    const rightDx = prevFeet ? points.right.foot.x - prevFeet.right.x : 0;

    let push = 0;
    if (leftTouch) push += Math.max(0, -leftDx);
    if (rightTouch) push += Math.max(0, -rightDx);
    state.vX += push * genes.pushScale * 0.16;
    state.vX *= 0.92;
    state.vX = clamp(state.vX, -0.6, 3.2);
    state.x += state.vX;

    const torsoBottom = Math.max(...points.torso.map((p) => p.y));
    const badTilt = Math.abs(pose.bodyPitch) > 0.58;
    const legsCrossed = points.left.foot.x > points.right.foot.x + 10;
    const noContact = !leftTouch && !rightTouch;
    const stall = state.x <= bestX + 0.02;
    if (stall) stagnation += 1; else stagnation = 0;

    const alternation = leftTouch !== rightTouch ? 1 : 0.15;
    const contactQuality = (leftTouch || rightTouch) ? clamp(push / 2.6, 0, 1) : 0;
    altSum += alternation;
    contactSum += contactQuality;
    energyPenalty += (Math.abs(pose.leftHip) + Math.abs(pose.rightHip) + pose.leftKnee + pose.rightKnee) * 0.03;

    if (legsCrossed) invalidPosePenalty += 8;
    if (torsoBottom >= GROUND_Y - 4) invalidPosePenalty += 10;
    if (noContact) invalidPosePenalty += 0.7;
    bestX = Math.max(bestX, state.x);

    const failed = badTilt || torsoBottom >= GROUND_Y + 2 || stagnation > 140 || invalidPosePenalty > 1600;
    aliveSteps = step + 1;

    if (visual) frames.push({ x: state.x, y: state.y, pose, points, failed, done: state.x >= IA_CONFIG.goalX });
    prevFeet = { left: { ...points.left.foot }, right: { ...points.right.foot } };

    if (failed || state.x >= IA_CONFIG.goalX) {
      state.alive = !failed;
      break;
    }
    state.t += IA_CONFIG.fixedDeltaSeconds;
  }

  const distance = Math.max(0, bestX - IA_CONFIG.startX);
  const failed = !state.alive;
  const contactQualityAverage = contactSum / Math.max(1, aliveSteps);
  const alternationScore = altSum / Math.max(1, aliveSteps);
  const stagnationPenalty = stagnation * 2.2;
  const reachedGoal = !failed && bestX >= IA_CONFIG.goalX;

  const fitness = computeFitness({ validDistance: distance, aliveSteps, contactQualityAverage, alternationScore, reachedGoal, failed, stagnationPenalty, energyPenalty, invalidPosePenalty });
  return { chromosome: [...chromosome], genes, fitness, distance, failed, reachedGoalFinal: reachedGoal, frames };
}

export function createSimulation(statsRef) {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  let running = false; let generation = 0; let population = []; let shown = null; let replay = null; let plateaus = 0;

  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize(); addEventListener('resize', resize);

  const resetPopulation = () => {
    population = Array.from({ length: IA_CONFIG.populationSize }, () => ({ chromosome: randomChromosome() }));
    generation = 0; shown = null; replay = null; running = false; plateaus = 0;
    statsRef.value = { generation: 0, bestDistance: 0, status: 'Pausado', replayLabel: 'Listo para iniciar' };
  };

  const nextPop = (sorted) => {
    const elites = sorted.slice(0, IA_CONFIG.eliteSize).map((e) => ({ chromosome: [...e.chromosome] }));
    const out = [...elites];
    while (out.length < IA_CONFIG.populationSize) {
      if (plateaus >= IA_CONFIG.plateauLimit && Math.random() < IA_CONFIG.randomImmigrantRate) { out.push({ chromosome: randomChromosome() }); continue; }
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
    statsRef.value = { generation, bestDistance: shown.distance, status: 'Reproduciendo mejor intento', replayLabel: `Mejor gen ${generation}` };
    population = nextPop(evals);
  };

  const drawCreature = (frame, cameraX) => {
    const sx = (x) => x - cameraX;
    ctx.fillStyle = '#f4a261'; ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2;
    ctx.beginPath(); frame.points.torso.forEach((p, i) => i ? ctx.lineTo(sx(p.x), p.y) : ctx.moveTo(sx(p.x), p.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    const drawLeg = (hip, knee, foot, c) => { ctx.strokeStyle = c; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(sx(hip.x), hip.y); ctx.lineTo(sx(knee.x), knee.y); ctx.stroke(); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(sx(knee.x), knee.y); ctx.lineTo(sx(foot.x), foot.y); ctx.stroke(); };
    drawLeg(frame.points.hipL, frame.points.left.knee, frame.points.left.foot, '#264653');
    drawLeg(frame.points.hipR, frame.points.right.knee, frame.points.right.foot, '#2a9d8f');
    [frame.points.hipL, frame.points.hipR, frame.points.left.knee, frame.points.right.knee].forEach((j) => { ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(sx(j.x), j.y, 4, 0, Math.PI * 2); ctx.fill(); });
  };

  const loop = () => {
    ctx.fillStyle = '#edf6ff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#46a758'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(canvas.width, GROUND_Y); ctx.stroke();

    if (running && !replay) { statsRef.value = { ...statsRef.value, status: 'Entrenando' }; trainOneGeneration(); }

    if (replay) {
      const frame = replay.frames[Math.min(replay.idx, replay.frames.length - 1)];
      const cameraX = frame.x - 250;
      drawCreature(frame, cameraX);
      if (replay.idx < replay.frames.length - 1) replay.idx += 1;
      else {
        replay.wait += 16;
        statsRef.value = { ...statsRef.value, status: frame.done ? 'Meta alcanzada' : frame.failed ? 'Falló' : 'Reproduciendo mejor intento' };
        if (replay.wait > IA_CONFIG.generationReplayPauseMs) {
          replay = null;
          if (shown.reachedGoalFinal || generation >= IA_CONFIG.maxGenerations) running = false;
        }
      }
    }

    requestAnimationFrame(loop);
  };

  resetPopulation();
  requestAnimationFrame(loop);

  return {
    start() { running = true; },
    pause() { running = false; statsRef.value = { ...statsRef.value, status: 'Pausado' }; },
    reset() { resetPopulation(); },
    showBestNow() { if (shown) replay = { frames: runAttempt(shown.chromosome, true).frames, idx: 0, wait: 0 }; },
  };
}
