# WissMotion (para agentes)

Estudio local de videos promo adaptados a marca, sobre HyperFrames (fork).
Stack del producto: `wissmotion/` (este directorio). Stack de render:
paquetes `packages/` de HyperFrames (no duplicar: reutilizar CLI/API).

## Mapa

| Necesidad                                                            | Dónde                                |
| -------------------------------------------------------------------- | ------------------------------------ |
| Marca: esquema, extractor, biblioteca, tokens                        | `brand-kit/` + `brand-kit/README.md` |
| Movimiento: personalidades, presets, transiciones, ejemplos, pósters | `presets/motion/` + `README.md`      |
| Plantillas: 17 promos con variables + instanciador                   | `templates/` + `README.md`           |
| Referencias de estilo: ficha, técnica y cómo recrear cada video      | `references/references.json`         |
| Mockups de dispositivos (CSS puro, tema claro/oscuro)                | `mockups/` + `README.md`             |
| Render por lotes + destinos                                          | `render/` + `README.md`              |
| Servidor MCP (23 herramientas, puente en vivo al Studio) + plugin    | `server/` + `README.md`              |
| Skills del producto                                                  | `skills/`                            |
| Plan por fases                                                       | `ROADMAP.md`                         |

## Reglas del producto

1. **Un solo formato de verdad**: composición HyperFrames (HTML + GSAP) + `brand.json`. Todo (IA, agentes, editor) lee/escribe esos archivos.
2. **Esquema `brand.json` v1**: `brandVersion: 1`, nombre + 6 colores hex + fuentes obligatorios. Validar siempre (`validate-brand.mjs` o herramienta MCP).
3. **Seek-safe**: una root timeline pausada por composición en `window.__timelines`; sin `Date.now()`, sin `Math.random()`, sin fetches en render. `hyperframes lint` debe dar 0 errores.
4. **Variables**: las plantillas declaran `data-composition-variables`; contenido por `--variables-file` o panel Variables. IDs de marca estándar: `brandPrimary…brandText`, `brandHeading`, `brandBody`, `brandLogo`, `brandName`, `brandTagline`.
5. **Espejos documentados**: `packages/studio/src/brand/contrast.ts` espeja `packages/cli/src/commands/contrast-bg.ts` (hay test de paridad); `brandTokens.ts` espeja `brand-tokens.mjs`. Si cambia el original, cambia el espejo.
6. **Ramas**: `main` = upstream (no desarrollar), `wissmotion` = producto. Código propio en `wissmotion/` + parches mínimos al Studio.

## Comandos

```bash
bun install && bun run build                      # base (una vez)
node wissmotion/brand-kit/validate-brand.mjs b.json
node wissmotion/brand-kit/extract-from-url.mjs <url> --out b.json
node wissmotion/templates/instantiate.mjs --template promo-app --brand b.json --vars v.json --out ./p
node wissmotion/render/render-batch.mjs --project ./p --dest all --dry-run
node wissmotion/server/mcp.mjs                    # MCP stdio
node --test wissmotion/*/[a-z]*.test.mjs          # tests del producto (o vía test:scripts)
node packages/cli/dist/cli.js lint <proyecto>     # puerta HyperFrames
```

Package manager: bun. Commits convencionales (`feat(wissmotion): …`). Lint/format: `bunx oxlint`, `bunx oxfmt`. Skills HyperFrames (`/hyperframes*`) para el contrato de composición.
