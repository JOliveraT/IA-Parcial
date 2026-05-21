import Matter from 'matter-js';
import { IA_CONFIG } from '../ia/config';
import { randomChromosome, decodeChromosome } from '../ia/chromosome';
import { computeFitness } from '../ia/fitness';
import { tournamentSelection } from '../ia/selection';
import { blxAlpha } from '../ia/crossover';
import { mutateGaussianBounded } from '../ia/mutation';
import { hillClimbElite } from '../ia/localSearch';
import { createWorld } from '../physics/world';
import { createGround } from '../physics/ground';
import { Creature } from '../physics/creature';

const { Engine, Composite } = Matter;

export function createSimulation(statsRef, optionsRef) {
  const visual = createWorld({ headless: false });
  createGround(visual.world);

  let population = [];
  let running = false;

  function resetPopulation() {
    population = Array.from({ length: IA_CONFIG.populationSize }, () => ({ genes: randomChromosome(), fitness: 0 }));
    statsRef.value = { ...statsRef.value, generation: 0, history: [], plateauGenerations: 0 };
  }

  function clearWorld(world) {
    const all = Composite.allBodies(world).filter((b) => !b.isStatic);
    Composite.remove(world, all);
  }

  function evaluateOne(genes) {
    const h = createWorld({ headless: true });
    createGround(h.world);
    const creature = new Creature(h.world, 100, 578, genes);
    let sumAbsAngle = 0; let minY = creature.body.position.y; let maxY = minY; let backward = 0; let dragPenalty = 0;
    const earlyStep = Math.floor(IA_CONFIG.maxSteps * 0.3);
    let steps = 0; let fell = false;

    for (; steps < IA_CONFIG.maxSteps; steps++) {
      creature.update(IA_CONFIG.fixedDelta);
      Engine.update(h.engine, IA_CONFIG.fixedDelta);
      const x = creature.body.position.x;
      const dx = x - creature.startX;
      sumAbsAngle += Math.abs(creature.body.angle);
      minY = Math.min(minY, creature.body.position.y);
      maxY = Math.max(maxY, creature.body.position.y);
      if (dx < 0) backward += Math.abs(dx) * 0.02;
      if (Math.abs(creature.body.angle) > 1.3) dragPenalty += 0.4;
      if (creature.body.position.y > 665 || Math.abs(creature.body.angle) > 1.65) { fell = true; break; }
      if (steps > earlyStep && dx < 8) break;
      if (dx < -90 || x > 2500 || x < -200) break;
    }

    const deltaX = creature.body.position.x - creature.startX;
    const metrics = {
      deltaX,
      survivalRatio: steps / IA_CONFIG.maxSteps,
      avgTorsoAngle: sumAbsAngle / Math.max(1, steps),
      verticalBounce: (maxY - minY) / 100,
      controlEffort: creature.controlEffort / Math.max(1, steps),
      fell,
      dragPenalty: dragPenalty + backward,
    };

    return computeFitness(metrics);
  }

  function diversity(pop) {
    const geneCount = pop[0].genes.length;
    let d = 0;
    for (let g = 0; g < geneCount; g++) {
      const avg = pop.reduce((a, p) => a + p.genes[g], 0) / pop.length;
      const v = pop.reduce((a, p) => a + (p.genes[g] - avg) ** 2, 0) / pop.length;
      d += Math.sqrt(v);
    }
    return d / geneCount;
  }

  function runGeneration() {
    const t0 = performance.now();
    population.forEach((p) => { p.fitness = evaluateOne(p.genes); });
    population.sort((a, b) => b.fitness - a.fitness);
    const elapsed = performance.now() - t0;

    const fits = population.map((p) => p.fitness).sort((a, b) => a - b);
    const avgFitness = fits.reduce((a, b) => a + b, 0) / fits.length;
    const best = population[0];
    const prevBest = statsRef.value.bestFitness;
    const plateauGenerations = best.fitness > prevBest + 1e-6 ? 0 : (statsRef.value.plateauGenerations + 1);
    const isPlateau = plateauGenerations >= IA_CONFIG.plateauLimit;

    let hillClimbApplied = false;
    if (optionsRef.value.hillClimbEnabled && (statsRef.value.generation % IA_CONFIG.hillClimbEvery === 0 || isPlateau)) {
      const res = hillClimbElite(best, evaluateOne, IA_CONFIG);
      hillClimbApplied = res.improved;
      if (res.elite.fitness > best.fitness) population[0] = res.elite;
      population.sort((a, b) => b.fitness - a.fitness);
    }

    const sigma = optionsRef.value.adaptiveMutation && isPlateau
      ? (diversity(population) < IA_CONFIG.diversityLowThreshold ? IA_CONFIG.adaptiveSigmaHigh : IA_CONFIG.adaptiveSigmaMedium)
      : IA_CONFIG.mutationSigma;

    const next = [ ...population.slice(0, IA_CONFIG.eliteSize).map((p) => ({ ...p, genes: [...p.genes] })) ];
    while (next.length < IA_CONFIG.populationSize) {
      if (isPlateau && Math.random() < IA_CONFIG.randomImmigrantRate) {
        next.push({ genes: randomChromosome(), fitness: 0 });
        continue;
      }
      const a = tournamentSelection(population, IA_CONFIG.tournamentSize);
      const b = tournamentSelection(population, IA_CONFIG.tournamentSize);
      const child = mutateGaussianBounded(blxAlpha(a.genes, b.genes, IA_CONFIG.crossoverAlpha), { mutationRate: IA_CONFIG.mutationRate, mutationSigma: sigma });
      next.push({ genes: child, fitness: 0 });
    }
    population = next;

    const generation = statsRef.value.generation + 1;
    const newStats = {
      generation,
      bestFitness: best.fitness,
      avgFitness,
      medianFitness: fits[Math.floor(fits.length / 2)],
      worstFitness: fits[0],
      diversity: diversity(population),
      plateauGenerations,
      evalMs: elapsed,
      evaluationsPerSecond: (IA_CONFIG.populationSize / Math.max(elapsed, 1)) * 1000,
      bestGenes: decodeChromosome(best.genes),
      hillClimbApplied,
      adaptiveMutationApplied: sigma !== IA_CONFIG.mutationSigma,
      history: [...statsRef.value.history.slice(-24), { generation, bestFitness: best.fitness, avgFitness }],
    };
    statsRef.value = newStats;

    if (optionsRef.value.showBest) renderBest(best.genes);
  }

  function renderBest(genes) {
    clearWorld(visual.world);
    createGround(visual.world);
    const creature = new Creature(visual.world, 100, 578, genes);
    let steps = 0;
    const timer = setInterval(() => {
      creature.update(IA_CONFIG.fixedDelta);
      steps++;
      if (steps > IA_CONFIG.maxSteps / 2) clearInterval(timer);
    }, IA_CONFIG.fixedDelta);
  }

  function loop() {
    if (!running) return;
    const perFrame = optionsRef.value.fastMode ? 2 : 1;
    for (let i = 0; i < perFrame; i++) runGeneration();
    if (statsRef.value.generation < IA_CONFIG.maxGenerations) requestAnimationFrame(loop);
    else running = false;
  }

  resetPopulation();

  return {
    start() { if (!running) { running = true; loop(); } },
    pause() { running = false; },
    reset() { running = false; resetPopulation(); },
    step() { runGeneration(); },
    showBestNow() { if (statsRef.value.bestGenes) renderBest(population[0]?.genes ?? randomChromosome()); },
  };
}
