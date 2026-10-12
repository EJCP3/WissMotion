import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFilm, summarizeCheck, validateStoryboard, xfadeArgs } from "./film.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ejemplo = JSON.parse(await readFile(join(here, "ejemplo.json"), "utf8"));

describe("film", () => {
  it("valida el storyboard de ejemplo y rechaza lo inválido", () => {
    const ids = ["logo-sting", "promo-app", "stats", "oferta"];
    assert.deepEqual(validateStoryboard(ejemplo, ids), []);
    const bad = validateStoryboard(
      {
        name: "Mal Nombre",
        format: "21:9",
        scenes: [{ template: "nope", transition: { type: "spin", duration: 5 } }],
      },
      ids,
    );
    assert.equal(bad.length, 5);
  });

  it("xfadeArgs encadena desfases: cada transición resta su solape", () => {
    const { args, total } = xfadeArgs({
      clips: [
        { file: "a.mp4", duration: 6 },
        { file: "b.mp4", duration: 8 },
        { file: "c.mp4", duration: 6 },
      ],
      transitions: [
        { type: "fade", duration: 0.5 },
        { type: "slideleft", duration: 1 },
      ],
      out: "film.mp4",
    });
    const graph = args[args.indexOf("-filter_complex") + 1];
    assert.match(graph, /xfade=transition=fade:duration=0\.5:offset=5\.500\[x1\]/);
    // 5.5 + 8 = 13.5 acumulado; menos 1 s de solape → 12.5.
    assert.match(graph, /xfade=transition=slideleft:duration=1:offset=12\.500\[vout\]/);
    assert.equal(total, 18.5);
    assert.equal(args.at(-1), "film.mp4");
  });

  it("con música: recorta al total y hace fade de salida", () => {
    const { args } = xfadeArgs({
      clips: [{ file: "a.mp4", duration: 4 }],
      transitions: [],
      out: "f.mp4",
      music: "m.mp3",
    });
    const graph = args[args.indexOf("-filter_complex") + 1];
    assert.match(graph, /\[c0\]null\[vout\]/);
    assert.match(
      graph,
      /\[1:a\]atrim=0:4\.000,afade=t=in:d=0\.4,afade=t=out:st=2\.500:d=1\.5\[aout\]/,
    );
    assert.ok(args.includes("[aout]"));
  });

  it("dry-run instancia cada escena en el formato pedido", async () => {
    const out = await mkdtemp(join(tmpdir(), "wissmotion-film-"));
    const plan = await buildFilm({
      storyboard: ejemplo,
      baseDir: here,
      outDir: out,
      format: "9:16",
      dryRun: true,
    });
    assert.equal(plan.scenes.length, 4);
    assert.ok(plan.film.endsWith("acme-lanzamiento.9x16.mp4"));
    const html = await readFile(join(plan.scenes[1].dir, "index.html"), "utf8");
    assert.match(html, /data-format="9:16"/);
    assert.equal(plan.scenes[0].transition.type, "zoomin");
    assert.equal(plan.scenes[3].transition.type, "fade");
  });

  it("summarizeCheck quita el ruido estructural y conserva el resto", () => {
    const issues = summarizeCheck({
      lint: {
        findings: [
          { code: "nested_structure_needs_subcomposition", severity: "warning" },
          { code: "x", severity: "error", message: "m", fixHint: "h" },
        ],
      },
      contrast: { findings: [{ code: "low_contrast", severity: "warning", message: "c" }] },
    });
    assert.deepEqual(
      issues.map((i) => i.code),
      ["x", "low_contrast"],
    );
  });
});
