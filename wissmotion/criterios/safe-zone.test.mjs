import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatOf, marginStrips, zoneIssues } from "./safe-zone.mjs";

describe("safe-zone", () => {
  it("formatOf elige el formato por proporción", () => {
    assert.equal(formatOf(1080, 1920), "9:16");
    assert.equal(formatOf(720, 1280), "9:16");
    assert.equal(formatOf(1080, 1350), "4:5");
    assert.equal(formatOf(1080, 1080), "1:1");
    assert.equal(formatOf(1920, 1080), "16:9");
  });

  it("marginStrips: márgenes de la tabla, y los de Meta con --meta", () => {
    const [top, bottom, left, right] = marginStrips("9:16");
    assert.equal(top.y1, 150 / 1920);
    assert.equal(bottom.y0, 1 - 340 / 1920);
    assert.equal(left.x1, 108 / 1080);
    assert.equal(right.x0, 1 - 108 / 1080);
    const meta = marginStrips("9:16", { meta: true });
    assert.equal(meta[0].y1, 0.14);
    assert.equal(meta[1].y0, 1 - 0.35);
    assert.throws(() => marginStrips("3:2"), /desconocido/);
  });

  it("zoneIssues encuentra los choques a cualquier profundidad", () => {
    const report = {
      ok: false,
      layout: {
        issues: [{ code: "caption_zone_collision", time: 2, text: "Hola" }, { code: "overflow" }],
      },
    };
    assert.deepEqual(
      zoneIssues(report).map((i) => i.text),
      ["Hola"],
    );
  });
});
