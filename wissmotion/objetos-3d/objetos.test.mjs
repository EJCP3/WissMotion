import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDeclaredVariables } from "../templates/instantiate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "..", "..", "packages", "cli", "dist", "cli.js");
const html = readFileSync(join(here, "index.html"), "utf8");

describe("objetos-3d", () => {
  it("declara los objetos y renderiza sin fondo (alfa)", () => {
    const objeto = parseDeclaredVariables(html).find((v) => v.id === "objeto");
    assert.deepEqual(objeto.options, ["moneda", "losas", "tarjeta", "modelo"]);
    const src = parseDeclaredVariables(html).find((v) => v.id === "modeloSrc").default;
    assert.ok(existsSync(join(here, src)), `modelo por defecto ${src}`);
    assert.match(html, /background: transparent/);
    assert.match(html, /alpha: true/);
    assert.match(html, /setClearColor\(0x000000, 0\)/);
    assert.ok(!html.includes("Math.random()") && !html.includes("Date.now()"));
  });

  it("hyperframes lint pasa", { timeout: 120_000 }, async () => {
    const stdout = await new Promise((resolve, reject) =>
      execFile(process.execPath, [cli, "lint", here, "--json"], (err, out) =>
        err && !out ? reject(err) : resolve(out),
      ),
    );
    const report = JSON.parse(stdout.slice(stdout.indexOf("{")));
    assert.equal(report.errorCount, 0);
  });
});
