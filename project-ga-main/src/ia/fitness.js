export function computeFitness(metrics) {
  const fitness =
    metrics.distance * 5 +
    metrics.stepsAlive * 0.5 +
    (metrics.reachedGoal ? 1000 : 0) -
    (metrics.fell ? 220 : 0) -
    metrics.lowTorsoPenalty -
    metrics.rotationPenalty -
    metrics.backwardPenalty -
    metrics.chaoticPenalty;

  return Number.isFinite(fitness) ? fitness : -9999;
}
