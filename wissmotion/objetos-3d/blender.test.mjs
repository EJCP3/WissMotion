import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareVersions, findBlender, runBlender } from "./blender.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const blender = findBlender();

describe("blender.mjs", () => {
  it("ordena versiones numéricamente (5.10 > 5.2 > 4.5)", () => {
    assert.ok(compareVersions([5, 10], [5, 2]) > 0);
    assert.ok(compareVersions([5, 2], [4, 5]) > 0);
    assert.equal(compareVersions([5, 2, 0], [5, 2]), 0);
  });

  it("BLENDER_PATH manda; si no existe, null y error claro", () => {
    assert.equal(findBlender({ BLENDER_PATH: "/no/existe/blender" }), null);
    assert.throws(() => runBlender({ script: "x.py", blender: null }), /BLENDER_PATH/);
  });

  it(
    "modela la pera de ejemplo y exporta GLB (Blender real)",
    { skip: !blender && "Blender no instalado", timeout: 180_000 },
    () => {
      const out = join(mkdtempSync(join(tmpdir(), "wm-blender-test-")), "pera.glb");
      runBlender({ script: join(here, "blender", "ejemplo_pera.py"), args: ["--out", out] });
      assert.ok(existsSync(out) && statSync(out).size > 10_000);
    },
  );
});
