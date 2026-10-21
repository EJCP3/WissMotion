# Objetos 3D con transparencia

Monedas, losas, tarjetas o emojis 3D que van **encima** de una escena
(alrededor de una UI, cruzando entre planos). Aparecen en 6 de las 7
referencias de `references/` (Trust Wallet, Axiom, PrizePicks…). El objeto
siempre es protagonista, nunca fondo (`criterios/promo-marca.md`).

Hay cuatro formas de conseguirlos; todas acaban en un **PNG o WebM con alfa**
que se anima con el preset `prop-3d` (`presets/motion/examples/prop-3d/`).

## 1. Generarlos aquí (Three.js, colores de marca)

`index.html` es una composición de 1080×1080 con fondo transparente y una
vuelta completa en 4 s (hace bucle sin salto).

| Variable       | Qué hace                                                               | Default            |
| -------------- | ---------------------------------------------------------------------- | ------------------ |
| `objeto`       | `moneda`, `losas` (pila tipo Axiom), `tarjeta` o `modelo` (un GLB)     | `moneda`           |
| `color`        | Color del objeto (usa `brandPrimary`)                                  | `#2f55ff`          |
| `colorDetalle` | Símbolo y anillo de la moneda, texto de la tarjeta                     | `#ffffff`          |
| `texto`        | Símbolo de la moneda o nombre en la tarjeta                            | `$`                |
| `metal`        | 0 = plástico brillante, 1 = metal                                      | `0.6`              |
| `modeloSrc`    | Ruta del `.glb` cuando `objeto` = `modelo`                             | `modelos/pera.glb` |
| `tenir`        | Pinta el modelo con `color` y `metal` (cambiar de marca sin remodelar) | `false`            |

```bash
# WebM VP9 con alfa (el que se usa en escenas)
node packages/cli/dist/cli.js render wissmotion/objetos-3d --format webm \
  --variables '{"objeto":"moneda","color":"#2f55ff","texto":"$"}' --output moneda.webm

# Una imagen fija con alfa (más ligera si el objeto no gira)
ffmpeg -c:v libvpx-vp9 -i moneda.webm -vf "select=eq(n\,0),format=rgba" -frames:v 1 moneda.png
```

Ojo: el decodificador por defecto de ffmpeg descarta el alfa del VP9; para
sacar fotogramas usa siempre `-c:v libvpx-vp9` **antes** de `-i`.

## 2. Blender en modo consola (`blender.mjs`)

WissMotion llama a Blender sin abrir su ventana (`blender -b … -P script.py`),
igual que llama a ffmpeg o a Chrome: no hace falta MCP ni complemento. Busca
Blender en `BLENDER_PATH` o la versión más nueva instalada.

```bash
# Modelar por script (un agente escribe el .py; ejemplo: la pera de PrizePicks)
node wissmotion/objetos-3d/blender.mjs run wissmotion/objetos-3d/blender/ejemplo_pera.py -- --out pera.glb

# Exportar un .blend hecho a mano a GLB (para objeto = modelo)
node wissmotion/objetos-3d/blender.mjs export escena.blend --out modelo.glb

# Render fotorrealista con Cycles: giro de 360° → WebM con alfa
node wissmotion/objetos-3d/blender.mjs render modelo.glb --out objeto.webm   [--frames 96 --res 1080 --samples 48 --color #2f55ff --metal 0.3]
```

Cuál usar:

| Objeto                                     | Camino                                                  |
| ------------------------------------------ | ------------------------------------------------------- |
| Moneda, losas, tarjeta, formas simples     | Three.js (`objeto` = moneda/losas/tarjeta)              |
| Forma compleja u orgánica (pera, mascota)  | Blender → GLB → Three.js (`objeto` = `modelo`, `tenir`) |
| Vidrio, cromado, fotorrealismo nivel Apple | Blender → `render` con Cycles → WebM                    |

Cycles va por CPU si no hay GPU NVIDIA: ~7 s por fotograma a 540 px y 24
muestras. Para un clip de 4 s a 1080 px cuenta varios minutos; prueba antes
con `--frames 8 --res 540`. Los scripts propios terminan imprimiendo `WM_OK`
(Blender devuelve 0 aunque el script falle; así se detecta el error).

`modelos/pera.glb` es el modelo de ejemplo (lo genera `ejemplo_pera.py`).

## 3. Traer los propios (Spline, Cinema 4D, Sketchfab…)

- Exporta con fondo transparente: secuencia PNG RGBA o ProRes 4444.
- Conviértelo a WebM con alfa:

```bash
ffmpeg -framerate 30 -i frame_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 objeto.webm
```

- Encuadra el objeto centrado con margen (que no toque los bordes al girar)
  y haz que el giro cierre el bucle si va a repetirse.

## 4. Generarlos con IA

Para objetos que no compensa modelar (emojis 3D, fotos de producto): imagen
generada o de catálogo con `/media-use`, y fondo quitado con
`hyperframes remove-background`. Resultado: PNG con alfa.

## Meterlos en una escena

```html
<img
  id="coin"
  class="prop clip"
  src="moneda.png"
  data-start="0.5"
  data-duration="4"
  data-track-index="2"
/>
<!-- o en movimiento: -->
<video
  id="coin"
  class="prop clip"
  src="moneda.webm"
  muted
  data-start="0.5"
  data-duration="4"
  data-track-index="2"
></video>
```

Anima con `prop-3d` (entrada con giro + flotación finita) y pon la sombra
con CSS (`filter: drop-shadow(...)`): el render del objeto no la lleva, así
encaja con cualquier fondo. El motor respeta el alfa de VP9 y ProRes al
renderizar.
