export function computeFitness(metrics) {
  const forward = Math.max(0, metrics.deltaX);
  const fallback = Math.max(0, -metrics.deltaX);

  const fitness =
    forward * 3.0 +
    metrics.survivalRatio * 8.0 -
    metrics.avgTorsoAngle * 10.0 -
    metrics.verticalBounce * 2.0 -
    fallback * 1.5 -
    metrics.controlEffort * 0.02 -
    (metrics.fell ? 100 : 0) -
    metrics.dragPenalty * 1.25;

  return Number.isFinite(fitness) ? fitness : -9999;
}
