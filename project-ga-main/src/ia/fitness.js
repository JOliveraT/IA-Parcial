export function computeFitness(metrics) {
  const reachedGoalBonus = metrics.reachedGoal && !metrics.failed ? 3600 : 0;
  const fallPenalty = metrics.failed ? 900 : 0;

  const fitness =
    metrics.validDistance * 10 +
    metrics.aliveSteps * 0.28 +
    metrics.gaitQualityAverage * 220 +
    reachedGoalBonus -
    (metrics.instabilityPenalty ?? 0) -
    (metrics.energyPenalty ?? 0) -
    (metrics.stagnationPenalty ?? 0) -
    fallPenalty;

  return Number.isFinite(fitness) ? fitness : -9999;
}
