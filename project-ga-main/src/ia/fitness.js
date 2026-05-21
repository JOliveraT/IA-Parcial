export function computeFitness(metrics) {
  const reachedGoalBonus = metrics.reachedGoal && !metrics.failed ? 4500 : 0;
  const fallPenalty = metrics.failed ? 1800 : 0;

  const fitness =
    metrics.validDistance * 8 +
    metrics.aliveSteps * 0.3 +
    metrics.gaitQualityAverage * 100 +
    reachedGoalBonus -
    (metrics.instabilityPenalty ?? 0) -
    (metrics.energyPenalty ?? 0) -
    (metrics.stagnationPenalty ?? 0) -
    fallPenalty;

  return Number.isFinite(fitness) ? fitness : -9999;
}
