import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "..", "..", "..", "packages", "cli", "dist", "cli.js");

const GSAP_EASES = new Set([
  "none",
  "power1.in",
  "power1.out",
  "power1.inOut",
  "power2.in",
  "power2.out",
  "power2.inOut",
  "power3.in",
  "power3.out",
  "power3.inOut",
  "power4.in",
  "power4.out",
  "power4.inOut",
  "back.in",
  "back.out",
  "back.inOut",
  "elastic.in",
  "elastic.out",
  "elastic.inOut",
  "bounce.in",
  "bounce.out",
  "bounce.inOut",
  "expo.in",
  "expo.out",
  "expo.inOut",
  "sine.in",
  "sine.out",
  "sine.inOut",
  "circ.in",
  "circ.out",
  "circ.inOut",
]);

function baseEase(ease) {
  return ease.replace(/\(.*\)$/, "");
}

const personalities = JSON.parse(await readFile(join(here, "personalities.json"), "utf8"));
const presets = JSON.parse(await readFile(join(here, "presets.json"), "utf8"));
const transitions = JSON.parse(await readFile(join(here, "transitions.json"), "utf8"));

function lintDir(dir) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [cli, "lint", dir, "--json"],
      { timeout: 120_000 },
      (error, stdout) => {
        if (error && !stdout) return reject(error);
        try {
          resolve(JSON.parse(stdout.slice(stdout.indexOf("{"))));
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

describe("motion/personalities.json", () => {
  it("cumple su esquema y cubre las 6 personalidades", async () => {
    const schema = JSON.parse(await readFile(join(here, "personalities.schema.json"), "utf8"));
    const ajv = new Ajv({ allErrors: true, strict: true });
    assert.equal(ajv.compile(schema)(personalities), true);
    assert.deepEqual(Object.keys(personalities.personalities).sort(), [
      "corporativo",
      "enérgico",
      "juguetón",
      "premium",
      "suave",
      "tech",
    ]);
    for (const p of Object.values(personalities.personalities)) {
      assert.ok(GSAP_EASES.has(baseEase(p.ease)), `ease desconocido: ${p.ease}`);
    }
  });
});

describe("motion/presets.json", () => {
  it("24 presets con contrato válido y easings conocidos", () => {
    const ids = Object.keys(presets.presets);
    assert.equal(ids.length, 24);
    for (const [id, p] of Object.entries(presets.presets)) {
      assert.ok(["entrada", "salida", "énfasis", "escena"].includes(p.kind), `${id}: kind`);
      assert.ok(
        typeof p.description === "string" && p.description.length > 0,
        `${id}: description`,
      );
      assert.ok(GSAP_EASES.has(baseEase(p.ease)), `${id}: ease ${p.ease}`);
      assert.ok(p.duration > 0, `${id}: duration`);
      assert.ok(p.gsap && (p.gsap.from || p.gsap.to), `${id}: gsap.from/to`);
    }
  });
});

describe("motion/transitions.json", () => {
  it("4 transiciones con contrato válido", () => {
    const ids = Object.keys(transitions.transitions);
    assert.equal(ids.length, 4);
    for (const [id, t] of Object.entries(transitions.transitions)) {
      assert.equal(t.kind, "transición", `${id}: kind`);
      assert.ok(
        typeof t.description === "string" && t.description.length > 0,
        `${id}: description`,
      );
      assert.ok(GSAP_EASES.has(baseEase(t.ease)), `${id}: ease ${t.ease}`);
      assert.ok(
        t.duration > 0 && t.overlap > 0 && t.overlap <= t.duration + 1,
        `${id}: duration/overlap`,
      );
      assert.ok(t.gsap && t.gsap.in && t.gsap.out, `${id}: gsap.in/out`);
    }
  });
});

describe("motion/examples", () => {
  it("cada preset y transición tiene ejemplo y viceversa", async () => {
    const dirs = (await readdir(join(here, "examples"), { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    assert.deepEqual(
      dirs,
      [...Object.keys(presets.presets), ...Object.keys(transitions.transitions)].sort(),
    );
  });

  it("los ejemplos son deterministas (sin reloj ni azar)", async () => {
    const dirs = await readdir(join(here, "examples"));
    for (const d of dirs) {
      const html = await readFile(join(here, "examples", d, "index.html"), "utf8");
      assert.ok(/class="[^"]*\bclip\b/.test(html), `${d}: clips`);
      assert.ok(html.includes("window.__timelines"), `${d}: root timeline`);
      assert.ok(html.includes("paused: true") || html.includes("paused:true"), `${d}: pausada`);
      assert.ok(!html.includes("Date.now()"), `${d}: sin Date.now`);
      assert.ok(!html.includes("Math.random()"), `${d}: sin Math.random`);
    }
  });

  it("hyperframes lint pasa en todos los ejemplos", { timeout: 300_000 }, async () => {
    const dirs = await readdir(join(here, "examples"));
    for (const d of dirs.sort()) {
      const report = await lintDir(join(here, "examples", d));
      assert.equal(report.ok, true, `${d}: ok`);
      assert.equal(report.errorCount, 0, `${d}: sin errores`);
    }
  });

  it("cada ejemplo tiene su póster en previews/", async () => {
    const ids = [...Object.keys(presets.presets), ...Object.keys(transitions.transitions)].sort();
    for (const id of ids) {
      const info = await stat(join(here, "previews", `${id}.png`));
      assert.ok(info.size > 1000, `${id}: póster no vacío`);
    }
  });
});
