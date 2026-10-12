# Mockups de dispositivos

CSS puro (sin imágenes) para enmarcar capturas o escenas en un dispositivo.
Toma el color de acento de la marca (`--brand-primary`) y tiene tema oscuro
(por defecto) y claro (`data-theme="light"`).

| Clase        | Tamaño  | Marcado                                                                                                                                                   |
| ------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wm-phone`   | 300×620 | `<div class="wm-device wm-phone"><div class="wm-screen">…</div></div>`                                                                                    |
| `wm-tablet`  | 520×700 | `<div class="wm-device wm-tablet"><div class="wm-screen">…</div></div>`                                                                                   |
| `wm-laptop`  | 760×500 | `<div class="wm-device wm-laptop"><div class="wm-lid"><div class="wm-screen">…</div></div></div>`                                                         |
| `wm-watch`   | 220×260 | `<div class="wm-device wm-watch"><div class="wm-screen">…</div></div>`                                                                                    |
| `wm-browser` | 880×560 | `<div class="wm-device wm-browser"><div class="wm-bar"><i></i><i></i><i></i><span class="wm-url">tu.web</span></div><div class="wm-screen">…</div></div>` |

Dentro de `.wm-screen` va una `<img>`/`<video>` (se ajusta con `object-fit: cover`)
o cualquier escena HTML. Para otro tamaño, escala el dispositivo con `scale`
(transform), no cambiando width/height.

## Usar

1. Copia `mockups.css` al `<style>` de tu composición (o enlázalo si está en el proyecto).
2. Pega el marcado de la tabla y anima el dispositivo con cualquier preset (`spring-pop`, `flip-3d`, `device-mockup-scroll`…).

`index.html` es la composición de ejemplo con los cinco (`preview.png`);
`mockups.test.mjs` comprueba que pasa `hyperframes lint` y que la tabla y el CSS coinciden.
