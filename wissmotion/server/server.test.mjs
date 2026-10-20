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
  it("tools/list expone 20 herramientas", async () => {
    const { tools } = await send("tools/list", {});
    assert.equal(tools.length, 20);
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

  it("resources/list y resources/read dan contexto legible", async () => {
    const { resources } = await send("resources/list", {});
    assert.ok(resources.some((r) => r.uri === "wissmotion://templates"));
    const { contents } = await send("resources/read", { uri: "wissmotion://brand-schema" });
    assert.ok(JSON.parse(contents[0].text).properties.colors);
  });

  it("prompts/get arma el flujo con las herramientas", async () => {
    const { prompts } = await send("prompts/list", {});
    assert.equal(prompts.length, 3);
    const { messages } = await send("prompts/get", {
      name: "adaptar-formato",
      arguments: { project: "./p", format: "9:16" },
    });
    assert.match(messages[0].content.text, /project_info/);
  });

  it("brand_apply, project_set_variables y project_info sobre un proyecto", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wissmotion-mcp-"));
    const out = join(dir, "promo");
    const brand = (primary) => ({
      brandVersion: 1,
      name: "X",
      colors: {
        primary,
        secondary: "#111111",
        accent: "#222222",
        background: "#ffffff",
        surface: "#eeeeee",
        text: "#000000",
      },
      fonts: { heading: "Poppins", body: "Inter" },
    });
    const call = async (name, args) =>
      JSON.parse(textOf(await send("tools/call", { name, arguments: args })));
    try {
      await call("template_instantiate", {
        template: "logo-sting",
        brand: brand("#000000"),
        vars: {},
        out,
      });
      const applied = await call("brand_apply", { project: out, brand: brand("#ff0000") });
      assert.ok(applied.applied.includes("brandPrimary"));
      const fs = await import("node:fs/promises");
      const html = await fs.readFile(join(out, "index.html"), "utf8");
      assert.match(html, /"default":"#ff0000"/);
      assert.match(html, /family=Poppins/);
      await call("project_set_variables", { project: out, values: { brandName: "Nueva" } });
      const info = await call("project_info", { project: out });
      assert.equal(info.brand.colors.primary, "#ff0000");
      assert.equal(info.values.brandName, "Nueva");
      assert.ok(info.variables.some((v) => v.id === "brandName" && v.default === "Nueva"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("render real sin confirm se frena y pide confirmación", async () => {
    const res = await send("tools/call", {
      name: "render_batch",
      arguments: { project: join(here, "..", "templates", "historia") },
    });
    assert.equal(res.isError, true);
    assert.match(textOf(res), /confirm: true/);
  });

  it("tools/list anota lectura y añade confirm a las de render", async () => {
    const { tools } = await send("tools/list", {});
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    assert.equal(byName.project_info.annotations.readOnlyHint, true);
    assert.equal(byName.brand_apply.annotations.readOnlyHint, false);
    assert.ok(byName.render_batch.inputSchema.properties.confirm);
  });

  it("WISSMOTION_MCP_ACCESS=read oculta y rechaza lo que escribe", async () => {
    const { spawnSync } = await import("node:child_process");
    const input = [
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "brand_apply", arguments: { project: ".", brand: {} } },
      },
    ]
      .map((m) => JSON.stringify(m))
      .join("\n");
    const r = spawnSync(process.execPath, [server], {
      input: `${input}\n`,
      encoding: "utf8",
      env: { ...process.env, WISSMOTION_MCP_ACCESS: "read" },
    });
    const [list, call] = r.stdout
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    const names = list.result.tools.map((t) => t.name);
    assert.ok(names.includes("project_info"));
    assert.ok(!names.includes("brand_apply"));
    assert.ok(!names.includes("render_batch"));
    assert.match(call.result.content[0].text, /permiso denegado/);
  });

  it("herramienta desconocida da error", async () => {
    await assert.rejects(send("tools/call", { name: "nope", arguments: {} }), /desconocida/);
  });
});
