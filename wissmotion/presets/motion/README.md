# Kit de movimiento (Fase 2)

El "look Jitter": easing, ritmo y recursos por marca, más presets de
animación listos para componer. Todo **seek-safe** y determinista (los
ejemplos pasan `hyperframes lint` con 0 errores).

## Archivos

| Archivo                                 | Qué es                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `personalities.json` (+ `.schema.json`) | Las 6 personalidades ligadas a `brand.json motionPersonality`: easing base, escala de duración, stagger y uso de blur/escala.                                                                                                                                                                                                                                                         |
| `presets.json`                          | 17 presets: 8 de entrada (`mask-reveal`, `stagger-words`, `blur-in`, `spring-pop`, `slide-stack`, `scale-fade`, `wipe`, `typewriter`), 2 de salida (`fade-slide-out`, `blur-out`) y 7 de énfasis (`pulse`, `highlight-sweep`, `underline-draw`, `counter-up`, `number-roll`, `shake`, `glow`). Cada uno: kind, descripción, ease, duración, stagger opcional y vars GSAP `from`/`to`. |
| `examples/<preset>/index.html`          | Composición mínima por preset (una root timeline pausada en `window.__timelines`).                                                                                                                                                                                                                                                                                                    |
| `motion.test.mjs`                       | Contratos (esquemas, easings conocidos), cobertura preset↔ejemplo, determinismo estático y puerta `hyperframes lint` real sobre los 17 ejemplos.                                                                                                                                                                                                                                      |

## Usar un preset en una composición

1. Copia el bloque GSAP del ejemplo a tu timeline (pausada).
2. Ajusta `duration` × `durationScale` de tu personalidad y el `stagger`.
3. `stagger-words` y `typewriter` requieren partir el texto en spans a mano
   (no hay SplitText: es plugin club de GSAP).
4. Corre `node packages/cli/dist/cli.js lint <tu-proyecto>` antes de renderizar.
