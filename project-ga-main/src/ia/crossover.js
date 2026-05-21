// Uniform
export function crossover(parentA, parentB) {
  const child = parentA.map((gene, index) =>
    Math.random() < 0.5 ? gene : parentB[index]
  );

  return child;
}
