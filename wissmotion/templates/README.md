# Plantillas promocionales (Fase 3, MVP: 3)

Composiciones HyperFrames con variables (`data-composition-variables`):
el mismo `index.html` sirve a todas las marcas vía `--variables-file`
(y el panel Variables del Studio las edita en vivo).

| Plantilla            | Qué es                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `promo-app/`         | App móvil: mockup con scroll, nombre, tagline, 3 features y CTA. 8 s. ![promo-app](promo-app/preview.png)                                                                     |
| `promo-web/`         | Web/SaaS: navegador con captura, titular, subtítulo, 3 features y CTA. 8 s. ![promo-web](promo-web/preview.png)                                                               |
| `logo-sting/`        | Intro de logo (pop + reveal + tagline + fade). 6 s. ![logo-sting](logo-sting/preview.png)                                                                                     |
| `feature-highlight/` | Una función en 8 s: kicker, titular con reveal, subrayado y descripción. ![feature-highlight](feature-highlight/preview.png)                                                  |
| `stats/`             | 3 cifras con etiquetas en grilla. 6 s. ![stats](stats/preview.png)                                                                                                            |
| `testimonios/`       | Cita con autor, cargo y estrellas. 6 s. ![testimonios](testimonios/preview.png)                                                                                               |
| `oferta/`            | Badge, titular con descuento, descripción y CTA con pulse. 6 s. ![oferta](oferta/preview.png)                                                                                 |
| `precios/`           | 3 planes con destacado central y CTA. 6 s. ![precios](precios/preview.png)                                                                                                    |
| `evento/`            | Anuncio de evento en vivo con fecha y CTA. 6 s. ![evento](evento/preview.png)                                                                                                 |
| `lanzamiento/`       | Countdown 3-2-1 con reveal del nombre y fecha. 6 s. ![lanzamiento](lanzamiento/preview.png)                                                                                   |
| `antes-despues/`     | Comparativa con dos imágenes, divisor y etiquetas. 6 s. ![antes-despues](antes-despues/preview.png)                                                                           |
| `historia/`          | Vertical 9:16 con barra de progreso, titular y CTA. 6 s. ![historia](historia/preview.png)                                                                                    |
| `palabra/`           | Palabra gigante con punto de acento y desenfoque de movimiento; encadénala en una película (`film/`). 2,6 s. ![palabra](palabra/preview.png)                                  |
| `tabla-ui/`          | Titular + tabla de producto con filas en cascada, etiquetas y columna resaltada. 5 s. ![tabla-ui](tabla-ui/preview.png)                                                       |
| `fichas-logo/`       | Nombre de marca letra a letra en fichas de colores (giro + desenfoque) sobre rejilla de puntos. 4,5 s. ![fichas-logo](fichas-logo/preview.png)                                |
| `ruleta-colores/`    | Columna circular de palabras; el fondo cambia al color de la activa y el HEX se actualiza. Palabras y colores editables. 9,8 s. ![ruleta-colores](ruleta-colores/preview.png) |
| `lista-cinetica/`    | Columna cinética vertical con foco nítido y flecha (estilo Jitter List). 9 s, 9:16. ![lista-cinetica](lista-cinetica/preview.png)                                             |

## Multiformato (16:9, 9:16, 1:1, 4:5)

Todas salvo `historia` y `lista-cinetica` (nativas 9:16) traen composición
propia para cada formato: en su CSS, bloques `#stage[data-format="9:16"] …`
y en `template.json` la lista `formats`. No es un 16:9 encogido: cada
formato recoloca y reescala texto, mockups y CTA.

```bash
node instantiate.mjs --template promo-app --brand b.json --format 9:16 --out ./vertical
node ../render/render-batch.mjs --project ./mi-promo --dest all   # cada destino en su formato
```

**Duraciones variables**: `--duration 15` (o `duration` en el MCP y en cada
escena de `film`) re-escala la plantilla a 6, 15, 30, 60 s… `retime.mjs`
multiplica `data-start`/`data-duration` de los clips y envuelve la timeline
raíz en otra con `timeScale`, así que sigue siendo seek-safe.

```bash
node instantiate.mjs --template logo-sting --brand b.json --duration 15 --out ./sting-15s
```

`formats.mjs` (`applyFormat`) fija tamaño y `data-format`; el render por
lotes genera `.format-9x16.html` desde el `index.html` actual (lo editado en
el Studio llega a todos los formatos). `formats.test.mjs` comprueba que lo
declarado en `template.json` y los bloques CSS coinciden. Para añadir un
formato a una plantilla: bloque CSS + entrada en `formats`.

## Fuentes de marca

Cada plantilla trae un `<link data-wm-fonts>` de Google Fonts (Inter por
defecto) y `instantiate.mjs` / el Studio lo reescriben con las fuentes de la
marca (`fonts.mjs`). Sin él, `var(--brandHeading)` no es visible para el
inyector de fuentes del render y el texto cae a Times. Pósters:
`node render-previews.mjs [--only id]`.

## Convención de variables

Las plantillas declaran `brand*` (colores, fuentes, logo, nombre, tagline)
más su contenido (`headline`, `feature1…`, `ctaLabel`, `screenShot`…).
`instantiate.mjs` fusiona: el contenido manda, la marca rellena lo que la
plantilla declara (lo no declarado se ignora, lo desconocido es error).

```bash
node instantiate.mjs --template promo-app \
  --brand ../brand-kit/brand.example.json \
  --vars vars.json --out ./mi-promo
node packages/cli/dist/cli.js render ./mi-promo --variables-file ./mi-promo/variables.json
```

`vars.json` ejemplo: `{"brandName":"Acme","ctaLabel":"Instalar ya"}`.

## Nota de build (galería del Studio)

El Home del Studio incrusta las plantillas vía
`packages/studio/src/home/wissmotionTemplates.ts`, pero tsup no entiende
`?raw`: el HTML viaja en `wissmotionTemplates.generated.ts`. Tras editar
cualquier `templates/<id>/index.html`:

```bash
node wissmotion/sync-templates.mjs
```

El test de frescura falla si lo olvidas.

## Guardar un proyecto como plantilla

```bash
node templateize.mjs --project ./mi-promo --id mi-promo --name "Mi promo"
```

Copia el `index.html` a `templates/<id>/` con `template.json` (formato
detectado del `data-width/height`) si declara variables; ida y vuelta
probada (la guardada se vuelve a instanciar).

## Regla de timing

El render dura lo que la **timeline**, no los clips: cada plantilla termina
su último tween (hold, pulse o fade de salida) exactamente en la duración
del manifiesto. `templates.test.mjs` lo verifica (±0.6 s).
