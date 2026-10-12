import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const motion = join(here, "..", "presets", "motion");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const { references } = readJson(join(here, "references.json"));
const known = {
  presets: new Set(Object.keys(readJson(join(motion, "presets.json")).presets)),
  transitions: new Set(Object.keys(readJson(join(motion, "transitions.json")).transitions)),
  mockups: new Set(
    [
      ...readFileSync(join(here, "..", "mockups", "mockups.css"), "utf8").matchAll(
        /^\.(wm-[a-z]+) \{/gm,
      ),
    ].map((m) => m[1]),
  ),
  templates: new Set(
    readdirSync(join(here, "..", "templates"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  ),
};

describe("references.json", () => {
  it("ids únicos y contrato completo", () => {
    const ids = references.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, "ids repetidos");
    for (const r of references) {
      assert.match(r.id, /^[a-z0-9-]+$/, `${r.id}: id`);
      assert.ok(r.title && r.description, `${r.id}: title/description`);
      assert.ok(
        r.files.length > 0 && r.files.every((f) => f.startsWith("examples/")),
        `${r.id}: files`,
      );
      assert.ok(r.aspect.length > 0, `${r.id}: aspect`);
      assert.ok(r.duration > 0, `${r.id}: duration`);
      assert.ok(r.techniques.length > 0, `${r.id}: techniques`);
      assert.ok(["lista", "parcial", "falta"].includes(r.status), `${r.id}: status`);
      // "lista" = todo se recrea con lo que hay; si no, se dice qué falta.
      assert.equal(r.status === "lista", r.missing.length === 0, `${r.id}: status vs missing`);
    }
  });

  it("recreate apunta a plantillas, presets y transiciones que existen", () => {
    for (const r of references) {
      for (const [kind, ids] of Object.entries(r.recreate)) {
        for (const id of ids) assert.ok(known[kind].has(id), `${r.id}: ${kind} ${id} no existe`);
      }
    }
  });

  it("cada referencia tiene su hoja de fotogramas", () => {
    for (const r of references) {
      assert.ok(statSync(join(here, "sheets", `${r.id}.jpg`)).size > 1000, `${r.id}: hoja`);
    }
  });
});
