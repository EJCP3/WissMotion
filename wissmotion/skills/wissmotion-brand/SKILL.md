---
name: wissmotion-brand
description: Brand Kit de WissMotion — esquema brand.json v1, extractor desde URL sin IA, biblioteca de marcas, tokens CSS y aviso de contraste AA/AAA. Úsalo para crear, validar, extraer o aplicar marcas.
---

# WissMotion Brand

Contrato: `wissmotion/brand-kit/brand.schema.json` (`brandVersion: 1`). Obliga nombre + 6 colores hex (`primary, secondary, accent, background, surface, text`) + fuentes (`heading, body`). Opcional: tagline, URL, logo (5 variantes), tono, `motionPersonality` (una de las 6 de `presets/motion/personalities.json`), features, CTA, capturas, redes. `additionalProperties: false`.

## Operaciones (CLI o MCP, misma lógica)

- Validar: `node validate-brand.mjs marca.json` (Ajv draft 2020-12) o `brand_validate`.
- Extraer: `node extract-from-url.mjs <url> --out b.json [--save nombre] [--screenshots dir]` o `brand_extract`. Lee HTML + CSS propio (máx. 5 hojas): colores por frecuencia (hex/rgb/hsl normalizados), fuentes (Google Fonts + CSS), favicon (SVG > PNG > ICO), meta/OG. Mapeo determinista documentado en `extract-lib.mjs`; fallbacks neutros si no hay nada.
- Biblioteca (`~/.wissmotion/brands`): `saveBrand/getBrand/listBrands/duplicateBrand/exportBrand/importBrand` en `brand-library.mjs`; todo lo que entra valida.
- Tokens: `brandToCss` → `:root { --brand-*: … }` (`brand-tokens.mjs` canónico CLI; `packages/studio/src/brand/brandTokens.ts` espejo para el Studio).
- Contraste: `packages/studio/src/brand/contrast.ts` espeja `packages/cli/src/commands/contrast-bg.ts` (test de paridad). Pares del panel: texto/fondo, texto/superficie, blanco/primario (CTA), primario/fondo; aviso bajo AA (4.5) con tinta sugerida aplicable. Tonos derivados: 5 pasos por color.

## Editor manual

Panel "Marca" del Studio (`packages/studio/src/brand/`): identidad, 6 colores, tipografías con buscador Google Fonts, pesos, personalidad, logo (subida ≤800 KB o URL), features/CTA, preview en vivo, exportar/importar/copiar tokens. Persiste por proyecto (localStorage; el `brand.json` del proyecto llega con Fase 9).
