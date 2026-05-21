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

const { Engine, Composite, Bodies, World, Render } = Matter;
const START_X = IA_CONFIG.startX;
const GOAL_X = IA_CONFIG.goalX;

export function createSimulation(statsRef, optionsRef) {
  const visual = createWorld({ headless: false });
  createGround(visual.world);
  createMarkers(visual.world);

  let population = [];
  let running = false;
  let bestEver = null;

  const defaultStats = () => ({ generation: 0, bestDistance: 0, reachedGoal: false, bestFitness: 0, details: [] });

  function resetPopulation() {
    population = Array.from({ length: IA_CONFIG.populationSize }, () => ({ genes: randomChromosome(), fitness: 0, distance: 0, reachedGoal: false }));
    statsRef.value = defaultStats();
    bestEver = null;
    renderBest(population[0].genes);
  }

  function createMarkers(world) {
    const startPole = Bodies.rectangle(START_X, 620, 6, 120, { isStatic: true, render: { fillStyle: '#2a9d8f' } });
    const goalPole = Bodies.rectangle(GOAL_X, 620, 6, 120, { isStatic: true, render: { fillStyle: '#e63946' } });
    const goalBanner = Bodies.rectangle(GOAL_X + 18, 575, 30, 20, { isStatic: true, render: { fillStyle: '#e63946' } });
    World.add(world, [startPole, goalPole, goalBanner]);
  }

  function clearActors(world) {
    const all = Composite.allBodies(world).filter((b) => !b.isStatic);
    Composite.remove(world, all);
  }

  function evaluateOne(genes) {
    const h = createWorld({ headless: true });
    createGround(h.world);
    const creature = new Creature(h.world, START_X, 535, genes);
    let bestX = START_X;
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
      bestX = Math.max(bestX, torso.position.x);
      if (torso.position.x > START_X + 5) lastAdvanceStep = step;

      if (Math.abs(torso.angle) > 0.9) rotationPenalty += 0.8;
      if (torso.position.y > 600) lowTorsoPenalty += 1.5;
      chaoticPenalty += Math.abs(creature.leftThigh.angularVelocity) > 3 ? 0.5 : 0;

      if (torso.position.y > 670 || Math.abs(torso.angle) > 1.6) {
        fell = true;
        break;
      }
      if (torso.position.x >= GOAL_X) {
        reachedGoal = true;
        break;
      }
      if (step - lastAdvanceStep > 140) break;
    }

    const distance = Math.max(0, bestX - START_X);
    const backwardPenalty = Math.max(0, START_X - creature.body.position.x) * 0.8;
    const fitness = computeFitness({ distance, stepsAlive: step, reachedGoal, fell, lowTorsoPenalty, rotationPenalty, backwardPenalty, chaoticPenalty });
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

    const next = [...population.slice(0, IA_CONFIG.eliteSize).map((e) => ({ ...e, genes: [...e.genes] }))];
    while (next.length < IA_CONFIG.populationSize) {
      const a = tournamentSelection(population, IA_CONFIG.tournamentSize);
      const b = tournamentSelection(population, IA_CONFIG.tournamentSize);
      const child = mutateGaussianBounded(blxAlpha(a.genes, b.genes, IA_CONFIG.crossoverAlpha), IA_CONFIG);
      next.push({ genes: child, fitness: 0, distance: 0, reachedGoal: false });
    }
    population = next;

    const generation = statsRef.value.generation + 1;
    statsRef.value = {
      generation,
      bestDistance: best.distance,
      bestFitness: best.fitness,
      reachedGoal: best.reachedGoal,
      details: [{ generation, fitness: best.fitness, distance: best.distance }],
    };

    if (optionsRef.value.showBest) renderBest(best.genes);

    if (best.reachedGoal || generation >= IA_CONFIG.maxGenerations) running = false;
  }

  function renderBest(genes) {
    clearActors(visual.world);
    const creature = new Creature(visual.world, START_X, 535, genes);
    let steps = 0;
    const timer = setInterval(() => {
      creature.update(IA_CONFIG.fixedDelta);
      const x = creature.body.position.x;
      const left = Math.max(0, x - 300);
      Render.lookAt(visual.render, { min: { x: left, y: 0 }, max: { x: left + window.innerWidth, y: window.innerHeight } });
      steps += 1;
      if (steps > 180) clearInterval(timer);
    }, IA_CONFIG.fixedDelta);
  }

  function loop() {
    if (!running) return;
    runGeneration();
    if (running) requestAnimationFrame(loop);
  }

  resetPopulation();
  return {
    start() { if (!running) { running = true; loop(); } },
    pause() { running = false; },
    reset() { running = false; resetPopulation(); },
    step() { runGeneration(); },
    showBestNow() { if (bestEver) renderBest(bestEver.genes); },
  };
}
