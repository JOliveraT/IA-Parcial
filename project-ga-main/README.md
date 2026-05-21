# Genetic Walker (Vue + Vite)

Aplicación web donde una criatura poligonal simple aprende a caminar de **A → B** usando un **algoritmo genético** con control articular semi-cinemático.

## Qué cambió y por qué
Se dejó atrás el enfoque ragdoll puro porque no mostraba aprendizaje estable generación por generación. Ahora el proyecto usa un modelo semi-cinemático articulado para que el GA aprenda **patrones de articulaciones**, no velocidad artificial.

## Avatar y simulación
- Cuerpo superior poligonal (torso).
- Dos piernas.
- Cada pierna con 2 segmentos (fémur + tibia).
- Articulaciones visibles de cadera y rodilla.
- Inicio quieto y apoyado en el suelo en cada intento.

Cada individuo codifica un ciclo de **keyframes articulares** con:
- `leftHip`, `leftKnee`, `rightHip`, `rightKnee`, `bodyPitch`.

En cada frame se interpola entre keyframes para obtener la pose objetivo.

## Cómo se genera el avance
La distancia no se calcula con una fórmula mágica del tipo `x += gaitQuality`.

El avance sale del contacto de las piernas:
1. Se calcula cinemática directa (cadera → rodilla → extremo de tibia).
2. Se detecta contacto del extremo de tibia con el suelo.
3. Si hay apoyo válido y el extremo se mueve hacia atrás relativo al cuerpo, se aplica empuje hacia adelante.
4. Se aplica fricción y límites de velocidad.

Sin contacto útil no hay empuje, por lo tanto no hay progreso real.

## Fallos de intento
Un intento puede fallar por:
- torso tocando suelo;
- inclinación excesiva;
- poses inválidas (piernas cruzadas);
- estancamiento largo;
- comportamiento inestable.

## Fitness
Se usa:

`fitness = validDistance*10 + aliveSteps*0.2 + contactQualityAverage*80 + alternationScore*100 + bonusMeta - penalizaciones`

Con penalizaciones por caída/fallo, estancamiento, energía excesiva y poses inválidas.

## GA del curso (mantenido)
- Inicialización aleatoria real-coded.
- Selección por torneo.
- Crossover BLX-α.
- Mutación gaussiana acotada.
- Elitismo.
- Diversificación con inmigrantes aleatorios en estancamiento.
- Intensificación con hill climbing ligero sobre élites.

## Flujo visual por generación
1. Se evalúa internamente toda la generación.
2. Se selecciona el mejor individuo.
3. Se reproduce el intento completo del mejor (inicio quieto, movimiento, avance/fallo/meta).
4. Pausa corta y reset.
5. Siguiente generación.

UI visible:
- Generación.
- Mejor distancia.
- Estado: Entrenando / Reproduciendo mejor intento / Falló / Meta alcanzada.

## Ejecución
```bash
npm install
npm run dev
npm run build
```
