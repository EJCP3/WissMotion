# Servidor MCP de WissMotion (Fase 8.1, stdio)

`mcp.mjs` expone el producto a agentes (Claude Code, OpenCode, Cursor…)
por JSON-RPC NDJSON, sin dependencias. Cubre marca, plantillas, movimiento
y planificación de render; el puente en vivo con el Studio abierto y el
transporte HTTP llegan después.

```bash
node wissmotion/server/mcp.mjs   # los agentes lo lanzan como `npx wissmotion mcp`
```

| Herramienta                               | Qué hace                                                  |
| ----------------------------------------- | --------------------------------------------------------- |
| `brand_validate`                          | Valida una marca inline contra el esquema v1              |
| `brand_extract`                           | Marca desde URL (sin IA)                                  |
| `brand_list` / `brand_save` / `brand_get` | Biblioteca (`--dir` o `WISSMOTION_BRANDS_DIR`)            |
| `template_list`                           | 12 plantillas con sus variables                           |
| `template_instantiate`                    | Proyecto desde plantilla + marca (nombre u objeto) + vars |
| `motion_list`                             | Personalidades, 24 presets y 4 transiciones               |
| `render_plan`                             | Lote por destino con chequeo de aspecto (no renderiza)    |

`server.test.mjs` levanta el servidor por stdio y prueba handshake,
las 9 herramientas y el error de herramienta desconocida.

`agents-setup.mjs` (Fase 8.3): detecta agentes instalados y emite/escribe su
config MCP (`--list`, `--write opencode|cursor|…`). Cubre Claude Code,
Claude Desktop, OpenCode, Cursor, VS Code, Gemini CLI, Codex y Antigravity.
