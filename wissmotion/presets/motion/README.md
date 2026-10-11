# Kit de movimiento (Fase 2)

El "look Jitter": easing, ritmo y recursos por marca, más presets de
animación listos para componer. Todo **seek-safe** y determinista (los
ejemplos pasan `hyperframes lint` con 0 errores).

## Archivos

| Archivo                                  | Qué es                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `personalities.json` (+ `.schema.json`)  | Las 6 personalidades ligadas a `brand.json motionPersonality`: easing base, escala de duración, stagger y uso de blur/escala.                                                                                                                                                                                                                                                             |
| `presets.json`                           | 30 presets: 12 de entrada (incl. `stagger-chars`, `tracking-in`, `flip-3d`, `morph-box`), 2 de salida, 8 de énfasis (incl. `negative-mask`) y 8 de escena (`device-mockup-scroll`, `browser-scroll`, `card-carousel`, `feature-grid`, `split-screen`, `logo-build`, `kinetic-type`, `card-stack`). Cada uno: kind, descripción, ease, duración, stagger opcional y vars GSAP `from`/`to`. |
| `examples/<preset>/index.html`           | Composición mínima por preset (una root timeline pausada en `window.__timelines`).                                                                                                                                                                                                                                                                                                        |
| `transitions.json`                       | 4 transiciones entre escenas (`tr-push`, `tr-zoom-through`, `tr-morph`, `tr-whip`): duración, solape y vars GSAP de salida/entrada. Los shaders WebGL del paquete `shader-transitions` se usan tal cual donde el proyecto los pida.                                                                                                                                                       |
| `motion.test.mjs`                        | Contratos, cobertura preset↔ejemplo, determinismo estático, puerta `hyperframes lint` real y presencia de pósters sobre los 34 ejemplos.                                                                                                                                                                                                                                                  |
| `render-previews.mjs` + `previews/*.png` | Generador y pósters (un frame a mitad de animación por preset, vía `hyperframes snapshot`). Base de la galería de Fase 3; las miniaturas animadas llegan con `batchRender`.                                                                                                                                                                                                               |

## Usar un preset en una composición

1. Copia el bloque GSAP del ejemplo a tu timeline (pausada).
2. Ajusta `duration` × `durationScale` de tu personalidad y el `stagger`.
3. `stagger-words`, `stagger-chars`, `tracking-in` y `typewriter` requieren
   partir el texto en spans a mano (no hay SplitText: es plugin club de GSAP).
4. `negative-mask` necesita que la forma vaya **encima** del texto en el DOM.
5. Corre `node packages/cli/dist/cli.js lint <tu-proyecto>` antes de renderizar.
