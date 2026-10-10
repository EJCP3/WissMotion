# WissMotion

Estudio local para crear **videos promocionales adaptados a la marca**, con
calidad visual inspirada en Jitter, construido sobre HyperFrames (fork,
Apache-2.0).

Ver el plan completo en [`ROADMAP.md`](ROADMAP.md).

## Estrategia de ramas

- `main` → sigue a `upstream` (heygen-com/hyperframes). No se desarrolla aquí.
- `wissmotion` → rama de producto (esta). Todo lo propio vive en `wissmotion/`.

Sincronización periódica:

```bash
git fetch upstream
git checkout main && git merge upstream/main
git checkout wissmotion && git merge main
```

## Estructura

```text
wissmotion/
  ROADMAP.md        → plan por fases (fuente de verdad)
  brand-kit/        → esquema brand.json, extractor, editor (Fase 1)
  templates/       → plantillas promocionales (Fase 3)
  presets/motion/  → personalidades y presets de movimiento (Fase 2)
  server/          → servidor MCP de WissMotion (Fase 8)
  docs/            → docs propias en español (Fase 10)
```

## Reglas

- Código propio solo en `wissmotion/` + parches mínimos al Studio.
- Licencia: se conserva `LICENSE` (Apache-2.0) y la atribución a HyperFrames.
- Sin telemetría ni marca HeyGen en el producto (ver Fase 0 del roadmap).
