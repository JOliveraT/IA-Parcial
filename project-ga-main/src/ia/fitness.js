export function computeFitness(metrics) {
  const reachedGoalBonus = metrics.reachedGoal && !metrics.failed ? 3200 : 0;
  const fallPenalty = metrics.failed ? 680 : 0;

  const fitness =
    metrics.validDistance * 10 +
    metrics.validSteps * 35 +
    metrics.stanceQuality * 100 +
    metrics.alternationQuality * 80 +
    (metrics.aliveSteps ?? 0) * 0.2 +
    reachedGoalBonus -
    fallPenalty -
    (metrics.footSlipPenalty ?? 0) -
    (metrics.stagnationPenalty ?? 0) -
    (metrics.invalidPosePenalty ?? 0) -
    (metrics.energyPenalty ?? 0);

  return Number.isFinite(fitness) ? fitness : -9999;
}
