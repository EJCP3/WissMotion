---
name: wissmotion-motion
description: Kit de movimiento de WissMotion — 6 personalidades, 24 presets, 4 transiciones y 28 ejemplos seek-safe con pósters. Úsalo para animar composiciones con el look del producto.
---

# WissMotion Motion

Fuente: `wissmotion/presets/motion/` (`personalities.json`, `presets.json`, `transitions.json`, `examples/<id>/index.html`, `previews/<id>.png`, `render-previews.mjs`).

## Personalidades (de `brand.json motionPersonality`)

`suave` (sine.inOut, ×1.2), `enérgico` (power3.out, ×0.8), `premium` (expo.out, ×1.4), `juguetón` (back.out(1.7), ×0.9), `corporativo` (power2.out, ×1.0), `tech` (circ.out + blur, ×0.85). Cada una: easing base, escala de duración, stagger y flags blur/scalePunch.

## Presets (vars GSAP `from`/`to` + ejemplo)

- Entrada (8): mask-reveal, stagger-words, blur-in, spring-pop, slide-stack, scale-fade, wipe, typewriter.
- Salida (2): fade-slide-out, blur-out.
- Énfasis (7): pulse, highlight-sweep, underline-draw, counter-up, number-roll, shake, glow.
- Escena (7): device-mockup-scroll, browser-scroll, card-carousel, feature-grid, split-screen, logo-build, kinetic-type.
- Transiciones (4): tr-push, tr-zoom-through, tr-morph, tr-whip (duración + solape + in/out).

## Reglas

- Copia el bloque GSAP del ejemplo a una timeline pausada; escala duración × personalidad; `stagger-words`/`typewriter` exigen spans partidos a mano (no hay SplitText); `counter-up` usa `onUpdate` puro (probado seek-safe); repeats finitos (nada infinito).
- Easings solo de la lista conocida (`motion.test.mjs` la fija); `hyperframes lint` en 0 antes de renderizar; regenera pósters con `render-previews.mjs [--only id]` si tocas un ejemplo.
