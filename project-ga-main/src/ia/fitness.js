export function computeFitness(metrics) {
  const immobilePenalty = metrics.distance < 20 ? 45 : 0;
  const fallPenalty = metrics.fell ? 650 : 0;
  const dragPenalty = Math.max(0, (metrics.rawDistance ?? metrics.distance) - metrics.distance) * 4;
  const stabilityBonus = Math.max(0, metrics.stepsAlive * 0.2 - metrics.rotationPenalty * 0.35);

  const fitness =
    metrics.distance * 5 +
    metrics.stepsAlive * 0.5 +
    stabilityBonus +
    (metrics.reachedGoal && !metrics.fell ? 3000 : 0) -
    fallPenalty -
    metrics.lowTorsoPenalty -
    metrics.rotationPenalty -
    metrics.backwardPenalty -
    metrics.chaoticPenalty -
    dragPenalty -
    immobilePenalty;

  return Number.isFinite(fitness) ? fitness : -9999;
}
