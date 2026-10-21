# Criterio: tutorial

Para enseñar a usar algo: un flujo de la app, una función paso a paso, un
onboarding. Aquí manda **que se entienda**, no que parezca caro: lo que en un
promo de marca sobra (capturas reales, cursor, clics con sonido, texto
explicativo) aquí es necesario.

## Estructura

1. **Qué vas a aprender** (1 plano, 2-3 s): el resultado final, primero.
2. **Pasos numerados**: un paso = una acción. Número y verbo visibles
   («1. Abre Ajustes»). Entre 3 y 7 pasos; si hay más, son dos tutoriales.
3. **Resumen** (1 plano): los pasos en lista, para quien salta al final.
4. CTA suave: dónde seguir (docs, siguiente tutorial).

## Imagen

- **Pantallas reales** (capturas o grabación) dentro de un mockup; la UI
  reconstruida en HTML solo si la real no se lee.
- **Cursor visible** que va a cada sitio antes de que pase algo y hace clic
  (skill `oversized-cursor`): el ojo sigue al cursor.
- **Zoom a la zona de la acción** y vuelta al plano general entre pasos, para
  no perder dónde estamos (`hyperframes-keyframes`).
- Resaltar lo que se toca (`highlight-sweep`, `glow`, `underline-draw`), nunca más de un resalte a la vez.
- Indicador de progreso (paso 2 de 5) en una esquina fija.
- Fondo y colores de marca, pero sobrios: la pantalla es la protagonista.

## Ritmo

- Cada paso dura lo que se tarda en leerlo y verlo: 3-6 s, más si hay voz.
- Transiciones cortas y siempre iguales (`tr-push`); nada de efectos de golpe.
- El ritmo lo marca la narración, no la música.

## Audio

- **Voz en off o subtítulos** obligatorios (`/media-use` para la voz,
  `/embedded-captions` o captions del MCP). Debe entenderse sin sonido.
- Música opcional, de fondo y baja (90-110 BPM), siempre por debajo de la voz.
- SFX de clic y de confirmación permitidos: son información, no adorno.

## Duración y formato

30 s a 3 min. 16:9 para web/YouTube; 9:16 solo si son pasos muy cortos.

## Revisión antes de renderizar

- [ ] Cada paso tiene número, verbo y una sola acción.
- [ ] El cursor llega antes que la acción en todos los clics.
- [ ] Se entiende con el sonido apagado.
- [ ] Ningún texto desaparece antes de poder leerse.
- [ ] Hay resumen al final.
