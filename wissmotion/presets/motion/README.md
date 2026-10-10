# Kit de movimiento (Fase 2)

El "look Jitter": easing, ritmo y recursos por marca, más presets de
animación listos para componer. Todo **seek-safe** y determinista (los
ejemplos pasan `hyperframes lint` con 0 errores).

## Archivos

| Archivo                                 | Qué es                                                                                                                                                                                                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `personalities.json` (+ `.schema.json`) | Las 6 personalidades ligadas a `brand.json motionPersonality`: easing base, escala de duración, stagger y uso de blur/escala.                                                                                                                                                       |
| `presets.json`                          | 24 presets: 8 de entrada, 2 de salida, 7 de énfasis y 7 de escena (`device-mockup-scroll`, `browser-scroll`, `card-carousel`, `feature-grid`, `split-screen`, `logo-build`, `kinetic-type`). Cada uno: kind, descripción, ease, duración, stagger opcional y vars GSAP `from`/`to`. |
| `examples/<preset>/index.html`          | Composición mínima por preset (una root timeline pausada en `window.__timelines`).                                                                                                                                                                                                  |
| `motion.test.mjs`                       | Contratos (esquemas, easings conocidos), cobertura preset↔ejemplo, determinismo estático y puerta `hyperframes lint` real sobre los 24 ejemplos.                                                                                                                                    |

## Usar un preset en una composición

1. Copia el bloque GSAP del ejemplo a tu timeline (pausada).
2. Ajusta `duration` × `durationScale` de tu personalidad y el `stagger`.
3. `stagger-words` y `typewriter` requieren partir el texto en spans a mano
   (no hay SplitText: es plugin club de GSAP).
4. Corre `node packages/cli/dist/cli.js lint <tu-proyecto>` antes de renderizar.
