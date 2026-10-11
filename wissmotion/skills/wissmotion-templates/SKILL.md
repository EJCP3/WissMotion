---
name: wissmotion-templates
description: Plantillas promocionales de WissMotion — 12 promos con variables, instanciador marca+contenido y render por lotes con presets de destino. Úsalo para crear videos promo sin escribir código.
---

# WissMotion Templates

12 plantillas en `wissmotion/templates/<id>/` (`index.html` + `template.json` + `preview.png`): promo-app, promo-web, logo-sting, feature-highlight, stats, testimonios, oferta, precios, evento, lanzamiento, antes-después, historia (9:16).

## Anatomía

- Variables en `<html data-composition-variables='[{id,type,label,default}]'>` (tipos: string/number/color/boolean/enum). Contenido: `data-var-text` / `data-var-src` (con fallback `src` real). Marca: vars CSS `--brand*` (auto-aplicadas por el runtime).
- IDs de marca estándar: `brandPrimary, brandSecondary, brandAccent, brandBackground, brandSurface, brandText, brandHeading, brandBody, brandLogo, brandName, brandTagline`.
- Render con overrides: `hyperframes render . --variables-file variables.json` (panel Variables del Studio las edita en vivo).

## Instanciar y renderizar

```bash
node instantiate.mjs --template promo-app --brand b.json --vars v.json --out ./p
node render-batch.mjs --project ./p --dest all --variables-file ./p/variables.json
```

`instantiate.mjs`: valida la marca, fusiona (contenido manda, marca rellena lo declarado; var desconocida = error), escribe `index.html` + `variables.json` + `brand.json` + `README.md`. `render-batch.mjs`: 9 destinos (youtube/linkedin/x/hero/webm/gif en 16:9; reels/tiktok/shorts en 9:16), chequea aspecto del proyecto, escribe `renders/<n>.<dest>.<ext>` + `manifest.json`, `--dry-run` para planificar.

## Reglas al crear plantillas

- Una root timeline pausada, clips con `class` + `data-start/duration/track-index`, defaults útiles en cada variable.
- `hyperframes lint` en 0 errores + póster vía `snapshot` antes de commitear; `templates.test.mjs` cubre contratos, bindings, instantiate y lint.
