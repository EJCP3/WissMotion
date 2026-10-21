# Criterio: promo de marca

Para presentar una marca, un producto o un lanzamiento con aire "premium"
(ver `criterios.json` para las plantillas que lo usan por defecto). Viene del
framework de Intently (@leomeethewoo, autores de los promos de Trust Wallet,
fomo y PrizePicks) y de los videos de producto de Apple. Referencias:
`apple-siri-sizzle` y todas las `intently-*` en `references/references.json`.

La idea de fondo: **lo caro se ve caro porque nada está por accidente.** Cada
elección (fuente, fondo, color, música, sonido) tiene un motivo, y lo que
abarata (efectos de más, SFX sin motivo, música que no encaja) se quita.

## 1. Marca: reglas fijas, no decisiones nuevas

- Por video, como mucho **3 colores** de `brand.json`: fondo, texto y un acento.
  Los otros tres quedan de reserva.
- **Un tipo de fondo por marca** (liso, degradado o foto) y se repite en todos
  sus videos. El fondo nunca compite con el objeto principal.
- Fuentes: `brandHeading` y `brandBody`. Se permite **una** fuente de acento (manuscrita, display) solo para **una palabra por frase**, en el color de acento (ej. «en la _nube_»). Nada más de efecto.
- Misma marca + mismo tipo de video = misma personalidad y mismo rango de música.

## 2. Diseño antes que animación

Antes de escribir GSAP, el storyboard: una lista de planos con su idea, su
texto y su objeto principal (o fotogramas de Figma vía `/figma`). Si un plano
no se ve bien quieto, no se arregla animándolo.

Cada plano cumple:

- **Un plano = una idea.** Un mensaje, un objeto principal. Si hay dos, son dos planos.
- **Respirar no es vacío.** Un plano limpio tiene **un** protagonista, pero ese protagonista llena el cuadro: UI a sangre o casi (60–90 % del alto), cifra o palabra gigante (100–180 px a 1080p). Texto pequeño solo para frases secundarias. Si el cuadro se ve vacío, el protagonista es pequeño, no el plano demasiado limpio.
- **Fondo vivo, nunca plano.** Foto o video real (cielo, textura, lugar) o degradado con luz que se mueve; con capas delante y detrás del protagonista para dar profundidad.
- **Objeto principal en el centro** del encuadre (el centro real, no el del área libre).
- **Texto corto**: frases de 2-6 palabras. Lo que no se lee en el tiempo del plano, sobra.
- **UI reconstruida en HTML**, no capturas pegadas: la cámara se acerca a un
  elemento por plano (importe, botón, gráfica) en vez de enseñar la pantalla entera.

## 3. Animación

- **Variedad de movimiento.** Nunca el mismo fade para todo: combinar cámara (empuje, zoom a un elemento, alejarse), objetos en 3D (móvil inclinado que deriva), parallax de capas y elementos que se transforman en el siguiente. Algo se mueve siempre, aunque sea el fondo.
- **Transición de marca.** Si la marca tiene un elemento propio (nube, forma, logo), úsalo como transición que tapa y revela (ej. nubes de la landing en MisPesos).
- **Bento en vivo.** Para mostrar varias funciones a la vez: rejilla de celdas donde **cada celda es una escena viva** (su fondo, su bucle, su cifra contando), no tarjetas quietas. Referencia: `intently-prizepicks`. **El bento necesita tiempo**: ~10–12 s y 6+ funciones del producto, con la cámara recorriendo celdas; si sobra duración, se recorta otra escena, no el bento.

- **Nada lineal.** Todo con el easing de la personalidad (`personalities.json`),
  y los movimientos se solapan (`stagger`, entradas que empiezan antes de que
  acabe la salida anterior).
- **Transiciones que encadenan**, no cortes secos. Corte seco solo si el
  mensaje lo pide (golpe de ritmo, cambio de acto). Ver `transitions.json` y
  la skill `cut-the-curve`.
- **Ritmo que cambia.** Arranque ágil, frenar en el beneficio clave (dejar el
  plano quieto 1-1,5 s), acelerar hacia el cierre, cierre con logo quieto.
  Nunca la misma duración para todos los planos.
- Nada de vaivén de relleno: si algo se mueve, es porque cuenta algo.

## 4. Música por BPM

Elegir primero el BPM según la personalidad, después el género según el público.

| BPM     | Sensación                        | Personalidades                                       |
| ------- | -------------------------------- | ---------------------------------------------------- |
| 60-80   | Solemne, cinematográfico, legado | `premium`, `suave`                                   |
| 90-110  | Suave, relajado, sin esfuerzo    | `corporativo`, `suave`                               |
| 115-123 | Élite, cinético, sofisticado     | `tech`, `enérgico`                                   |
| > 123   | Hype, empuje                     | `juguetón`, `enérgico` (solo si la marca lo aguanta) |

Los cortes caen en el beat (`/music-to-video`, `hyperframes beats`).

## 5. Diseño de sonido

- Un SFX solo si refuerza una acción que se ve (clic, confirmación, cifra que llega).
- Al terminar, escuchar el video entero y **quitar** cualquier sonido demasiado
  alto, fuera de lugar o que no ayude a entender el producto.
- La música se mete debajo de la voz (voiceover carve, `/hyperframes-audio`).

## Recursos que se repiten en las referencias

El vocabulario visual de estos promos. Elegir 2-3 por video, no todos.

- **Texto pequeño y centrado** sobre fondo liso, entrando palabra a palabra
  (`stagger-words`, `blur-in`). El tamaño grande se reserva para una sola palabra o cifra.
- **Tipografía gigante recortada** que sale del encuadre, entrando desenfocada
  sobre un plano de color a sangre: el golpe de ritmo del video.
- **Un solo acento** sobre negro o blanco (azul de Axiom, verde de Trust): el
  color señala lo importante, no decora.
- **Cifra protagonista** que cuenta (`counter-up`, `number-roll`): importe, ganancia, tiempo.
- **UI de cerca**: una tarjeta o un control por plano, nunca la pantalla entera de golpe.
- **Objeto 3D como héroe**, nunca como fondo: monedas, losas, tarjetas o emojis
  3D alrededor de la UI. Entra como PNG/WebM con alfa.
- **Estado que avanza**: un punto sobre una curva o un botón que pasa a
  «Confirmado ✓» cuenta el producto sin texto.
- **Cierre fijo**: logo quieto + URL/redes en un pie pequeño.

## Revisión antes de renderizar

Además de `hyperframes lint` y `check`, repasar fotogramas (`frame_snapshot` o
`hyperframes snapshot`) con esta lista:

- [ ] Máximo 3 colores y un solo tipo de fondo en todo el video.
- [ ] Cada plano tiene una sola idea y un objeto principal centrado.
- [ ] Ningún movimiento lineal; las entradas y salidas se solapan.
- [ ] Sin cortes secos que no estén justificados.
- [ ] La duración de los planos varía (hay al menos una pausa en el beneficio clave).
- [ ] La música está en el rango de BPM de la personalidad y los cortes caen en el beat.
- [ ] Ningún SFX sobra.
