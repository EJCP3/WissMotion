---
name: wissmotion
description: Entrada a WissMotion — estudio local de videos promo adaptados a marca sobre HyperFrames. Úsalo para crear o editar promos (marca → plantilla → instanciar → render), saber qué fase está hecha y qué herramienta (MCP o CLI) toca en cada paso.
---

# WissMotion

Producto: videos promocionales adaptados a la marca del usuario, editables a mano o por prompt, render local. Ver `wissmotion/AGENTS.md` (mapa + reglas) y `wissmotion/ROADMAP.md` (estado por fases).

## Pipeline canónico

1. **Marca**: extraer (`brand_extract` / `extract-from-url.mjs`), validar, guardar en biblioteca, o editar en el panel Marca del Studio.
2. **Plantilla**: elegir en `template_list` (16: promo-app, promo-web, logo-sting, feature-highlight, stats, testimonios, oferta, precios, evento, lanzamiento, antes-después, historia 9:16, lista-cinetica 9:16, palabra, tabla-ui, fichas-logo).
3. **Instanciar**: `template_instantiate` (marca de biblioteca o inline + vars de contenido) → proyecto con `index.html` + `variables.json` + `brand.json`.
4. **Render**: `render_plan` para ver destinos; `render-batch.mjs` para MP4/WebM/GIF por destino (youtube, reels, tiktok, shorts, linkedin, x, hero…).

## Dónde vive cada cosa

- `wissmotion/brand-kit/` — esquema v1, validador Ajv, extractor, biblioteca, tokens CSS.
- `wissmotion/presets/motion/` — 6 personalidades, 38 presets, 4 transiciones, 42 ejemplos lint-clean + pósters.
- `wissmotion/mockups/` — teléfono, tablet, laptop, reloj y navegador en CSS puro (tema claro/oscuro, acento de marca).
- `wissmotion/templates/` — plantillas con `data-composition-variables` + instanciador.
- `wissmotion/references/` — videos de referencia ya analizados: técnica, `recreate` (plantilla/preset/transición) y hoja de fotogramas. Si el usuario pide "como tal referencia", empieza aquí.
- `wissmotion/render/` — lote por destinos con chequeo de aspecto.
- `wissmotion/server/mcp.mjs` — 11 herramientas MCP stdio (este mismo pipeline por protocolo).

## Invariantes (no negociables)

- `brand.json` siempre valida contra el esquema v1 antes de usarse.
- Composiciones seek-safe: timeline pausada en `window.__timelines`, sin reloj ni azar; `hyperframes lint` en 0 errores.
- Variables de marca estándar (`brandPrimary…`, `brandHeading/Body/Logo/Name/Tagline`); el contenido manda, la marca rellena.
- Para el contrato fino de composición/animación, leer además las skills `/hyperframes*` (core, animation, creative, cli).
