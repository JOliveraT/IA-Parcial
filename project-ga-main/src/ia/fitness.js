export function computeFitness(metrics) {
  const reachedGoalBonus = metrics.reachedGoal && !metrics.fell ? 5000 : 0;
  const fallPenalty = metrics.fell ? 1200 : 0;

  const fitness =
    metrics.validDistance * 6 +
    metrics.stepsAlive * 0.4 +
    metrics.progress * 400 +
    reachedGoalBonus -
    fallPenalty -
    (metrics.lowBodyPenalty ?? 0) -
    (metrics.rotationPenalty ?? 0) -
    (metrics.backwardPenalty ?? 0) -
    (metrics.stagnationPenalty ?? 0) -
    (metrics.dragPenalty ?? 0) -
    (metrics.energyPenalty ?? 0);

  return Number.isFinite(fitness) ? fitness : -9999;
}
