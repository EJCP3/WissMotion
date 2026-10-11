import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exportProject, importPackage, PackageError } from "./package.mjs";
import { instantiate } from "../templates/instantiate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const exampleBrand = JSON.parse(
  await readFile(join(here, "..", "brand-kit", "brand.example.json"), "utf8"),
);

let tmp;
let project;
before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "wissmotion-pack-"));
  project = join(tmp, "promo");
  await instantiate({
    templateId: "logo-sting",
    brand: exampleBrand,
    contentVars: {},
    outDir: project,
  });
});
after(async () => rm(tmp, { recursive: true, force: true }));

describe("package.mjs (.wissmotion)", () => {
  it("exporta e importa redondeando archivos y contenido", async () => {
    const zip = join(tmp, "promo.wissmotion");
    const exported = await exportProject(project, zip);
    assert.ok(exported.entries >= 4);
    const dest = join(tmp, "restaurado");
    const imported = await importPackage(zip, dest);
    assert.equal(imported.entries, exported.entries);
    for (const name of ["index.html", "variables.json", "brand.json", "wissmotion.json"]) {
      const a = await readFile(join(project, name), "utf8").catch(() => null);
      const b = await readFile(join(dest, name), "utf8");
      if (a !== null) assert.equal(b, a, name);
    }
    const manifest = JSON.parse(await readFile(join(dest, "wissmotion.json"), "utf8"));
    assert.equal(manifest.format, "wissmotion-package");
    assert.equal(manifest.version, 1);
  });

  it("exportar sin index.html o con marca inválida falla", async () => {
    const empty = join(tmp, "vacio");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(empty, { recursive: true });
    await assert.rejects(exportProject(empty, join(tmp, "v.wissmotion")), PackageError);
    await writeFile(join(empty, "index.html"), "<html></html>", "utf8");
    await writeFile(join(empty, "brand.json"), JSON.stringify({ nope: 1 }), "utf8");
    await assert.rejects(exportProject(empty, join(tmp, "v.wissmotion")), /inválido/);
  });

  it("importar rechaza zip ajeno, corrupto e inseguro", async () => {
    const notZip = join(tmp, "no.zip");
    await writeFile(notZip, "hola", "utf8");
    await assert.rejects(importPackage(notZip, join(tmp, "x")), PackageError);
    const { zipSync, strToU8 } = await import("fflate");
    const plain = join(tmp, "plain.zip");
    await writeFile(plain, zipSync({ "index.html": strToU8("<html></html>") }));
    await assert.rejects(importPackage(plain, join(tmp, "y")), /wissmotion\.json/);
  });
});
