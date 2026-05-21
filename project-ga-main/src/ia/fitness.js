export function evaluateFitness(creature) {
  const startX = creature.startX ?? 200; // o el spawn x real
  const currentX = creature.body.position.x;

  const deltaX = currentX - startX; // >0 derecha, <0 izquierda

  // Recompensa por avanzar a la derecha
  const forwardReward = Math.max(0, deltaX);

  // Penalización fuerte por ir a la izquierda
  const leftPenalty = deltaX < 0 ? Math.abs(deltaX) * 3 : 0;

  return forwardReward - leftPenalty;
}