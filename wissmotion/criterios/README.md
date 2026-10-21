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

## Añadir un tipo

1. Escribe `<id>.md` con estructura, imagen, ritmo, audio, formato y su lista de revisión.
2. Añádelo a `criterios.json` (y mueve ahí las plantillas que le tocan por defecto).
3. `node --test wissmotion/criterios/criterios.test.mjs`.
