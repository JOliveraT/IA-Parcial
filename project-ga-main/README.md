# Genetic Walker (Vue + Vite)

Aplicación web donde una criatura simple aprende a caminar de **A → B** con algoritmo genético sobre **patrones articulares**.

## Modelo de locomoción (actual)
- Avatar: torso poligonal + 2 piernas (muslo + tibia).
- Inicio de cada intento quieto en A y apoyado en suelo.
- El ciclo se codifica con **8 keyframes**: `leftHip`, `leftKnee`, `rightHip`, `rightKnee`, `bodyPitch`.
- Se interpola suavemente entre keyframes.

## Apoyo alternado plantado
La locomoción usa una pierna de apoyo (stance) y una de recuperación (swing):
1. Según `phase` y `dutyFactor`, se decide qué pierna está en apoyo.
2. La punta de tibia de la pierna stance se fija al suelo como `stanceFootWorld`.
3. Con cinemática de esa pierna (ángulos de cadera/rodilla), se calcula la cadera/torso.
4. El cuerpo avanza solo si esa cinemática desplaza la cadera respecto al punto plantado.
5. Al cambiar de fase, la nueva pierna debe tocar suelo para convertirse en el nuevo apoyo.

> No hay avance por fórmula artificial (`x += gaitQuality`, `x += speed`, etc.).

## Inicialización híbrida de población
Se cambió de inicialización puramente aleatoria a esquema híbrido:
- **40%** semillas de marcha mutadas suaves (`createMutatedWalkingSeed(0.10)`).
- **40%** cromosomas aleatorios (`randomChromosome()`).
- **20%** semillas mutadas fuertes (`createMutatedWalkingSeed(0.25)`).

### ¿Por qué?
El espacio de búsqueda de keyframes articulares es muy grande. Empezar con algunas semillas de marcha:
- mejora **intensificación** (desde generación 1 hay intentos torpes pero reconocibles),
- sin perder **diversificación** (población aleatoria + mutación + crossover + inmigrantes).

El GA sigue siendo genético: selección por torneo, crossover BLX-α, mutación gaussiana acotada, elitismo e inmigración.

## Diversificación en plateau
Si hay estancamiento generacional:
- se insertan inmigrantes aleatorios (`randomImmigrantRate`),
- y también semillas mutadas (`seedImmigrantRate`).

Así se evita converger solo a una familia genética.

## Fallos de intento
Se corta el intento si aparece inestabilidad clara:
- torso demasiado bajo/alto;
- inclinación excesiva;
- cruce absurdo de piernas;
- estancamiento prolongado (con mínimo de pasos antes de activar corte);
- mala transición de apoyo.

## Fitness
Se optimiza:
- distancia válida;
- **pasos válidos** (peso alto);
- calidad de apoyo (poco deslizamiento del pie plantado);
- alternancia correcta;
- estabilidad y supervivencia temporal.

Con penalizaciones por caída/fallo, deslizamiento de pie, estancamiento, pose inválida y energía excesiva.

## Replay completo por generación
1. Se evalúa toda la población internamente.
2. Se selecciona el mejor individuo.
3. Se muestra: **“Generación N - Mejor intento”**.
4. Se reproduce **todo** su intento desde A.
5. Si falla, se muestra “Falló”.
6. Se reinicia visualmente en A y recién ahí pasa a N+1.

UI:
- Generación actual.
- Mejor distancia.
- Estado.
- Fase: Evaluando / Reproduciendo mejor intento / Reiniciando.

## Cámara / escala
- Cámara siguiendo al avatar (`cameraX ≈ bodyX - 230`).
- Piernas dibujadas con mayor grosor para visibilidad.
- Meta dibujada cuando entra en rango de cámara.

## Ejecución
```bash
npm install
npm run dev
npm run build
```
