import Matter from 'matter-js';
import { IA_CONFIG } from '../ia/config';
import { randomChromosome } from '../ia/chromosome';
import { computeFitness } from '../ia/fitness';
import { tournamentSelection } from '../ia/selection';
import { blxAlpha } from '../ia/crossover';
import { mutateGaussianBounded } from '../ia/mutation';
import { hillClimbElite } from '../ia/localSearch';
import { createWorld } from '../physics/world';
import { createGround } from '../physics/ground';
import { Creature } from '../physics/creature';

const { Engine, Composite, Render, Events } = Matter;
const MAX_BODY_ANGLE = (70 * Math.PI) / 180;

export function createSimulation(statsRef) {
  const visual = createWorld({ headless: false });
  const visualGround = createGround(visual.world);
  const groundTopY = visualGround.position.y - (visualGround.bounds.max.y - visualGround.bounds.min.y) / 2;

  let population = [];
  let running = false;
  let replayTimer = null;
  let bestEver = null;
  let plateauCount = 0;

  attachMarkerOverlay(visual.render);

  function setStatus(status) { statsRef.value = { ...statsRef.value, status }; }

  function attachMarkerOverlay(render) {
    Events.on(render, 'afterRender', () => {
      const ctx = render.context;
      const b = render.bounds;
      const w = render.options.width;
      const h = render.options.height;
      const xMap = (x) => ((x - b.min.x) / (b.max.x - b.min.x)) * w;
      drawMarker(ctx, xMap(IA_CONFIG.startX), h - 108, '#2a9d8f', 'A');
      drawMarker(ctx, xMap(IA_CONFIG.goalX), h - 108, '#d62828', 'B');
    });
  }

  function drawMarker(ctx, x, y, color, label) {
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 90); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 90); ctx.lineTo(x + 26, y - 78); ctx.lineTo(x, y - 66); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111827'; ctx.font = 'bold 16px Inter, sans-serif'; ctx.fillText(label, x - 5, y - 96); ctx.restore();
  }

  function resetPopulation() {
    population = Array.from({ length: IA_CONFIG.populationSize }, () => ({ genes: randomChromosome(), fitness: 0, distance: 0, reachedGoal: false }));
    bestEver = null; plateauCount = 0;
    statsRef.value = { generation: 0, bestDistance: 0, reachedGoal: false, bestFitness: 0, status: 'Pausado' };
    renderBest(population[0].genes);
  }

  function clearActors(world) {
    Composite.remove(world, Composite.allBodies(world).filter((b) => !b.isStatic), true);
    Composite.remove(world, Composite.allConstraints(world).filter((c) => !(c.bodyA?.isStatic && c.bodyB?.isStatic)), true);
  }

  function evaluateOne(genes) {
    const h = createWorld({ headless: true });
    const g = createGround(h.world);
    const gTopY = g.position.y - (g.bounds.max.y - g.bounds.min.y) / 2;
    const creature = new Creature(h.world, genes, { startX: IA_CONFIG.startX, groundTopY: gTopY });

    let validBestX = IA_CONFIG.startX;
    let rawBestX = IA_CONFIG.startX;
    let lowBodyPenalty = 0; let rotationPenalty = 0; let energyPenalty = 0;
    let stagnation = 0; let lastBestX = IA_CONFIG.startX;
    let step = 0; let fell = false; let reachedGoal = false;

    for (; step < IA_CONFIG.maxSteps; step++) {
      creature.update(IA_CONFIG.fixedDelta);
      Engine.update(h.engine, IA_CONFIG.fixedDelta);
      const torso = creature.body;

      const torsoTouchesGround = creature.isTorsoTouchingGround(gTopY, 2);
      const tooLow = torso.position.y > gTopY - 28;
      const rotatedOut = Math.abs(torso.angle) > MAX_BODY_ANGLE;
      const stagnant = step > 120 && stagnation > 100;
      const fallen = torsoTouchesGround || tooLow || rotatedOut || stagnant;

      rawBestX = Math.max(rawBestX, torso.position.x);
      if (!fallen) validBestX = Math.max(validBestX, torso.position.x);

      if (torso.position.x > lastBestX + 0.5) { lastBestX = torso.position.x; stagnation = 0; } else stagnation += 1;

      if (torso.position.y > gTopY - 40) lowBodyPenalty += 1.8;
      if (Math.abs(torso.angle) > 0.75) rotationPenalty += 1.2;
      energyPenalty += creature.controlEffort * 0.06;

      reachedGoal = torso.position.x >= IA_CONFIG.goalX && !fallen && !torsoTouchesGround && torso.position.y < gTopY - 34;
      if (fallen) { fell = true; reachedGoal = false; break; }
      if (reachedGoal) break;
    }

    const validDistance = Math.max(0, validBestX - IA_CONFIG.startX);
    const dragDistance = Math.max(0, rawBestX - validBestX);
    const backwardPenalty = Math.max(0, IA_CONFIG.startX - creature.body.position.x) * 1.5;

    const fitness = computeFitness({
      validDistance,
      stepsAlive: step,
      reachedGoal,
      fell,
      lowBodyPenalty,
      rotationPenalty,
      backwardPenalty,
      stagnationPenalty: stagnation * 0.35,
      dragPenalty: dragDistance * 8,
      energyPenalty,
      progress: validDistance / Math.max(1, IA_CONFIG.goalX - IA_CONFIG.startX),
    });
    return { fitness, distance: validDistance, reachedGoal };
  }

  function runGeneration() {
    population.forEach((p) => Object.assign(p, evaluateOne(p.genes)));
    population.sort((a, b) => b.fitness - a.fitness);
    let best = population[0];

    if (!bestEver || best.fitness > bestEver.fitness) {
      bestEver = { ...best, genes: [...best.genes] };
      plateauCount = 0;
    } else plateauCount += 1;

    const nextGenerationIdx = statsRef.value.generation + 1;
    if (nextGenerationIdx % IA_CONFIG.hillClimbEvery === 0) {
      const improved = hillClimbElite(best, (genes) => evaluateOne(genes).fitness, IA_CONFIG);
      if (improved.improved && improved.elite.fitness > best.fitness) {
        best = { ...best, genes: improved.elite.genes, fitness: improved.elite.fitness };
        population[0] = best;
      }
    }

    statsRef.value = { ...statsRef.value, generation: nextGenerationIdx, bestDistance: best.distance, bestFitness: best.fitness, reachedGoal: best.reachedGoal };
    renderBest(best.genes);

    if (best.reachedGoal) { running = false; setStatus('Meta alcanzada'); return; }
    if (nextGenerationIdx >= IA_CONFIG.maxGenerations) { running = false; setStatus('Máximo alcanzado'); return; }

    const next = [...population.slice(0, IA_CONFIG.eliteSize).map((e) => ({ ...e, genes: [...e.genes] }))];
    while (next.length < IA_CONFIG.populationSize) {
      const immigrant = plateauCount >= IA_CONFIG.plateauLimit && Math.random() < IA_CONFIG.randomImmigrantRate;
      if (immigrant) { next.push({ genes: randomChromosome(), fitness: 0, distance: 0, reachedGoal: false }); continue; }
      const a = tournamentSelection(population, IA_CONFIG.tournamentSize);
      const b = tournamentSelection(population, IA_CONFIG.tournamentSize);
      const child = mutateGaussianBounded(blxAlpha(a.genes, b.genes, IA_CONFIG.crossoverAlpha), IA_CONFIG);
      next.push({ genes: child, fitness: 0, distance: 0, reachedGoal: false });
    }
    population = next;
  }

  function stopReplay() { if (replayTimer) clearInterval(replayTimer); replayTimer = null; }

  function renderBest(genes) {
    stopReplay(); clearActors(visual.world);
    const creature = new Creature(visual.world, genes, { startX: IA_CONFIG.startX, groundTopY });
    let steps = 0;
    replayTimer = setInterval(() => {
      creature.update(IA_CONFIG.fixedDelta);
      const torso = creature.body;
      const fallen = creature.isTorsoTouchingGround(groundTopY, 2) || torso.position.y > groundTopY - 28 || Math.abs(torso.angle) > MAX_BODY_ANGLE;
      if (fallen || steps >= IA_CONFIG.bestReplaySteps) { stopReplay(); clearActors(visual.world); return; }
      const left = Math.max(0, torso.position.x - 340);
      Render.lookAt(visual.render, { min: { x: left, y: 0 }, max: { x: left + window.innerWidth, y: window.innerHeight } });
      steps += 1;
    }, IA_CONFIG.fixedDelta);
  }

  async function loop() {
    if (!running) return;
    runGeneration();
    if (!running) return;
    await new Promise((r) => setTimeout(r, IA_CONFIG.generationReplayPauseMs));
    if (running) requestAnimationFrame(loop);
  }

  resetPopulation();

  return {
    start() { if (running || statsRef.value.reachedGoal) return; running = true; setStatus('Entrenando'); loop(); },
    pause() { running = false; setStatus(statsRef.value.reachedGoal ? 'Meta alcanzada' : 'Pausado'); },
    reset() { running = false; stopReplay(); clearActors(visual.world); resetPopulation(); },
    showBestNow() { if (bestEver) renderBest(bestEver.genes); },
  };
}
