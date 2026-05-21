export function computeFitness(metrics) {
  const reachedGoalBonus = metrics.reachedGoal && !metrics.failed ? 3200 : 0;
  const fallPenalty = metrics.failed ? 760 : 0;

  const fitness =
    metrics.validDistance * 10 +
    metrics.validSteps * 60 +
    metrics.stanceQuality * 80 +
    metrics.alternationQuality * 80 +
    (metrics.aliveSteps ?? 0) * 0.15 +
    reachedGoalBonus -
    fallPenalty -
    (metrics.footSlipPenalty ?? 0) -
    (metrics.stagnationPenalty ?? 0) -
    (metrics.invalidPosePenalty ?? 0) -
    (metrics.groundPenetrationPenalty ?? 0) -
    (metrics.invalidGroundContactPenalty ?? 0) -
    (metrics.energyPenalty ?? 0);

  return Number.isFinite(fitness) ? fitness : -9999;
}
