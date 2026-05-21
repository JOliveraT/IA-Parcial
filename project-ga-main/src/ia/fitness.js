export function computeFitness(metrics) {
  const reachedGoalBonus = metrics.reachedGoal && !metrics.failed ? 2800 : 0;
  const fallPenalty = metrics.failed ? 450 : 0;

  const fitness =
    metrics.validDistance * 10 +
    metrics.aliveSteps * 0.2 +
    metrics.contactQualityAverage * 80 +
    metrics.alternationScore * 100 +
    reachedGoalBonus -
    fallPenalty -
    (metrics.stagnationPenalty ?? 0) -
    (metrics.energyPenalty ?? 0) -
    (metrics.invalidPosePenalty ?? 0);

  return Number.isFinite(fitness) ? fitness : -9999;
}
