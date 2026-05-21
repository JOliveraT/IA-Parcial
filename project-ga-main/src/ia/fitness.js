export function computeFitness(metrics) {
  const immobilePenalty = metrics.distance < 20 ? 45 : 0;
  const fallPenalty = metrics.fell ? 900 : 0;
  const dragPenalty = Math.max(0, metrics.dragDistance ?? 0) * 8;
  const lowBodyPenalty = metrics.lowTorsoPenalty ?? 0;
  const rotationPenalty = metrics.rotationPenalty ?? 0;

  const reachedGoalBonus = metrics.reachedGoal && !metrics.fell ? 3500 : 0;

  const fitness =
    metrics.distance * 5 +
    metrics.stepsAlive * 0.5 +
    reachedGoalBonus -
    fallPenalty -
    lowBodyPenalty -
    rotationPenalty -
    (metrics.backwardPenalty ?? 0) -
    (metrics.chaoticPenalty ?? 0) -
    dragPenalty -
    immobilePenalty;

  return Number.isFinite(fitness) ? fitness : -9999;
}
