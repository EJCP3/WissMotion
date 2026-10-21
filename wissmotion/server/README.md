# Servidor MCP de WissMotion (Fase 8.1, stdio)

`mcp.mjs` expone el producto a agentes (Claude Code, OpenCode, Cursor…)
por JSON-RPC NDJSON, sin dependencias. Cubre marca, plantillas, movimiento,
proyectos en disco, visión (fotogramas como imágenes), render y el **puente en
vivo con el Studio abierto**. El transporte HTTP llega después.

```bash
node wissmotion/server/mcp.mjs   # los agentes lo lanzan como `npx wissmotion mcp`
```

| Herramienta                               | Qué hace                                                           |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `brand_validate`                          | Valida una marca inline contra el esquema v1                       |
| `brand_extract`                           | Marca desde URL (sin IA)                                           |
| `brand_extract_images`                    | Marca desde capturas + candidatos a color de marca (`primary`)     |
| `brand_list` / `brand_save` / `brand_get` | Biblioteca (`--dir` o `WISSMOTION_BRANDS_DIR`)                     |
| `template_list`                           | 18 plantillas con sus variables                                    |
| `template_instantiate`                    | Proyecto desde plantilla + marca + vars (`format` opcional)        |
| `motion_list`                             | Personalidades, 40 presets y 4 transiciones                        |
| `render_plan`                             | Lote por destino con chequeo de aspecto y formatos (no renderiza)  |
| `film_build`                              | Película de varias escenas desde un storyboard (`dryRun` opcional) |
| `film_review`                             | `hyperframes check` por escena + hoja de fotogramas de la película |
| `project_info`                            | Tamaño, duración, composiciones, variables, `brand.json`           |
| `project_set_variables`                   | Hornea valores en los HTML y fusiona `variables.json`              |
| `brand_apply`                             | Marca (objeto o biblioteca) a un proyecto existente + `brand.json` |
| `lint_check`                              | `hyperframes lint --json` del proyecto                             |
| `frame_snapshot`                          | Fotogramas devueltos como imágenes (`at` en segundos)              |
| `render_batch`                            | Render por destinos (`dryRun` para ver el plan)                    |
| `voiceover_generate`                      | Voz en off local por segmento (Kokoro vía `hyperframes tts`)       |
| `audio_list` / `audio_import`             | Biblioteca de audio: SFX y pads sintéticos + música con licencia   |
| `studio_status`                           | ¿Studio abierto? + sus herramientas en vivo (`studio_*`)           |
| `studio_call`                             | Ejecuta una herramienta del Studio abierto (se ve en vivo, undo)   |

## Permisos

Cada herramienta tiene nivel **lectura**, **escritura** o **render**
(`toolAccess` en `mcp.mjs`; `tools/list` lo anota con `readOnlyHint`).

- `WISSMOTION_MCP_ACCESS=read` → solo consulta (marca, plantillas, info, lint, fotogramas).
- `WISSMOTION_MCP_ACCESS=write` → además crea y edita proyectos, sin render.
- Sin variable (o `all`) → todo.

Lo que pasa del tope no se lista ni se ejecuta. Las de render
(`render_batch`, `film_build`, `voiceover_generate`) piden `confirm: true`
salvo con `dryRun`: el agente tiene que preguntarte antes de gastar minutos de CPU.

```json
{
  "mcpServers": {
    "wissmotion": {
      "command": "node",
      "args": ["…/mcp.mjs"],
      "env": { "WISSMOTION_MCP_ACCESS": "write" }
    }
  }
}
```

## Puente en vivo con el Studio

El servidor del Studio expone `/api/agent-bridge/*` (`packages/studio-server/src/routes/agentBridge.ts`):
el MCP deja la llamada, la pestaña del Studio la recoge por long-poll
(`packages/studio/src/webmcp/agentBridgeClient.ts`) y la ejecuta con sus
herramientas WebMCP reales (`studio_look`, `studio_select`, `studio_set_text`,
`studio_add_animation`…), así que cada edición se ve en vivo y entra al
historial. Sin extensión de navegador. URL del Studio: `WISSMOTION_STUDIO_URL`
(por defecto `http://127.0.0.1:5190`). Con el Studio cerrado, las herramientas
de archivos (`project_*`, `brand_apply`…) siguen funcionando.

En el Studio, panel **Asistente → Conectar agente**: comandos listos para
copiar por agente y estado del puente y del último agente activo.

**Recursos** (`resources/read`): `wissmotion://templates`, `://motion`,
`://brands`, `://brand-schema`, `://guide` (AGENTS.md).
**Prompts** (`prompts/get`): `crear-promo-app`, `crear-promo-web`,
`adaptar-formato` — arman el flujo con las herramientas y cierran con lint +
revisión de fotogramas. La lógica de proyecto vive en `project-ops.mjs`; los
recursos y prompts en `mcp-context.mjs`.

`server.test.mjs` levanta el servidor por stdio y prueba handshake,
las 23 herramientas, recursos, prompts y el error de herramienta desconocida.

## Plugin de Claude Code

`wissmotion/` es un plugin (`.claude-plugin/plugin.json` + `.mcp.json` +
`skills/`): instala las 4 skills y el MCP de una vez.

```bash
claude plugin marketplace add ./wissmotion
claude plugin install wissmotion@wissmotion
```

`agents-setup.mjs` (Fase 8.3): detecta agentes instalados y emite/escribe su
config MCP (`--list`, `--write opencode|cursor|…`). Cubre Claude Code,
Claude Desktop, OpenCode, Cursor, VS Code, Gemini CLI, Codex y Antigravity.
