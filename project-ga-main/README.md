# Genetic Walker (Vue + Vite)

Aplicación web donde un avatar poligonal aprende a caminar de **A → B** usando un **algoritmo genético** y una simulación **semi-cinemática** estable.

## Problema
El enfoque ragdoll físico puro (constraints libres) producía:
- caídas falsas;
- arrastre contado como avance;
- inestabilidad numérica;
- falta de progreso generacional visible.

Para cumplir el enunciado del curso, se cambió a un modelo controlado donde el GA evoluciona parámetros de marcha y el avance depende de la calidad real de esa marcha.

## Modelo semi-cinemático
El cromosoma codifica una marcha cíclica con senoidales:
- `hipAmplitude`, `kneeAmplitude`, `stepFrequency`, `phaseOffset`
- `hipBias`, `kneeBias`, `kneePhase`
- `bodyPitchAmplitude`, `bodyPitchBias`
- `strideLength`, `stabilityFactor`, `energyFactor`

Con esos genes se calcula la pose por frame y se dibuja un avatar poligonal con:
- torso rectangular;
- dos piernas;
- cada pierna con fémur + tibia;
- rodilla visible;
- oscilación leve del torso.

## Fitness
Se usa una combinación de distancia válida, calidad de marcha y robustez:

`fitness = validDistance*8 + aliveSteps*0.3 + gaitQualityAverage*100 + bonusMeta - penalizaciones`

Penaliza inestabilidad, energía, estancamiento y fallos. Si el intento es inválido, la distancia se degrada fuertemente.

## GA implementado
- Inicialización aleatoria real-coded.
- Selección por torneo.
- Crossover BLX-α.
- Mutación gaussiana acotada.
- Elitismo.
- Diversificación con inmigrantes aleatorios cuando hay plateau.
- Intensificación con hill climbing ligero cada `hillClimbEvery` generaciones.

## Curriculum learning
Meta interna progresiva:

`currentGoal = min(goalX, 400 + generation * 12)`

La UI mantiene visible la meta final **B**, pero el fitness acelera aprendizaje por objetivos intermedios.

## Ejecución
```bash
npm install
npm run dev
```

Para validación de entrega:
```bash
npm run build
```

## Qué mostrar en el video
1. Botón **Iniciar** y generaciones automáticas.
2. Avatar caminando con flexión de rodillas.
3. Incremento de mejor distancia entre generaciones.
4. Uso de **Ver mejor** para reproducir el mejor individuo.
5. Llegada parcial/final hacia B según progreso.
