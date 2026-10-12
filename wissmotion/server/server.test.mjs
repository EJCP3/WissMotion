import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const server = join(here, "mcp.mjs");

let child;
let nextId = 1;
const pending = new Map();
let buffer = "";

function send(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}

function route(line) {
  const msg = JSON.parse(line);
  const p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  if (msg.error) p.reject(new Error(msg.error.message));
  else p.resolve(msg.result);
}

before(async () => {
  child = spawn(process.execPath, [server], { stdio: ["pipe", "pipe", "inherit"] });
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) route(line);
  });
  const hello = await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  });
  assert.equal(hello.serverInfo.name, "wissmotion");
});

after(() => child.kill());

function textOf(result) {
  return result.content[0].text;
}

describe("mcp.mjs (stdio)", () => {
  it("tools/list expone 11 herramientas", async () => {
    const { tools } = await send("tools/list", {});
    assert.equal(tools.length, 11);
    assert.ok(tools.some((t) => t.name === "template_instantiate"));
  });

  it("brand_validate acepta y rechaza", async () => {
    const good = JSON.parse(
      await import("node:fs/promises").then((fs) =>
        fs.readFile(join(here, "..", "brand-kit", "brand.example.json"), "utf8"),
      ),
    );
    const ok = JSON.parse(
      textOf(await send("tools/call", { name: "brand_validate", arguments: { brand: good } })),
    );
    assert.equal(ok.valid, true);
    const bad = JSON.parse(
      textOf(
        await send("tools/call", { name: "brand_validate", arguments: { brand: { nope: 1 } } }),
      ),
    );
    assert.equal(bad.valid, false);
  });

  it("brand_save + brand_list + brand_get en biblioteca temporal", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wissmotion-mcp-"));
    const good = JSON.parse(
      await import("node:fs/promises").then((fs) =>
        fs.readFile(join(here, "..", "brand-kit", "brand.example.json"), "utf8"),
      ),
    );
    try {
      const saved = JSON.parse(
        textOf(
          await send("tools/call", {
            name: "brand_save",
            arguments: { name: "Demo", brand: good, dir },
          }),
        ),
      );
      assert.equal(saved.slug, "demo");
      const listed = JSON.parse(
        textOf(await send("tools/call", { name: "brand_list", arguments: { dir } })),
      );
      assert.equal(listed.length, 1);
      const got = JSON.parse(
        textOf(await send("tools/call", { name: "brand_get", arguments: { name: "Demo", dir } })),
      );
      assert.equal(got.name, "Estudio Demo");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("template_list trae 17 plantillas con variables", async () => {
    const list = JSON.parse(
      textOf(await send("tools/call", { name: "template_list", arguments: {} })),
    );
    assert.equal(list.length, 17);
    const app = list.find((t) => t.id === "promo-app");
    assert.ok(app.variables.some((v) => v.id === "brandPrimary" && v.type === "color"));
  });

  it("template_instantiate crea el proyecto", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wissmotion-mcp-"));
    const out = join(dir, "promo");
    try {
      const res = JSON.parse(
        textOf(
          await send("tools/call", {
            name: "template_instantiate",
            arguments: {
              template: "logo-sting",
              brand: {
                brandVersion: 1,
                name: "X",
                colors: {
                  primary: "#000000",
                  secondary: "#111111",
                  accent: "#222222",
                  background: "#ffffff",
                  surface: "#eeeeee",
                  text: "#000000",
                },
                fonts: { heading: "Inter", body: "Inter" },
              },
              vars: {},
              out,
            },
          }),
        ),
      );
      assert.equal(res.manifest.id, "logo-sting");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("motion_list trae personalidades, presets y transiciones", async () => {
    const m = JSON.parse(textOf(await send("tools/call", { name: "motion_list", arguments: {} })));
    assert.equal(Object.keys(m.personalities).length, 6);
    assert.equal(Object.keys(m.presets).length, 38);
    assert.equal(Object.keys(m.transitions).length, 4);
  });

  it("render_plan no renderiza pero filtra por aspecto", async () => {
    const plan = JSON.parse(
      textOf(
        await send("tools/call", {
          name: "render_plan",
          arguments: { project: join(here, "..", "templates", "historia") },
        }),
      ),
    );
    assert.equal(plan.aspect, "9:16");
    assert.ok(plan.plan.find((j) => j.dest === "reels" && j.compatible));
    assert.ok(plan.plan.find((j) => j.dest === "youtube" && !j.compatible));
  });

  it("herramienta desconocida da error", async () => {
    await assert.rejects(send("tools/call", { name: "nope", arguments: {} }), /desconocida/);
  });
});
