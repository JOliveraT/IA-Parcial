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

const START_X = IA_CONFIG.startX;
const GOAL_X = IA_CONFIG.goalX;
const START_MARKER_X = 80;
const GOAL_MARKER_X = GOAL_X;
const GROUND_TOP_Y = 680;
const FALL_Y_LIMIT = GROUND_TOP_Y - 24;
const TORSO_GROUND_LIMIT = GROUND_TOP_Y - 4;
const VALID_BODY_Y_LIMIT = GROUND_TOP_Y - 26;
const MAX_BODY_ANGLE = (75 * Math.PI) / 180;

export function createSimulation(statsRef, optionsRef) {
  const visual = createWorld({ headless: false });
  createGround(visual.world);
  attachMarkerOverlay(visual.render);

  let population = [];
  let running = false;
  let replayTimer = null;
  let bestEver = null;

  const defaultStats = () => ({
    generation: 0,
    bestDistance: 0,
    reachedGoal: false,
    bestFitness: 0,
    status: 'Pausado',
  });

  function setStatus(status) {
    statsRef.value = { ...statsRef.value, status };
  }

  function attachMarkerOverlay(render) {
    if (!render) return;

    Events.on(render, 'afterRender', () => {
      const ctx = render.context;
      const bounds = render.bounds;
      const width = render.options.width;
      const height = render.options.height;
      const worldToScreenX = (x) => ((x - bounds.min.x) / (bounds.max.x - bounds.min.x)) * width;

      drawMarker(ctx, worldToScreenX(START_MARKER_X), height - 110, '#2a9d8f', 'A');
      drawMarker(ctx, worldToScreenX(GOAL_MARKER_X), height - 110, '#e63946', 'B');
    });
  }

  function drawMarker(ctx, x, y, color, label) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 90);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - 90);
    ctx.lineTo(x + 28, y - 78);
    ctx.lineTo(x, y - 66);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(label, x - 6, y - 98);
    ctx.restore();
  }

  function resetPopulation() {
    population = Array.from({ length: IA_CONFIG.populationSize }, () => ({ genes: randomChromosome(), fitness: 0, distance: 0, reachedGoal: false }));
    bestEver = null;
    stopReplay();
    statsRef.value = defaultStats();
    renderBest(population[0].genes);
  }


  function clearActors(world) {
    const dynamicBodies = Composite.allBodies(world).filter((b) => !b.isStatic);
    const dynamicConstraints = Composite.allConstraints(world).filter((c) => !(c.bodyA?.isStatic && c.bodyB?.isStatic));
    Composite.remove(world, dynamicBodies, true);
    Composite.remove(world, dynamicConstraints, true);
  }

  function evaluateOne(genes) {
    const h = createWorld({ headless: true });
    createGround(h.world);
    const creature = new Creature(h.world, genes, { startX: START_X, groundTopY: GROUND_TOP_Y });

    let bestX = START_X;
    let validBestX = START_X;
    let lastAdvanceStep = 0;
    let lowTorsoPenalty = 0;
    let rotationPenalty = 0;
    let chaoticPenalty = 0;

    let reachedGoal = false;
    let fell = false;
    let step = 0;

    for (; step < IA_CONFIG.maxSteps; step++) {
      creature.update(IA_CONFIG.fixedDelta);
      Engine.update(h.engine, IA_CONFIG.fixedDelta);

      const torso = creature.body;
      const torsoTouchesGround = creature.isTorsoTouchingGround(GROUND_TOP_Y, 2) || torso.position.y >= TORSO_GROUND_LIMIT;
      const fallen = torso.position.y > FALL_Y_LIMIT || Math.abs(torso.angle) > MAX_BODY_ANGLE || torsoTouchesGround;

      bestX = Math.max(bestX, torso.position.x);
      if (!fallen) validBestX = Math.max(validBestX, torso.position.x);

      if (torso.position.x > START_X + 6) lastAdvanceStep = step;
      if (Math.abs(torso.angle) > 0.85) rotationPenalty += 1.1;
      if (torso.position.y > 570) lowTorsoPenalty += 2.4;
      if (Math.abs(creature.leftThigh.angularVelocity) > 4 || Math.abs(creature.rightThigh.angularVelocity) > 4) chaoticPenalty += 0.7;

      if (fallen) {
        fell = true;
        reachedGoal = false;
        break;
      }
      if (!fell && !torsoTouchesGround && torso.position.y < VALID_BODY_Y_LIMIT && torso.position.x >= GOAL_X) {
        reachedGoal = true;
        break;
      }
      if (step - lastAdvanceStep > 150) break;
    }

    const distance = Math.max(0, validBestX - START_X);
    const backwardPenalty = Math.max(0, START_X - creature.body.position.x) * 1.2;
    const fitness = computeFitness({
      distance,
      stepsAlive: step,
      reachedGoal,
      fell,
      lowTorsoPenalty,
      rotationPenalty,
      backwardPenalty,
      chaoticPenalty,
      rawDistance: Math.max(0, bestX - START_X),
      dragDistance: Math.max(0, bestX - validBestX),
    });

    return { fitness, distance, reachedGoal };
  }

  function runGeneration() {
    population.forEach((p) => {
      const result = evaluateOne(p.genes);
      p.fitness = result.fitness;
      p.distance = result.distance;
      p.reachedGoal = result.reachedGoal;
    });

    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];

    if (!bestEver || best.fitness > bestEver.fitness) bestEver = { ...best, genes: [...best.genes] };

    if (statsRef.value.generation > 0 && statsRef.value.generation % IA_CONFIG.hillClimbEvery === 0) {
      const improved = hillClimbElite(best, (genes) => evaluateOne(genes).fitness, IA_CONFIG);
      if (improved.improved && improved.elite.fitness > best.fitness) {
        population[0] = { ...improved.elite, distance: best.distance, reachedGoal: best.reachedGoal };
      }
    }

    const generation = statsRef.value.generation + 1;
    statsRef.value = {
      ...statsRef.value,
      generation,
      bestDistance: best.distance,
      bestFitness: best.fitness,
      reachedGoal: best.reachedGoal,
    };

    renderBest(best.genes);

    if (best.reachedGoal) {
      running = false;
      setStatus('Meta alcanzada');
      return;
    }

    if (generation >= IA_CONFIG.maxGenerations) {
      running = false;
      setStatus('Máximo de generaciones alcanzado');
      return;
    }

    const next = [...population.slice(0, IA_CONFIG.eliteSize).map((e) => ({ ...e, genes: [...e.genes] }))];
    while (next.length < IA_CONFIG.populationSize) {
      const a = tournamentSelection(population, IA_CONFIG.tournamentSize);
      const b = tournamentSelection(population, IA_CONFIG.tournamentSize);
      const child = mutateGaussianBounded(blxAlpha(a.genes, b.genes, IA_CONFIG.crossoverAlpha), IA_CONFIG);
      next.push({ genes: child, fitness: 0, distance: 0, reachedGoal: false });
    }
    population = next;
  }

  function stopReplay() {
    if (replayTimer) {
      clearInterval(replayTimer);
      replayTimer = null;
    }
  }

  function renderBest(genes) {
    stopReplay();
    clearActors(visual.world);

    const creature = new Creature(visual.world, genes, { startX: START_X, groundTopY: GROUND_TOP_Y });
    let steps = 0;
    replayTimer = setInterval(() => {
      creature.update(IA_CONFIG.fixedDelta);
      const torso = creature.body;
      const torsoTouchesGround = creature.isTorsoTouchingGround(GROUND_TOP_Y, 2) || torso.position.y >= TORSO_GROUND_LIMIT;
      const fallen = torso.position.y > FALL_Y_LIMIT || Math.abs(torso.angle) > MAX_BODY_ANGLE || torsoTouchesGround;

      if (fallen) {
        stopReplay();
        clearActors(visual.world);
        return;
      }

      const x = creature.body.position.x;
      const left = Math.max(0, x - 300);
      Render.lookAt(visual.render, {
        min: { x: left, y: 0 },
        max: { x: left + window.innerWidth, y: window.innerHeight },
      });
      steps += 1;
      if (steps >= IA_CONFIG.bestReplaySteps) {
        stopReplay();
      }
    }, IA_CONFIG.fixedDelta);
  }

  async function loop() {
    if (!running) return;

    runGeneration();
    if (!running) return;

    await new Promise((resolve) => setTimeout(resolve, IA_CONFIG.generationReplayPauseMs));
    if (running) requestAnimationFrame(loop);
  }

  resetPopulation();

  return {
    start() {
      if (running || statsRef.value.reachedGoal) return;
      running = true;
      setStatus('Entrenando...');
      loop();
    },
    pause() {
      running = false;
      setStatus(statsRef.value.reachedGoal ? 'Meta alcanzada' : 'Pausado');
    },
    reset() {
      running = false;
      stopReplay();
      resetPopulation();
    },
    step() {
      if (running || statsRef.value.reachedGoal) return;
      runGeneration();
      setStatus(statsRef.value.reachedGoal ? 'Meta alcanzada' : 'Pausado');
    },
    showBestNow() {
      if (bestEver) renderBest(bestEver.genes);
    },
  };
}
