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

## Fallos de intento
Se corta el intento si aparece inestabilidad clara:
- torso demasiado bajo/alto;
- inclinación excesiva;
- cruce absurdo de piernas;
- estancamiento prolongado;
- mala transición de apoyo.

## Fitness
Se optimiza:
- distancia válida;
- pasos válidos (transiciones stance correctas);
- calidad de apoyo (poco deslizamiento del pie plantado);
- alternancia correcta.

Con penalizaciones por caída/fallo, deslizamiento de pie, estancamiento, pose inválida y energía excesiva.

## GA del curso (mantenido)
- Inicialización aleatoria.
- Selección por torneo.
- Crossover BLX-α.
- Mutación gaussiana acotada.
- Elitismo.
- Diversificación con inmigrantes aleatorios.
- Intensificación con hill climbing ligero.

## Replay completo por generación
1. Se evalúa toda la población internamente.
2. Se selecciona el mejor individuo.
3. Se reproduce **todo** su intento desde A (avance/fallo/meta).
4. Recién después se pasa a la generación siguiente.

UI:
- Generación actual.
- Mejor distancia.
- Estado: Entrenando / Reproduciendo / Falló / Meta alcanzada.

## Ejecución
```bash
npm install
npm run dev
npm run build
```
