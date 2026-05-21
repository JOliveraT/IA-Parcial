import { IA_CONFIG } from '../ia/config';
import { randomChromosome, decodeChromosome } from '../ia/chromosome';
import { computeFitness } from '../ia/fitness';
import { tournamentSelection } from '../ia/selection';
import { blxAlpha } from '../ia/crossover';
import { mutateGaussianBounded } from '../ia/mutation';
import { hillClimbElite } from '../ia/localSearch';

const WALKER = { torsoW: 54, torsoH: 78, femur: 54, tibia: 52, groundY: 480 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const norm = (v, lo, hi) => clamp((v - lo) / (hi - lo), 0, 1);

function currentGoal(generation) {
  return Math.min(IA_CONFIG.goalX, 300 + generation * 8);
}

function poseAt(genes, time) {
  const phase = time * genes.stepFrequency;
  const leftHip = genes.hipBias + genes.hipAmplitude * Math.sin(phase);
  const rightHip = genes.hipBias + genes.hipAmplitude * Math.sin(phase + genes.phaseOffset);
  const leftKnee = genes.kneeBias + genes.kneeAmplitude * Math.max(0, Math.sin(phase + genes.kneePhase));
  const rightKnee = genes.kneeBias + genes.kneeAmplitude * Math.max(0, Math.sin(phase + genes.phaseOffset + genes.kneePhase));
  const bodyPitch = genes.bodyPitchBias + genes.bodyPitchAmplitude * Math.sin(phase);
  return { phase, leftHip, rightHip, leftKnee, rightKnee, bodyPitch };
}

function evaluateOne(chromosome, generation) {
  const g = decodeChromosome(chromosome);
  const localGoal = currentGoal(generation);
  let x = IA_CONFIG.startX;
  let bestX = x;
  let prevX = x;
  let gaitSum = 0;
  let instabilityPenalty = 0;
  let energyPenalty = 0;
  let stagnationFrames = 0;
  let lowGaitFrames = 0;
  let aliveSteps = 0;
  let failed = false;

  for (let step = 0; step < IA_CONFIG.maxSteps; step += 1) {
    const time = step * IA_CONFIG.fixedDeltaSeconds;
    const pose = poseAt(g, time);

    const alternation = 1 - Math.abs(Math.PI - Math.abs(pose.leftHip - pose.rightHip)) / Math.PI;
    const hipScore = norm(g.hipAmplitude, 0.1, 0.7);
    const kneeFlexion = (norm(pose.leftKnee, 0.25, 1.0) + norm(pose.rightKnee, 0.25, 1.0)) / 2;
    const stabilityScore = 1 - norm(Math.abs(pose.bodyPitch), 0.15, 0.75);
    const contactScore = 0.5 + 0.5 * Math.sin(pose.phase) * Math.sin(pose.phase + g.phaseOffset + Math.PI);
    const strideScore = norm(g.strideLength, 0.5, 3.0);

    const instability = Math.max(0, Math.abs(pose.bodyPitch) - 0.58) * 16;
    const energy = (Math.abs(pose.leftHip) + Math.abs(pose.rightHip) + pose.leftKnee + pose.rightKnee) * g.energyFactor * 0.5;

    const normalizedStabilityFactor = norm(g.stabilityFactor, 0.3, 1.3);
    const normalizedEnergy = norm(energy, 0.2, 2.0);
    const normalizedInstability = norm(instability, 0.0, 1.0);
    const penalties = normalizedEnergy * 0.12 + normalizedInstability * 0.18;
    const gaitQuality = clamp(
      alternation * 0.25 +
      kneeFlexion * 0.2 +
      strideScore * 0.2 +
      (stabilityScore * 0.7 + normalizedStabilityFactor * 0.3) * 0.2 +
      contactScore * 0.15 -
      penalties,
      0,
      1,
    );

    const maxSpeed = 2.4;
    const baseSpeed = gaitQuality * g.strideLength * 0.08;
    const speed = gaitQuality < 0.18 ? 0 : clamp(baseSpeed, 0, maxSpeed);
    x += speed;
    bestX = Math.max(bestX, x);
    gaitSum += gaitQuality;
    instabilityPenalty += Math.max(0, instability) * 6;
    energyPenalty += Math.max(0, energy) * 2.2;

    if (x <= prevX + 0.03) stagnationFrames += 1;
    else stagnationFrames = 0;
    prevX = x;

    if (gaitQuality < 0.2) lowGaitFrames += 1;
    else lowGaitFrames = 0;

    const invalidLeg = g.kneeBias + g.kneeAmplitude > 2.2 || g.hipAmplitude < 0.18;
    const shouldFail =
      Math.abs(pose.bodyPitch) > 0.8 ||
      stabilityScore < 0.05 ||
      lowGaitFrames > 100 ||
      stagnationFrames > 120 ||
      invalidLeg ||
      energy > 2.3;

    aliveSteps = step + 1;
    if (shouldFail) { failed = true; break; }
    if (x >= IA_CONFIG.goalX) break;
  }

  const bestDistance = Math.max(0, bestX - IA_CONFIG.startX);
  const validDistance = failed ? bestDistance * 0.2 : bestDistance;
  const gaitQualityAverage = gaitSum / Math.max(1, aliveSteps);
  const stabilityAverage = aliveSteps > 0 ? (aliveSteps - instabilityPenalty / 6) / aliveSteps : 0;
  const progressGap = Math.max(0, localGoal - bestX);
  const stagnationPenalty = stagnationFrames * 2 + progressGap * 0.3;
  const validGait = gaitQualityAverage >= 0.55 && stabilityAverage >= 0.5 && aliveSteps >= 200 && stagnationFrames < 100 && energyPenalty < 1200;
  const reachedGoalFinal = !failed && bestX >= IA_CONFIG.goalX && validGait;

  const fitness = computeFitness({ validDistance, aliveSteps, gaitQualityAverage, reachedGoal: reachedGoalFinal, failed, instabilityPenalty, energyPenalty, stagnationPenalty });

  return { chromosome: [...chromosome], genes: g, fitness, distance: bestDistance, reachedGoalFinal, reachedPartialGoal: bestX >= localGoal, failed };
}

export function createSimulation(statsRef) {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  let running = false;
  let population = [];
  let bestEver = null;
  let plateauCount = 0;
  let generation = 0;
  let shown = null;
  let viewTime = 0;
  let cameraX = 0;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  function resetPopulation() {
    population = Array.from({ length: IA_CONFIG.populationSize }, () => ({ chromosome: randomChromosome(), fitness: 0 }));
    generation = 0; bestEver = null; shown = null; plateauCount = 0;
    statsRef.value = { generation: 0, bestDistance: 0, status: 'Pausado' };
  }

  function nextPopulation(sorted) {
    const elites = sorted.slice(0, IA_CONFIG.eliteSize).map((e) => ({ chromosome: [...e.chromosome], fitness: 0 }));
    const out = [...elites];
    while (out.length < IA_CONFIG.populationSize) {
      const immigrant = plateauCount >= IA_CONFIG.plateauLimit && Math.random() < IA_CONFIG.randomImmigrantRate;
      if (immigrant) { out.push({ chromosome: randomChromosome(), fitness: 0 }); continue; }
      const a = tournamentSelection(sorted, IA_CONFIG.tournamentSize);
      const b = tournamentSelection(sorted, IA_CONFIG.tournamentSize);
      const child = mutateGaussianBounded(blxAlpha(a.chromosome, b.chromosome, IA_CONFIG.crossoverAlpha), IA_CONFIG);
      out.push({ chromosome: child, fitness: 0 });
    }
    return out;
  }

  function trainGeneration() {
    const evaluated = population.map((p) => evaluateOne(p.chromosome, generation));
    evaluated.sort((a, b) => b.fitness - a.fitness);

    if (!bestEver || evaluated[0].fitness > bestEver.fitness) { bestEver = { ...evaluated[0], chromosome: [...evaluated[0].chromosome] }; plateauCount = 0; }
    else plateauCount += 1;

    if ((generation + 1) % IA_CONFIG.hillClimbEvery === 0) {
      const improved = hillClimbElite(evaluated[0], (ch) => evaluateOne(ch, generation).fitness, IA_CONFIG);
      if (improved.improved) {
        const reEval = evaluateOne(improved.elite.chromosome, generation);
        if (reEval.fitness > evaluated[0].fitness) evaluated[0] = reEval;
      }
    }

    shown = evaluated[0];
    generation += 1;
    statsRef.value = {
      generation,
      bestDistance: shown.distance,
      status: shown.reachedGoalFinal ? 'Meta alcanzada' : running ? 'Entrenando…' : 'Pausado',
    };

    if (shown.reachedGoalFinal || generation >= IA_CONFIG.maxGenerations) {
      running = false;
      statsRef.value = { ...statsRef.value, status: shown.reachedGoalFinal ? 'Meta alcanzada' : 'Máximo de generaciones alcanzado' };
      return;
    }
    population = nextPopulation(evaluated);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const targetX = shown ? IA_CONFIG.startX + shown.distance : IA_CONFIG.startX;
    cameraX += ((targetX - 260) - cameraX) * 0.08;

    ctx.fillStyle = '#e9f2fb'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const gy = WALKER.groundY;
    ctx.strokeStyle = '#3f3f46'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();

    const toScreenX = (x) => x - cameraX;
    const drawMarker = (x, label, color) => {
      const sx = toScreenX(x);
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx, gy - 95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, gy - 95); ctx.lineTo(sx + 22, gy - 82); ctx.lineTo(sx, gy - 69); ctx.fill();
      ctx.fillStyle = '#111827'; ctx.font = 'bold 16px Inter'; ctx.fillText(label, sx - 5, gy - 104);
    };
    drawMarker(IA_CONFIG.startX, 'A', '#2a9d8f'); drawMarker(IA_CONFIG.goalX, 'B', '#dc2626');

    if (shown) {
      viewTime += IA_CONFIG.fixedDeltaSeconds;
      const p = poseAt(shown.genes, viewTime);
      const hipX = IA_CONFIG.startX + shown.distance * Math.min(1, viewTime / 2.4);
      const torsoCenterX = toScreenX(hipX);
      const torsoCenterY = gy - WALKER.femur - WALKER.tibia + 10;
      const hipY = torsoCenterY + WALKER.torsoH / 2 - 6;

      const leg = (hipAngle, kneeAngle, side) => {
        const offset = side * 10;
        const x0 = torsoCenterX + offset;
        const y0 = hipY;
        const t1 = Math.PI / 2 + hipAngle;
        const kx = x0 + Math.cos(t1) * WALKER.femur;
        const ky = y0 + Math.sin(t1) * WALKER.femur;
        const t2 = t1 + kneeAngle * 0.8;
        const fx = kx + Math.cos(t2) * WALKER.tibia;
        const fy = Math.min(gy, ky + Math.sin(t2) * WALKER.tibia);
        return { x0, y0, kx, ky, fx, fy };
      };

      const left = leg(p.leftHip, p.leftKnee, -1);
      const right = leg(p.rightHip, p.rightKnee, 1);

      ctx.save();
      ctx.translate(torsoCenterX, torsoCenterY);
      ctx.rotate(p.bodyPitch * 0.55);
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.rect(-WALKER.torsoW / 2, -WALKER.torsoH / 2, WALKER.torsoW, WALKER.torsoH);
      ctx.fill();
      ctx.restore();

      const drawLeg = (L, color) => {
        ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(L.x0, L.y0); ctx.lineTo(L.kx, L.ky); ctx.lineTo(L.fx, L.fy); ctx.stroke();
        ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(L.kx, L.ky, 4, 0, Math.PI * 2); ctx.fill();
      };
      drawLeg(left, '#374151'); drawLeg(right, '#1f2937');
    }

    requestAnimationFrame(draw);
  }

  async function trainLoop() {
    while (running) {
      trainGeneration();
      await new Promise((r) => setTimeout(r, IA_CONFIG.generationReplayPauseMs));
    }
  }

  resetPopulation();
  draw();

  return {
    start() { if (running) return; running = true; statsRef.value = { ...statsRef.value, status: 'Entrenando…' }; trainLoop(); },
    pause() { running = false; statsRef.value = { ...statsRef.value, status: 'Pausado' }; },
    reset() { running = false; viewTime = 0; resetPopulation(); },
    showBestNow() { if (bestEver) shown = bestEver; },
  };
}
