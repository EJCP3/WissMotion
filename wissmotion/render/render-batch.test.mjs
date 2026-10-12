import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

function joinTmp(prefix) {
  return join(tmpdir(), prefix);
}
import {
  DEST_IDS,
  DESTINATIONS,
  aspectOf,
  planBatch,
  renderArgs,
  runBatch,
} from "./render-batch.mjs";

describe("render-batch.mjs (dry-run)", () => {
  it("9 destinos con formatos y fps válidos", () => {
    assert.equal(DEST_IDS.length, 11);
    for (const [id, d] of Object.entries(DESTINATIONS)) {
      assert.ok(["mp4", "webm", "gif"].includes(d.format), `${id}: format`);
      assert.ok([15, 24, 30, 60].includes(d.fps), `${id}: fps`);
      assert.ok(["16:9", "9:16", "1:1", "4:5"].includes(d.aspect), `${id}: aspect`);
    }
  });

  it("aspectOf reduce 1280x720 y 1080x1920", () => {
    assert.equal(aspectOf(1280, 720), "16:9");
    assert.equal(aspectOf(1080, 1920), "9:16");
    assert.equal(aspectOf(1080, 1080), "1:1");
  });

  it("planBatch filtra por aspecto 16:9 sin --force", () => {
    const plan = planBatch({ dest: "all", aspect: "16:9" });
    assert.equal(plan.length, 11);
    const ok = plan
      .filter((j) => j.compatible)
      .map((j) => j.dest)
      .sort();
    assert.deepEqual(ok, ["gif", "hero", "linkedin", "webm", "x", "youtube"]);
    assert.ok(plan.find((j) => j.dest === "reels" && !j.compatible));
  });

  it("planBatch rechaza destino desconocido y respeta quality", () => {
    assert.throws(() => planBatch({ dest: "cine", aspect: "16:9" }), /desconocido/);
    const [job] = planBatch({ dest: "youtube", aspect: "16:9", quality: "draft" });
    assert.equal(job.quality, "draft");
  });

  it("renderArgs arma el comando del CLI con variables y workers", () => {
    const args = renderArgs({
      projectDir: "/p",
      outFile: "/p/renders/a.youtube.mp4",
      job: { format: "mp4", fps: 30, quality: "delivery", workers: 2 },
      variablesFile: "/p/variables.json",
    });
    assert.deepEqual(args, [
      "render",
      "/p",
      "-o",
      "/p/renders/a.youtube.mp4",
      "--format",
      "mp4",
      "--fps",
      "30",
      "--quality",
      "delivery",
      "--variables-file",
      "/p/variables.json",
      "--workers",
      "2",
    ]);
  });

  it("renderArgs pasa --resolution solo si el destino la trae (9:16)", () => {
    const args = renderArgs({
      projectDir: "/p",
      outFile: "/p/renders/a.reels.mp4",
      job: { format: "mp4", fps: 30, quality: "delivery", resolution: "portrait", workers: 2 },
    });
    assert.ok(args.includes("--resolution") && args.includes("portrait"));
  });

  it("runBatch dry-run genera plan y respeta aspecto", async () => {
    // historia es solo 9:16 (sin layouts de otros formatos).
    const template = fileURLToPath(new URL("../templates/historia", import.meta.url));
    const manifest = await runBatch({
      projectDir: template,
      dest: "all",
      dryRun: true,
      outBase: await mkdtemp(joinTmp("wissmotion-batch-")),
    });
    assert.equal(manifest.aspect, "9:16");
    assert.equal(manifest.results.length, 11);
    assert.equal(manifest.results.filter((r) => r.ok).length, 3);
    assert.equal(manifest.results.filter((r) => r.skipped).length, 8);
    const reels = manifest.results.find((r) => r.dest === "reels");
    assert.ok(reels.args.includes("--format") && !reels.args.includes("--composition"));
  });

  it("runBatch multiformato: promo-app cubre los 11 destinos con su layout", async () => {
    const template = fileURLToPath(new URL("../templates/promo-app", import.meta.url));
    const manifest = await runBatch({
      projectDir: template,
      dest: "all",
      dryRun: true,
      outBase: await mkdtemp(joinTmp("wissmotion-batch-")),
    });
    assert.equal(manifest.results.filter((r) => r.ok).length, 11);
    const reels = manifest.results.find((r) => r.dest === "reels");
    assert.ok(reels.args.includes("--composition") && reels.args.includes(".format-9x16.html"));
    const yt = manifest.results.find((r) => r.dest === "youtube");
    assert.ok(!yt.args.includes("--composition"));
  });
});
