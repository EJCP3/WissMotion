import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BrandLibraryError,
  deleteBrand,
  duplicateBrand,
  exportBrand,
  getBrand,
  importBrand,
  listBrands,
  resolveLibraryDir,
  saveBrand,
  slugify,
  tmpLibraryDir,
} from "./brand-library.mjs";
import { validateBrand } from "./validate-brand.mjs";

const GOOD = {
  brandVersion: 1,
  name: "Acme",
  colors: {
    primary: "#4f46e5",
    secondary: "#0ea5e9",
    accent: "#f59e0b",
    background: "#ffffff",
    surface: "#f5f5f4",
    text: "#1c1917",
  },
  fonts: { heading: "Sora", body: "Inter", weights: [400, 700] },
};

let dir;
before(async () => {
  dir = await mkdtemp(tmpLibraryDir());
});
after(async () => rm(dir, { recursive: true, force: true }));

describe("brand-library.mjs", () => {
  it("slugify normaliza acentos y rechaza vacíos", () => {
    assert.equal(slugify("Mi Marca Épica!"), "mi-marca-epica");
    assert.throws(() => slugify("!!!"), BrandLibraryError);
  });

  it("resolveLibraryDir respeta override y env", () => {
    assert.equal(resolveLibraryDir("/tmp/x"), "/tmp/x");
    process.env.WISSMOTION_BRANDS_DIR = "/tmp/env-brands";
    assert.equal(resolveLibraryDir(undefined), "/tmp/env-brands");
    delete process.env.WISSMOTION_BRANDS_DIR;
    assert.ok(resolveLibraryDir(undefined).endsWith(join(".wissmotion", "brands")));
  });

  it("listBrands vacío al inicio", async () => {
    assert.deepEqual(await listBrands(dir), []);
  });

  it("saveBrand guarda validando y getBrand lee", async () => {
    const { slug, file } = await saveBrand(dir, "Acme Corp", GOOD);
    assert.equal(slug, "acme-corp");
    assert.ok(file.endsWith("acme-corp.brand.json"));
    assert.equal((await getBrand(dir, "Acme Corp")).name, "Acme");
    const listed = await listBrands(dir);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].slug, "acme-corp");
    assert.equal(listed[0].brandVersion, 1);
  });

  it("saveBrand rechaza marcas inválidas sin escribir", async () => {
    await assert.rejects(saveBrand(dir, "Mala", { ...GOOD, name: "" }), BrandLibraryError);
    assert.equal((await listBrands(dir)).length, 1);
  });

  it("duplicateBrand copia con otro nombre", async () => {
    const { slug } = await duplicateBrand(dir, "Acme Corp", "Acme Copia");
    assert.equal(slug, "acme-copia");
    assert.equal((await getBrand(dir, "Acme Copia")).colors.primary, "#4f46e5");
    assert.equal((await listBrands(dir)).length, 2);
  });

  it("exportBrand e importBrand redondean el viaje", async () => {
    const dest = join(dir, "respaldo.json");
    await exportBrand(dir, "Acme Corp", dest);
    assert.equal(JSON.parse(await readFile(dest, "utf8")).name, "Acme");
    await deleteBrand(dir, "Acme Corp");
    assert.equal((await listBrands(dir)).length, 1);
    const { slug } = await importBrand(dir, dest);
    assert.equal(slug, "acme");
    const { valid } = await validateBrand(await getBrand(dir, "acme"));
    assert.equal(valid, true);
  });

  it("importBrand rechaza archivos inválidos y getBrand lo inexistente", async () => {
    const bad = join(dir, "malo.json");
    await writeFile(bad, "{no-json", "utf8");
    await assert.rejects(importBrand(dir, bad, "Malo"), BrandLibraryError);
    await assert.rejects(getBrand(dir, "No Existe"), BrandLibraryError);
    await assert.rejects(deleteBrand(dir, "No Existe"), BrandLibraryError);
  });
});
