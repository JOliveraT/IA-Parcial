# Genetic Walker (Vue + Vite + Matter.js)

Aplicación web de IA evolutiva donde una criatura poligonal simple aprende a caminar de **A** a **B** en un entorno 2D físico.

## 1) Problema formulado
El problema es optimizar un controlador cíclico para que el torso de la criatura avance desde `startX = 120` hasta `goalX = 2000` sin caer, sin arrastrar el torso por el suelo y con locomoción físicamente válida.

## 2) Modelo del avatar
El avatar usa:
- 1 torso rectangular.
- 2 piernas.
- Cada pierna con 2 segmentos: muslo + tibia.
- Articulaciones físicas con Matter.js (caderas y rodillas).

Postura inicial explícita:
1. Se calcula `groundTopY` desde el cuerpo físico del suelo.
2. Las tibias nacen tocando casi el suelo.
3. Rodillas y caderas quedan por encima con ligera flexión inicial.

## 3) Representación de solución (cromosoma)
Cada individuo es un cromosoma real-coded normalizado (11 genes):
- `hipAmplitude`
- `kneeAmplitude`
- `stepFrequency`
- `phaseOffset`
- `hipBias`
- `kneeBias`
- `kneePhase`
- `motorStrength`
- `bodyPitchAmplitude`
- `bodyPitchBias`
- `bodyStability`

Cada gen se decodifica a rangos físicos válidos para controlar caderas, rodillas y oscilación del torso.

## 4) Función fitness
La evaluación premia caminar válido y castiga soluciones espurias.

Premios:
- distancia válida del torso (`validDistance`),
- tiempo vivo,
- progreso relativo hacia meta,
- bonus fuerte por alcanzar meta sin caída.

Penalizaciones:
- caída,
- torso bajo,
- rotación excesiva,
- retroceso,
- estancamiento,
- arrastre post-caída,
- energía/control caótico.

## 5) Algoritmo genético (coherente con clase)
1. Inicialización aleatoria de población.
2. Evaluación de fitness de toda la población.
3. Repetición por generaciones.
4. Conservación de élite.
5. Selección por torneo.
6. Crossover BLX-α.
7. Mutación gaussiana acotada.
8. Retorno del mejor individuo.

## 6) Intensificación y diversificación
### Diversificación
- Población inicial aleatoria.
- Crossover + mutación.
- Inmigrantes aleatorios si hay estancamiento (plateau).

### Intensificación
- Elitismo (`eliteSize = 2`).
- Hill Climbing ligero cada `hillClimbEvery = 10` generaciones sobre el mejor.

## 7) Problemas enfrentados y resolución
- **Caídas falsas con éxito**: se endureció `reachedGoal` para exigir torso válido y en pie.
- **Arrastre contado como éxito**: se congeló distancia válida antes de caer y se agregó `dragPenalty`.
- **Postura inicial incorrecta**: inicialización geométrica basada en `groundTopY` real.
- **Meta mal detectada**: bandera visual B y `goalX` lógico ahora alineados en mundo.
- **Exploración vs explotación**: se balanceó con mutación, inmigrantes y hill climbing elitista.

## 8) Ejecución
```bash
npm install
npm run dev
npm run build
```

## 9) Qué grabar en el video final
- Inicio en postura apoyada (sin spawn flotando).
- Varias generaciones fallando y reiniciando.
- Incremento automático de generación.
- Mejora progresiva en distancia del torso.
- Alcance de meta B sin arrastre del torso.
- Uso de botones: Iniciar, Pausar, Reiniciar, Ver mejor.
