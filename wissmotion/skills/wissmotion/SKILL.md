---
name: wissmotion
description: Entrada a WissMotion — estudio local de videos promo adaptados a marca sobre HyperFrames. Úsalo para crear o editar promos (marca → plantilla → instanciar → render), saber qué fase está hecha y qué herramienta (MCP o CLI) toca en cada paso.
---

# WissMotion

Producto: videos promocionales adaptados a la marca del usuario, editables a mano o por prompt, render local. Ver `wissmotion/AGENTS.md` (mapa + reglas) y `wissmotion/ROADMAP.md` (estado por fases).

## Pipeline canónico

Antes de nada, **para qué es el video**: `promo-marca`, `tutorial`, `anuncio`, `full-animacion` o `libre` (a gusto del usuario, sin criterio). Si no lo dice y no se deduce, pregúntalo una vez; si no, vale el de la plantilla. Lee `wissmotion/criterios/<id>.md` y pasa su lista de revisión antes del paso 4.

0. **Storyboard**: lista de planos según el criterio elegido; si piden "como tal video", parte de su ficha en `references/`.
1. **Marca**: extraer (`brand_extract` / `extract-from-url.mjs`), validar, guardar en biblioteca, o editar en el panel Marca del Studio.
2. **Plantilla**: elegir en `template_list` (18: promo-app, promo-web, ui-zoom, logo-sting, feature-highlight, stats, testimonios, oferta, precios, evento, lanzamiento, antes-después, historia 9:16, lista-cinetica 9:16, palabra, tabla-ui, fichas-logo, ruleta-colores).
3. **Instanciar**: `template_instantiate` (marca de biblioteca o inline + vars de contenido + `criterio`) → proyecto con `index.html` + `variables.json` + `brand.json`.
4. **Render**: `render_plan` para ver destinos; `render-batch.mjs` para MP4/WebM/GIF por destino (youtube, reels, tiktok, shorts, linkedin, x, hero…).

## Dónde vive cada cosa

- `wissmotion/brand-kit/` — esquema v1, validador Ajv, extractor, biblioteca, tokens CSS.
- `wissmotion/presets/motion/` — 6 personalidades, 40 presets, 4 transiciones, 44 ejemplos lint-clean + pósters.
- `wissmotion/objetos-3d/` — generador Three.js de objetos 3D con alfa (moneda, losas, tarjeta o un GLB propio; colores de marca) → WebM/PNG transparente; se animan con el preset `prop-3d`. `blender.mjs` usa Blender en modo consola: `run` (modelar por script), `export` (.blend → .glb) y `render` (Cycles → WebM con alfa). Ver su README.
- `wissmotion/mockups/` — teléfono, tablet, laptop, reloj y navegador en CSS puro (tema claro/oscuro, acento de marca).
- `wissmotion/templates/` — plantillas con `data-composition-variables` + instanciador.
- `wissmotion/references/` — videos de referencia ya analizados: técnica, `recreate` (plantilla/preset/transición) y hoja de fotogramas. Si el usuario pide "como tal referencia", empieza aquí.
- `wissmotion/render/` — lote por destinos con chequeo de aspecto.
- `wissmotion/server/mcp.mjs` — 23 herramientas MCP stdio + recursos y prompts; `studio_status`/`studio_call` editan el Studio abierto en vivo (este mismo pipeline por protocolo; `frame_snapshot` devuelve fotogramas para revisarlos con visión).

## Invariantes (no negociables)

- `brand.json` siempre valida contra el esquema v1 antes de usarse.
- Composiciones seek-safe: timeline pausada en `window.__timelines`, sin reloj ni azar; `hyperframes lint` en 0 errores.
- Variables de marca estándar (`brandPrimary…`, `brandHeading/Body/Logo/Name/Tagline`); el contenido manda, la marca rellena.
- Para el contrato fino de composición/animación, leer además las skills `/hyperframes*` (core, animation, creative, cli).
