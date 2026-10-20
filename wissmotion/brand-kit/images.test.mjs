import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  brandCandidates,
  brandFromImages,
  colorsFromCounts,
  countColors,
} from "./extract-from-images.mjs";
import { validateBrand } from "./validate-brand.mjs";

const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

/** Buffer RGB con n píxeles de cada color [[r,g,b], n]. */
function pixels(spec) {
  const out = [];
  for (const [[r, g, b], n] of spec) for (let i = 0; i < n; i += 1) out.push(r, g, b);
  return Buffer.from(out);
}

describe("extract-from-images.mjs", () => {
  const buf = pixels([
    [[240, 240, 240], 6000], // fondo
    [[255, 255, 255], 1500], // tarjetas
    [[16, 16, 32], 600], // texto
    [[32, 208, 112], 400], // verde
    [[240, 64, 64], 200], // rojo
  ]);

  it("fondo por área, texto por contraste y candidatos por tono", () => {
    const counts = countColors([buf]);
    const colors = colorsFromCounts(counts);
    assert.equal(colors.background, "#f0f0f0");
    assert.equal(colors.surface, "#ffffff");
    assert.equal(colors.text, "#101020");
    assert.equal(colors.primary, "#20d070");
    assert.equal(colors.secondary, "#f04040");
    assert.deepEqual(
      brandCandidates(counts, "#f0f0f0").map((c) => c.hex),
      ["#20d070", "#f04040"],
    );
  });

  it("primary forzado gana a la heurística", () => {
    const colors = colorsFromCounts(countColors([buf]), { primary: "#f04040" });
    assert.equal(colors.primary, "#f04040");
    assert.equal(colors.secondary, "#20d070");
  });

  it("de PNG real a brand.json válido", { skip: !hasFfmpeg && "sin ffmpeg" }, async () => {
    const dir = mkdtempSync(join(tmpdir(), "wm-img-"));
    try {
      const png = join(dir, "shot.png");
      spawnSync("ffmpeg", [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=0xf0f0f0:s=400x400,drawbox=x=40:y=40:w=200:h=120:color=0x2563eb:t=fill",
        "-frames:v",
        "1",
        png,
      ]);
      const { brand, candidates } = brandFromImages({ files: [png], name: "Demo" });
      assert.equal(brand.colors.background, "#f0f0f0");
      assert.ok(candidates.length >= 1);
      assert.equal((await validateBrand(brand)).valid, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
