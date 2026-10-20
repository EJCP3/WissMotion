// Determinismo de las 17 plantillas y los 42 ejemplos de presets (A → B → A
// y una ejecución nueva dan el mismo PNG). Tarda ~10 min: solo corre con
// WISSMOTION_DETERMINISM=1 y el CLI construido.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLI, verifyDeterminism } from "./determinism.mjs";
import { previewIds, previewTime } from "../presets/motion/render-previews.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const examples = join(here, "..", "presets", "motion", "examples");

const templates = readdirSync(here, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(here, d.name, "template.json")))
  .map((d) => {
    const { duration } = JSON.parse(readFileSync(join(here, d.name, "template.json"), "utf8"));
    return { id: d.name, dir: join(here, d.name), at: duration * 0.4, other: duration * 0.8 };
  });

const presets = previewIds().map((id) => ({
  id,
  dir: join(examples, id),
  at: previewTime(id),
  other: previewTime(id) * 2 + 0.5,
}));

const skip =
  (!process.env.WISSMOTION_DETERMINISM && "WISSMOTION_DETERMINISM=1 para correrlo") ||
  (!existsSync(CLI) && "CLI sin construir");

for (const [name, items] of [
  ["plantillas", templates],
  ["presets", presets],
]) {
  describe(`determinismo de ${name}`, { skip }, () => {
    for (const item of items) {
      it(`${item.id} @${item.at.toFixed(2)}s`, () => {
        const res = verifyDeterminism(item.dir, { at: item.at, other: item.other });
        assert.ok(res.deterministic, JSON.stringify(res.hashes));
      });
    }
  });
}
