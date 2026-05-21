export function computeFitness(metrics) {
  const immobilePenalty = metrics.distance < 20 ? 45 : 0;

  const fitness =
    metrics.distance * 5 +
    metrics.stepsAlive * 0.5 +
    (metrics.reachedGoal ? 3000 : 0) -
    (metrics.fell ? 250 : 0) -
    metrics.lowTorsoPenalty -
    metrics.rotationPenalty -
    metrics.backwardPenalty -
    metrics.chaoticPenalty -
    immobilePenalty;

  return Number.isFinite(fitness) ? fitness : -9999;
}
