export function mutate(genes) {

  const mutationRate = 0.1

  return genes.map(gene => {

    if (Math.random() < mutationRate) {

      return gene + (Math.random() - 0.5)
    }

    return gene
  })
}