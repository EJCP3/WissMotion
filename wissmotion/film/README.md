# Películas de varias escenas

Un storyboard JSON → una película: cada escena es una plantilla con tu
marca (en el formato que pidas), se renderiza por separado y se une con
transiciones de ffmpeg (`xfade`), con música opcional. Después, una
revisión automática para corregir antes de entregar.

```bash
node wissmotion/cli.mjs film --storyboard wissmotion/film/ejemplo.json --out ./mi-pelicula
node wissmotion/cli.mjs film --storyboard pelicula.json --out ./vertical --format 9:16
node wissmotion/cli.mjs film --review ./mi-pelicula
```

## Storyboard

```json
{
  "name": "acme-lanzamiento",
  "format": "16:9",
  "brand": "../brand-kit/brand.example.json",
  "music": "musica/bed.mp3",
  "transition": { "type": "fade", "duration": 0.5 },
  "scenes": [
    { "template": "logo-sting", "transition": { "type": "zoomin", "duration": 0.6 } },
    { "template": "promo-app", "vars": { "ctaLabel": "Pruébala gratis" } },
    { "template": "oferta" }
  ]
}
```

- `brand` y `music`: rutas relativas al storyboard (o `brand` como objeto).
- `transition` de una escena = la que la une con la siguiente; si falta, la global; si falta, `fade` 0,5 s.
- Transiciones: `fade`, `fadeblack`, `fadewhite`, `dissolve`, `slideleft/right/up/down`, `smoothleft/up`, `wipeleft/up`, `circleopen/close`, `zoomin`, `radial`.
- `format`: `16:9`, `9:16`, `1:1`, `4:5` (las plantillas multiformato traen layout propio).

Salida en `--out`: `escenas/NN-<plantilla>/` (proyectos normales, editables en
el Studio; vuelve a correr el build tras editar), `renders/escena-NN.mp4`,
`<name>.<formato>.mp4` y `film.json`.

## Revisión (`--review`)

Corre `hyperframes check` en cada escena (errores de runtime, desbordes de
layout, movimiento y contraste WCAG) y saca una hoja de 12 fotogramas de la
película en `review/pelicula.jpg`. Deja `review/review.md` (legible) y
`review/review.json`. Un agente con visión lee la hoja y el informe y
corrige las escenas; sale con código 1 si hay errores.
