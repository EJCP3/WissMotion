# Criterios por tipo de video

Un tutorial no se hace igual que un promo de marca ni que un anuncio. Cada
tipo de video tiene su criterio de calidad; el usuario puede cambiarlo o
elegir `libre` y hacerlo a su gusto.

| Criterio         | Para qué                                               | Archivo             |
| ---------------- | ------------------------------------------------------ | ------------------- |
| `promo-marca`    | Presentar marca, producto o lanzamiento (aire premium) | `promo-marca.md`    |
| `tutorial`       | Enseñar a usar algo paso a paso                        | `tutorial.md`       |
| `anuncio`        | Vender o convertir: oferta, precio, evento, testimonio | `anuncio.md`        |
| `full-animacion` | Mucho efecto y transición, sin cortes secos, al beat   | `full-animacion.md` |
| `libre`          | Sin criterio: estilo del usuario, solo reglas técnicas | —                   |

## Cómo se elige

1. Si el usuario dice para qué es el video (o pide `libre`), ese manda.
2. Si no, el de la plantilla (`templates` en `criterios.json`).
3. Si la plantilla no tiene, `default` (`promo-marca`).

`instantiate.mjs --criterio <id>` o `template_instantiate { criterio }` lo
fijan; queda escrito en el `README.md` del proyecto.

`libre` no relaja lo técnico: `brand.json` válido, composición seek-safe y
`hyperframes lint` en 0 siguen siendo obligatorios.

## Reglas comunes (todos los criterios, también `libre`)

### Zona segura

Las apps tapan los bordes con su interfaz (cuenta, botones, descripción).
Ningún texto, tarjeta, icono, logo ni subtítulo entra en estos márgenes; el
fondo y el video sí van a sangre. Nunca se cumple achicando el video ni con
bandas negras: se escala el contenido gráfico dentro de la zona.

| Formato              | Tamaño    | Lados  | Arriba | Abajo  |
| -------------------- | --------- | ------ | ------ | ------ |
| `9:16` Reels/TikTok  | 1080×1920 | 108 px | 150 px | 340 px |
| `4:5` feed vertical  | 1080×1350 | 108 px | 80 px  | 80 px  |
| `1:1` feed cuadrado  | 1080×1080 | 135 px | 80 px  | 80 px  |
| `16:9` YouTube / web | 1920×1080 | 96 px  | 54 px  | 54 px  |

Se comprueba con `wissmotion safe-zone --project dir` (formato deducido del
lienzo, o `--format`): imprime una línea `FUERA DE ZONA` por cada texto que
entra en un margen y sale con código 1. Revisa `--seek` (fracciones de la
duración, por defecto `.25,.5,.75,1`); un texto intencionado en el margen se
marca con `data-layout-allow-caption-zone`. Solo mira texto, no imágenes ni
logos.

En `9:16`, si es un anuncio de Meta o el texto es crítico, sube los márgenes
a 14 % arriba y 35 % abajo (≈270 y ≈670 px; `safe-zone --meta`). Solo cuenta lo que queda quieto:
lo que entra o sale en movimiento puede cruzar el margen.

### Estados de frontera

En el storyboard, por cada corte entre planos, se escribe qué hay en pantalla
en ese instante (fondo, forma, tamaño y posición). El último fotograma de un
plano y el primero del siguiente tienen que coincidir; si el video va en
bucle, el último fotograma = el primero.

### Pares prohibidos

`validate-brand.mjs` lista los pares de colores de la marca con contraste
< 3:1. Nunca va texto en esos pares; una forma de un color sobre el otro
lleva contorno del color `text`.

## Añadir un tipo

1. Escribe `<id>.md` con estructura, imagen, ritmo, audio, formato y su lista de revisión.
2. Añádelo a `criterios.json` (y mueve ahí las plantillas que le tocan por defecto).
3. `node --test wissmotion/criterios/criterios.test.mjs`.
