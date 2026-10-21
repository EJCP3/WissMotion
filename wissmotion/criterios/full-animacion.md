# Criterio: full animación

Para piezas donde **el movimiento es el mensaje**: películas de lanzamiento
cinéticas, reels de marca, intros, contenido de redes con energía. Lo
contrario de `promo-marca`: aquí no se deja respirar, todo se mueve y cada
cambio de plano es un efecto. Referencias: `launch-skills-blur`,
`launch-skillry`, `launch-skills-tabla` y `ruleta-colores` en
`references/references.json` (en las dos primeras no hay ni un corte seco).

Mucho efecto no es efecto al azar: el caos se ve caro solo si tiene sistema.

## Sistema (lo que no cambia)

- **Paleta corta y saturada**: 3-4 colores de marca que se turnan como fondo
  a sangre (negro → naranja → crema → violeta). Nada fuera de la paleta.
- **Una fuente pesada** (`brandHeading` en 800-900) para las palabras grandes;
  `brandBody` solo para los textos pequeños de esquina.
- **Marco fijo**: kicker y etiquetas pequeñas en las esquinas (nombre, sección,
  año) que no se mueven aunque todo lo demás sí. Es lo que sostiene el caos.
- **Un catálogo de 4-6 efectos** elegido al principio y repetido; no uno nuevo
  en cada plano.

## Movimiento

- **Cero cortes secos.** Cada cambio de plano es una transición
  (`tr-whip`, `tr-zoom-through`, `tr-push`, `tr-morph`) o un morph de un
  elemento al siguiente (punto → palabra, ficha → logo).
- **Nunca quieto más de ~0,5 s.** Si un plano se detiene es para el golpe
  final o el logo.
- **Palabras grandes** que entran y salen con desenfoque de movimiento
  (`blur-in`, `blur-out`, `kinetic-type`, `stagger-chars`), una o dos por plano.
- **Patrones de relleno** que dan energía al fondo: rejilla de formas,
  puntos, marquesina diagonal (`marquee`, `bento-shuffle`, `gradient-columns`).
- **Capas**: texto con contorno detrás de texto sólido, formas por delante y
  por detrás (`negative-mask`, `ring-carousel`, `card-stack`).
- **Construcción del logo** como cierre (`logo-build`, `fichas-logo`, `spring-pop`).
- Easing con golpe (`power3/4.out`, `expo.out`, `back.out`) y solapes
  cortos: la salida de un plano y la entrada del siguiente comparten tiempo.
- Velocidad emparejada en las costuras (skill `cut-the-curve`): la
  transición sale a la velocidad con la que entró el movimiento.

## Ritmo y audio

- Cortes y golpes **en el beat**: 115-130 BPM, más si es hype. Cambiar de
  efecto en los cambios de frase musical, no a mitad de compás.
- Acelerar en la parte central (planos de 0,4-0,8 s) y frenar solo en el cierre.
- SFX permitidos en las transiciones (whoosh, golpe, clic), siempre del mismo
  set y con volumen parejo. Si un SFX tapa la música, sobra.

## Duración y formato

8-30 s. Más largo cansa: si pasa de 30 s, mete una pausa de un plano
tranquilo en la mitad. Cualquier formato; en 9:16 las palabras grandes van partidas en dos líneas.

## Revisión antes de renderizar

- [ ] No hay ningún corte seco (cada cambio de plano es una transición o un morph).
- [ ] Todos los fondos y formas son de la paleta (3-4 colores).
- [ ] Se repite un catálogo de efectos, no hay un efecto distinto en cada plano.
- [ ] Las palabras grandes se leen (cada una al menos ~0,4 s nítida).
- [ ] Los golpes caen en el beat.
- [ ] El marco de esquinas no se mueve.
- [ ] El logo cierra y se queda quieto al final.
- [ ] Cada corte coincide con su estado de frontera del storyboard.
- [ ] Nada fijo cae fuera de la zona segura del formato (`README.md`, reglas comunes).
- [ ] Ningún texto va sobre un par prohibido de `validate-brand.mjs`.
