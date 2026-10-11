import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { brandToVariables, instantiate, parseDeclaredVariables } from "./instantiate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "..", "..", "packages", "cli", "dist", "cli.js");
const IDS = [
  "promo-app",
  "promo-web",
  "logo-sting",
  "feature-highlight",
  "stats",
  "testimonios",
  "oferta",
  "precios",
  "evento",
  "lanzamiento",
  "antes-despues",
  "historia",
];

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

function bindings(html) {
  const ids = [];
  for (const m of html.matchAll(/data-var-(?:text|src)="([^"]+)"/g)) ids.push(m[1]);
  return ids;
}

const exampleBrand = JSON.parse(
  await readFile(join(here, "..", "brand-kit", "brand.example.json"), "utf8"),
);

let tmp;
before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "wissmotion-templates-"));
});
after(async () => rm(tmp, { recursive: true, force: true }));

describe("templates", () => {
  it("las 3 plantillas declaran variables válidas y bindeadas", async () => {
    for (const id of IDS) {
      const html = await readFile(join(here, id, "index.html"), "utf8");
      const manifest = JSON.parse(await readFile(join(here, id, "template.json"), "utf8"));
      assert.equal(manifest.id, id);
      assert.ok(manifest.duration > 0);
      const declared = parseDeclaredVariables(html);
      assert.ok(declared.length >= 5, `${id}: variables`);
      const ids = new Set(declared.map((v) => v.id));
      for (const b of bindings(html)) assert.ok(ids.has(b), `${id}: binding ${b} declarado`);
      assert.ok(
        !html.includes("Date.now()") && !html.includes("Math.random()"),
        `${id}: determinista`,
      );
    }
  });

  it("brandToVariables mapea colores, fuentes, logo y textos", () => {
    const vars = brandToVariables(exampleBrand);
    assert.equal(vars.brandPrimary, "#6d28d9");
    assert.equal(vars.brandText, "#1c1917");
    assert.equal(vars.brandHeading, "Sora");
    assert.equal(vars.brandLogo, "assets/logo.svg");
    assert.equal(vars.brandName, "Estudio Demo");
  });

  it("instantiate fusiona marca + contenido y escribe el proyecto", async () => {
    const out = join(tmp, "mi-promo");
    const { manifest, variables } = await instantiate({
      templateId: "promo-app",
      brand: exampleBrand,
      contentVars: { ctaLabel: "Instalar ya", feature1: "Veloz" },
      outDir: out,
    });
    assert.equal(manifest.id, "promo-app");
    assert.equal(variables.brandPrimary, "#6d28d9");
    assert.equal(variables.ctaLabel, "Instalar ya");
    assert.equal(variables.feature1, "Veloz");
    const written = JSON.parse(await readFile(join(out, "variables.json"), "utf8"));
    assert.deepEqual(written, variables);
    await readFile(join(out, "index.html"), "utf8");
    await readFile(join(out, "brand.json"), "utf8");
    await readFile(join(out, "README.md"), "utf8");
  });

  it("instantiate rechaza marca inválida y variables desconocidas", async () => {
    await assert.rejects(
      instantiate({
        templateId: "promo-app",
        brand: { nope: true },
        contentVars: {},
        outDir: join(tmp, "a"),
      }),
      /brand.json inválido/,
    );
    await assert.rejects(
      instantiate({
        templateId: "promo-app",
        brand: exampleBrand,
        contentVars: { noExiste: 1 },
        outDir: join(tmp, "b"),
      }),
      /no declaradas/,
    );
  });

  it("hyperframes lint pasa en las 3 plantillas", { timeout: 300_000 }, async () => {
    for (const id of IDS) {
      const report = await lintDir(join(here, id));
      assert.equal(report.ok, true, `${id}: ok`);
      assert.equal(report.errorCount, 0, `${id}: sin errores`);
    }
  });

  it(
    "la plantilla instanciada pasa lint con variables aplicadas",
    { timeout: 300_000 },
    async () => {
      const out = join(tmp, "lint-promo");
      await instantiate({
        templateId: "logo-sting",
        brand: exampleBrand,
        contentVars: {},
        outDir: out,
      });
      const report = await lintDir(out);
      assert.equal(report.ok, true);
      assert.equal(report.errorCount, 0);
    },
  );
});
