# Genetic Walker (Vue + Vite + Matter.js)

Demo de algoritmo genético donde un bípedo 2D aprende a caminar desde el **punto A** hasta la **meta B**.

## Problema
Encontrar parámetros de marcha que permitan avanzar establemente hasta `goalX = 1000`.

## Representación
Cromosoma real-coded (8 genes normalizados) que se decodifica a:
- amplitud de cadera/rodilla
- frecuencia de paso
- desfase entre piernas
- sesgo de cadera/rodilla
- fuerza de motor
- estabilidad del torso

## Fitness
Combina:
- distancia avanzanda hacia la meta
- tiempo vivo
- bonus por llegar a la meta

Con penalizaciones por:
- caída
- torso bajo o muy inclinado
- retroceso
- movimiento caótico

## GA
- Inicialización aleatoria en rangos válidos
- Selección por torneo (`k=3`)
- Crossover BLX-α (`α=0.15`)
- Mutación gaussiana acotada (`rate=0.12`, `sigma=0.06`)
- Elitismo (`eliteSize=2`)
- Intensificación opcional: hill climbing ligero cada 10 generaciones
- Diversificación: mutación + población aleatoria (y opción de inmigrantes si se activa)

## Ejecución
```bash
npm install
npm run dev
```

## Qué verás
- UI limpia con canvas grande
- Generación actual y mejor distancia
- Avatar bípedo articulado con límites angulares razonables
- Entrenamiento automático por generaciones
- Reproducción visual del mejor individuo de cada generación
