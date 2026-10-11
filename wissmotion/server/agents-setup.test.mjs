import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectAgents, snippetFor, writeAgentConfig } from "./agents-setup.mjs";

const SERVER = "/x/wissmotion/server/mcp.mjs";
let home;
before(async () => {
  home = await mkdtemp(join(tmpdir(), "wissmotion-agents-"));
});
after(async () => rm(home, { recursive: true, force: true }));

describe("agents-setup.mjs", () => {
  it("detecta 8 agentes con catálogo completo", async () => {
    const agents = detectAgents(home, null);
    assert.equal(agents.length, 8);
    for (const a of agents) assert.ok(a.id && a.name && a.kind);
  });

  it("snippets: comando claude, JSON opencode, TOML codex", async () => {
    const claude = snippetFor("claude-code", SERVER, home, null);
    assert.equal(claude.kind, "command");
    assert.ok(claude.text.includes("claude mcp add wissmotion"));
    assert.ok(claude.text.includes(SERVER));

    const open = JSON.parse(snippetFor("opencode", SERVER, home, null).text);
    assert.deepEqual(open.mcp.wissmotion.command, ["node", SERVER]);

    const codex = snippetFor("codex", SERVER, home, null);
    assert.equal(codex.kind, "toml");
    assert.ok(codex.text.includes("[mcp_servers.wissmotion]"));
  });

  it("agente desconocido y no-JSON fallan legible", async () => {
    assert.throws(() => snippetFor("clippy", SERVER, home, null), /desconocido/);
    await assert.rejects(writeAgentConfig("codex", SERVER, home, null), /no usa JSON/);
  });

  it("--write fusiona sin romper lo existente y respalda", async () => {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const file = join(home, ".cursor", "mcp.json");
    await mkdir(join(home, ".cursor"), { recursive: true });
    await writeFile(file, JSON.stringify({ mcpServers: { otro: { command: "x" } } }), "utf8");
    const { backup } = await writeAgentConfig("cursor", SERVER, home, null);
    assert.equal(backup, true);
    const merged = JSON.parse(await readFile(file, "utf8"));
    assert.ok(merged.mcpServers.otro);
    assert.deepEqual(merged.mcpServers.wissmotion.args, [SERVER]);
    const bak = JSON.parse(await readFile(`${file}.bak`, "utf8"));
    assert.ok(!bak.mcpServers.wissmotion);
  });

  it("detectar con config presente marca found", async () => {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(join(home, ".gemini"), { recursive: true });
    const file = join(home, ".gemini", "settings.json");
    await writeFile(file, "{}", "utf8");
    const gemini = detectAgents(home, null).find((a) => a.id === "gemini");
    assert.equal(gemini.found, true);
    assert.equal(gemini.file, file);
  });
});
