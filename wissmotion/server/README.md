# Servidor MCP de WissMotion (Fase 8.1, stdio)

`mcp.mjs` expone el producto a agentes (Claude Code, OpenCode, Cursor…)
por JSON-RPC NDJSON, sin dependencias. Cubre marca, plantillas, movimiento
y planificación de render; el puente en vivo con el Studio abierto y el
transporte HTTP llegan después.

```bash
node wissmotion/server/mcp.mjs   # los agentes lo lanzan como `npx wissmotion mcp`
```

| Herramienta                               | Qué hace                                                           |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `brand_validate`                          | Valida una marca inline contra el esquema v1                       |
| `brand_extract`                           | Marca desde URL (sin IA)                                           |
| `brand_list` / `brand_save` / `brand_get` | Biblioteca (`--dir` o `WISSMOTION_BRANDS_DIR`)                     |
| `template_list`                           | 14 plantillas con sus variables                                    |
| `template_instantiate`                    | Proyecto desde plantilla + marca + vars (`format` opcional)        |
| `motion_list`                             | Personalidades, 38 presets y 4 transiciones                        |
| `render_plan`                             | Lote por destino con chequeo de aspecto y formatos (no renderiza)  |
| `film_build`                              | Película de varias escenas desde un storyboard (`dryRun` opcional) |
| `film_review`                             | `hyperframes check` por escena + hoja de fotogramas de la película |

`server.test.mjs` levanta el servidor por stdio y prueba handshake,
las 11 herramientas y el error de herramienta desconocida.

`agents-setup.mjs` (Fase 8.3): detecta agentes instalados y emite/escribe su
config MCP (`--list`, `--write opencode|cursor|…`). Cubre Claude Code,
Claude Desktop, OpenCode, Cursor, VS Code, Gemini CLI, Codex y Antigravity.
