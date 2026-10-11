// Conecta agentes externos al MCP de WissMotion (Fase 8.3):
//   node agents-setup.mjs --list [--server <ruta-mcp>]          detecta agentes y muestra snippets
//   node agents-setup.mjs --write opencode|cursor|gemini|claude-desktop [--server <ruta>]
/// Escribe el bloque wissmotion en el JSON del agente (con .bak) o indica el
// comando exacto cuando el agente no usa JSON. Nunca toca ramas ni el Studio.
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SERVER = join(here, "mcp.mjs");

function p(home, ...parts) {
  return join(home, ...parts);
}

// Rutas candidatas de config por agente (la primera que exista = detectado).
export function agentCatalog(home = homedir(), appData = process.env.APPDATA) {
  const win = process.platform === "win32";
  return [
    {
      id: "claude-code",
      name: "Claude Code",
      candidates: [p(home, ".claude.json")],
      kind: "command",
      command: (server) => `claude mcp add wissmotion -- node ${server}`,
    },
    {
      id: "claude-desktop",
      name: "Claude Desktop",
      candidates:
        win && appData
          ? [p(appData, "Claude", "claude_desktop_config.json")]
          : [p(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")],
      kind: "json",
      file: (homeDir, ad) =>
        win && ad
          ? p(ad, "Claude", "claude_desktop_config.json")
          : p(homeDir, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
      block: (server) => ({ mcpServers: { wissmotion: { command: "node", args: [server] } } }),
    },
    {
      id: "opencode",
      name: "OpenCode",
      candidates: [p(home, ".config", "opencode", "opencode.json")],
      kind: "json",
      file: (homeDir) => p(homeDir, ".config", "opencode", "opencode.json"),
      block: (server) => ({ mcp: { wissmotion: { type: "local", command: ["node", server] } } }),
    },
    {
      id: "cursor",
      name: "Cursor",
      candidates: [p(home, ".cursor", "mcp.json")],
      kind: "json",
      file: (homeDir) => p(homeDir, ".cursor", "mcp.json"),
      block: (server) => ({ mcpServers: { wissmotion: { command: "node", args: [server] } } }),
    },
    {
      id: "vscode",
      name: "VS Code",
      candidates: [p(home, ".vscode", "mcp.json")],
      kind: "json",
      file: (homeDir) => p(homeDir, ".vscode", "mcp.json"),
      block: (server) => ({ servers: { wissmotion: { command: "node", args: [server] } } }),
    },
    {
      id: "gemini",
      name: "Gemini CLI",
      candidates: [p(home, ".gemini", "settings.json")],
      kind: "json",
      file: (homeDir) => p(homeDir, ".gemini", "settings.json"),
      block: (server) => ({ mcpServers: { wissmotion: { command: "node", args: [server] } } }),
    },
    {
      id: "codex",
      name: "Codex CLI",
      candidates: [p(home, ".codex", "config.toml")],
      kind: "toml",
      command: (server) => `[mcp_servers.wissmotion]\ncommand = "node"\nargs = ["${server}"]`,
    },
    {
      id: "antigravity",
      name: "Antigravity",
      candidates: [],
      kind: "generic",
      command: (server) =>
        `mcpServers: { "wissmotion": { "command": "node", "args": ["${server}"] } } + reglas de wissmotion/AGENTS.md`,
    },
  ];
}

export function detectAgents(home = homedir(), appData = process.env.APPDATA) {
  return agentCatalog(home, appData).map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    found: a.candidates.some((c) => existsSync(c)),
    file: a.candidates.find((c) => existsSync(c)) ?? null,
  }));
}

export function snippetFor(
  agentId,
  server = DEFAULT_SERVER,
  home = homedir(),
  appData = process.env.APPDATA,
) {
  const a = agentCatalog(home, appData).find((x) => x.id === agentId);
  if (!a) throw new Error(`agente desconocido: ${agentId}`);
  if (a.kind === "command" || a.kind === "generic" || a.kind === "toml") {
    return { kind: a.kind, text: a.command(server), file: null };
  }
  return {
    kind: "json",
    text: JSON.stringify(a.block(server), null, 2),
    file: a.file(home, appData),
  };
}

function deepMerge(base, extra) {
  const out = { ...(base ?? {}) };
  for (const [k, v] of Object.entries(extra)) {
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object"
        ? deepMerge(out[k], v)
        : v;
  }
  return out;
}

/** Fusiona el bloque wissmotion en el JSON del agente (respalda .bak). */
export async function writeAgentConfig(
  agentId,
  server = DEFAULT_SERVER,
  home = homedir(),
  appData = process.env.APPDATA,
) {
  const a = agentCatalog(home, appData).find((x) => x.id === agentId);
  if (!a) throw new Error(`agente desconocido: ${agentId}`);
  if (a.kind !== "json" || !a.file)
    throw new Error(`${agentId} no usa JSON editable (copia el snippet)`);
  const file = a.file(home, appData);
  let current = {};
  if (existsSync(file)) {
    current = JSON.parse(await readFile(file, "utf8"));
    await copyFile(file, `${file}.bak`);
  }
  const merged = deepMerge(current, a.block(server));
  const { mkdir } = await import("node:fs/promises");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return { file, backup: existsSync(`${file}.bak`) };
}

function opt(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

// Solo actúa con --list/--write (importarlo desde tests no hace nada).
if (process.argv.includes("--list") || process.argv.includes("--write")) {
  const args = process.argv.slice(2);
  const server = resolve(opt(args, "--server") ?? DEFAULT_SERVER);
  try {
    if (process.argv.includes("--list")) {
      for (const a of detectAgents()) {
        const s = snippetFor(a.id, server);
        console.log(`\n## ${a.name} ${a.found ? `(detectado: ${a.file})` : "(no detectado)"}`);
        console.log(s.kind === "json" ? `  archivo: ${s.file}\n${s.text}` : `  ${s.text}`);
      }
    } else {
      const id = opt(args, "--write");
      const { file, backup } = await writeAgentConfig(id, server);
      console.log(`OK: ${file}${backup ? " (respaldo .bak)" : " (nuevo)"}`);
    }
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
