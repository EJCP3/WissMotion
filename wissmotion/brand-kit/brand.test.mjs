import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { forbiddenPairs, validateBrand } from "./validate-brand.mjs";
import { brandToCss } from "./brand-tokens.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const example = JSON.parse(await readFile(join(here, "brand.example.json"), "utf8"));

describe("brand.schema.json (v1)", () => {
  it("acepta el ejemplo", async () => {
    const { valid, errors } = await validateBrand(example);
    assert.equal(errors.length, 0);
    assert.equal(valid, true);
  });

  it("rechaza sin los obligatorios", async () => {
    const missingAll = structuredClone(example);
    delete missingAll.name;
    delete missingAll.colors;
    delete missingAll.fonts;
    assert.equal((await validateBrand(missingAll)).valid, false);

    const missingColors = structuredClone(example);
    delete missingColors.colors;
    assert.equal((await validateBrand(missingColors)).valid, false);

    const missingFonts = structuredClone(example);
    delete missingFonts.fonts;
    assert.equal((await validateBrand(missingFonts)).valid, false);
  });

  it("rechaza color no hexadecimal y versión distinta de 1", async () => {
    const badColor = structuredClone(example);
    badColor.colors.primary = "morado";
    assert.equal((await validateBrand(badColor)).valid, false);

    const badVersion = structuredClone(example);
    badVersion.brandVersion = 2;
    assert.equal((await validateBrand(badVersion)).valid, false);
  });

  it("rechaza personalidad de movimiento y pesos fuera del contrato", async () => {
    const badMotion = structuredClone(example);
    badMotion.motionPersonality = "épico";
    assert.equal((await validateBrand(badMotion)).valid, false);

    const badWeight = structuredClone(example);
    badWeight.fonts.weights = [450];
    assert.equal((await validateBrand(badWeight)).valid, false);
  });

  it("rechaza propiedades desconocidas (cazan typos)", async () => {
    const typo = structuredClone(example);
    typo.colours = typo.colors;
    assert.equal((await validateBrand(typo)).valid, false);
  });
});

describe("brand-tokens.mjs", () => {
  it("emite los tokens --brand-* del ejemplo", () => {
    const css = brandToCss(example);
    for (const [token, value] of [
      ["--brand-primary", "#6d28d9"],
      ["--brand-accent", "#f59e0b"],
      ["--brand-background", "#faf9f7"],
      ["--brand-text", "#1c1917"],
      ["--brand-font-heading", '"Sora"'],
      ["--brand-font-body", '"Inter"'],
    ]) {
      assert.ok(css.includes(`${token}: ${value}`), `falta ${token}`);
    }
  });
});

describe("forbiddenPairs", () => {
  it("marca los pares con contraste < 3:1 y deja pasar los legibles", () => {
    const colors = {
      primary: "#000000",
      secondary: "#ffffff",
      accent: "#ffd60a",
      background: "#ffffff",
      surface: "#0b0b0c",
      text: "#000000",
    };
    const pairs = forbiddenPairs({ colors }).map((p) => `${p.a}/${p.b}`);
    assert.ok(pairs.includes("secondary/accent"), "amarillo sobre blanco");
    assert.ok(pairs.includes("primary/text"), "mismo color");
    assert.ok(!pairs.includes("primary/secondary"), "negro/blanco es legible");
  });
});
