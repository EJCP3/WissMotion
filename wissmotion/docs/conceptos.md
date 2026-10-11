# Conceptos

## Un proyecto = composición + marca

Cada video WissMotion son dos cosas: un `index.html` HyperFrames (HTML +
GSAP seek-safe) y un `brand.json` (esquema v1). Las plantillas añaden
`variables.json` (contenido) y `template.json` (manifiesto). El `.wissmotion`
es el zip con todo para compartir.

## Variables: el formulario sin código

Las plantillas declaran variables en el `<html>`
(`data-composition-variables`). El contenido entra por `data-var-text` /
`data-var-src`; la marca por variables CSS `--brand*` (el runtime las aplica
solo). Reglas:

- El contenido manda; la marca rellena lo que la plantilla declara.
- Variable desconocida en render con `--strict-variables` = error.
- Cada variable necesita un `default` útil: el preview funciona sin overrides.

## Movimiento con personalidad

`brand.json` trae `motionPersonality` (suave, enérgico, premium, juguetón,
corporativo, tech). Cada una fija easing, ritmo y recursos en
`presets/motion/personalities.json`. Los 30 presets + 4 transiciones son
bloques GSAP copiables con ejemplo lint-clean y póster.

## Determinismo

Mismo input, mismo video: timelines pausadas, sin reloj ni azar ni fetches
en render. Puertas: `hyperframes lint` (0 errores), tests con cobertura
preset↔ejemplo y snapshots de verificación.

## Dónde se edita cada cosa

| Quiero… | Voy a… |
|---|---|
| Cambiar textos/colores de un video | Panel Variables o `variables.json` |
| Cambiar la marca | Panel Marca o `brand.json` + tokens |
| Nueva animación | `presets/motion/` (preset + ejemplo + póster) |
| Nueva plantilla | `templates/<id>/` (HTML + variables + preview) |
| Nuevo destino de render | `render/render-batch.mjs` (`DESTINATIONS`) |
| Enseñarle todo a un agente | `AGENTS.md` + `skills/` + `server/mcp.mjs` |
