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
    assert.equal(DEST_IDS.length, 9);
    for (const [id, d] of Object.entries(DESTINATIONS)) {
      assert.ok(["mp4", "webm", "gif"].includes(d.format), `${id}: format`);
      assert.ok([15, 24, 30, 60].includes(d.fps), `${id}: fps`);
      assert.ok(["16:9", "9:16"].includes(d.aspect), `${id}: aspect`);
    }
  });

  it("aspectOf reduce 1280x720 y 1080x1920", () => {
    assert.equal(aspectOf(1280, 720), "16:9");
    assert.equal(aspectOf(1080, 1920), "9:16");
    assert.equal(aspectOf(1080, 1080), "1:1");
  });

  it("planBatch filtra por aspecto 16:9 sin --force", () => {
    const plan = planBatch({ dest: "all", aspect: "16:9" });
    assert.equal(plan.length, 9);
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
      job: { format: "mp4", fps: 30, quality: "delivery", resolution: "landscape", workers: 2 },
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
      "--resolution",
      "landscape",
      "--variables-file",
      "/p/variables.json",
      "--workers",
      "2",
    ]);
  });

  it("runBatch dry-run genera plan y respeta aspecto", async () => {
    const template = fileURLToPath(new URL("../templates/logo-sting", import.meta.url));
    const manifest = await runBatch({
      projectDir: template,
      dest: "all",
      dryRun: true,
      outBase: await mkdtemp(joinTmp("wissmotion-batch-")),
    });
    assert.equal(manifest.aspect, "16:9");
    assert.equal(manifest.results.length, 9);
    assert.equal(manifest.results.filter((r) => r.ok).length, 6);
    assert.equal(manifest.results.filter((r) => r.skipped).length, 3);
    const yt = manifest.results.find((r) => r.dest === "youtube");
    assert.ok(yt.args.includes("--format") && yt.args.includes("mp4"));
  });
});
