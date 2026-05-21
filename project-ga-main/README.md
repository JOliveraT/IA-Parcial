# Genetic Walker (Vue + Vite + Matter.js)

Proyecto de IA evolutiva donde un avatar físico aprende **solo a caminar** en 2D usando un algoritmo genético real-coded.

## Objetivo
Mejorar estabilidad y velocidad de aprendizaje del caminante sin obstáculos ni salto.

## Ejecución
```bash
npm install
npm run dev
```

## Representación genética
- Cromosoma normalizado en `[0,1]` con 8 genes.
- Operadores (selección, crossover, mutación) trabajan en espacio normalizado.
- Decodificación a rangos físicos solo en control del avatar.

Genes:
1. `hipAmp` [0.15, 1.20]
2. `kneeAmp` [0.05, 0.90]
3. `frequency` [0.60, 3.50]
4. `phaseOffset` [2.60, 3.70]
5. `kneeLag` [0.10, 1.80]
6. `torsoBias` [-0.25, 0.25]
7. `stabilityGain` [0.00, 0.80]
8. `controlScale` [0.20, 1.50]

## Control del avatar
Señales periódicas sinusoidales para caderas y rodillas, más estabilización suave de torso:
- caderas en contrafase con `phaseOffset`
- rodillas con retardo `kneeLag`
- estabilización proporcional usando `stabilityGain` y `torsoBias`
- límites de velocidad angular para evitar control absurdo

## Fitness robusto
Combina:
- avance horizontal a la derecha
- supervivencia
- estabilidad angular del torso
- menor rebote vertical
- menor retroceso
- menor esfuerzo de control

Penaliza fuerte si cae.

## Algoritmo genético
- Inicialización: población aleatoria.
- Selección: torneo (`k=2`, configurable).
- Crossover principal: **BLX-α** (α=0.2).
- Mutación: gaussiana acotada en `[0,1]`.
- Elitismo moderado (`eliteSize=1`).

## Intensificación y diversificación
**Intensificación:**
- Conservación de élite.
- Hill Climbing local sobre el mejor (3-5 vecinos, sigma local pequeño).

**Diversificación:**
- Población inicial aleatoria.
- BLX-α + mutación gaussiana.
- Inmigrantes aleatorios en estancamiento.
- Medición explícita de diversidad genética.

## Aceleración de generaciones
- Evaluación headless en entrenamiento.
- Simulación determinista con `Engine.update(fixedDelta)`.
- Early stopping para individuos malos (caída, no avance, retroceso excesivo, fuera de límites).
- Render visual enfocado al mejor individuo y desacoplado del ciclo principal.

## Métricas por generación
- generation
- bestFitness, avgFitness, medianFitness, worstFitness
- diversity
- plateauGenerations
- evalMs y evaluationsPerSecond
- bestGenes decodificados
- indicadores de Hill Climbing y mutación adaptativa

## Problemas previos y mejoras
Antes: fitness muy simple, genes pocos/no normalizados, evaluación lenta y poco aprendizaje observable.
Ahora: GA real-coded estable, métricas claras, control más físico y entrenamiento más rápido y medible.
