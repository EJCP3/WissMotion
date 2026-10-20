// Puerta de calidad de las plantillas: `hyperframes lint` en 0 errores para
// todas, en su formato base y re-escaladas (retime.mjs). Necesita el CLI
// construido (bun run build); sin él se salta en vez de fallar.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { retimeHtml } from "./retime.mjs";

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, "..", "..", "packages", "cli", "dist", "cli.js");

const ids = (await readdir(here, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && existsSync(join(here, d.name, "template.json")))
  .map((d) => d.name)
  .sort();

async function lint(dir) {
  // lint sale con código ≠ 0 si hay errores; el JSON viene igual en stdout.
  const { stdout } = await run(process.execPath, [CLI, "lint", dir, "--json"], {
    maxBuffer: 16 * 1024 * 1024,
  }).catch((e) => e);
  return JSON.parse(stdout.slice(stdout.indexOf("{")));
}

function errorsOf(report) {
  return report.findings
    .filter((f) => f.severity === "error")
    .map((f) => `${f.code}: ${f.message}`)
    .join("\n");
}

const skip = !existsSync(CLI) && "CLI sin construir";

describe("hyperframes lint de las plantillas", { skip }, () => {
  it("hay 17 plantillas", () => assert.equal(ids.length, 17));

  for (const id of ids) {
    it(`${id}: 0 errores`, async () => {
      const report = await lint(join(here, id));
      assert.equal(report.errorCount, 0, errorsOf(report));
    });

    it(`${id}: 0 errores re-escalada a 30 s`, async () => {
      const dir = await mkdtemp(join(tmpdir(), `wm-lint-${id}-`));
      try {
        const { duration } = JSON.parse(await readFile(join(here, id, "template.json"), "utf8"));
        const html = await readFile(join(here, id, "index.html"), "utf8");
        await writeFile(join(dir, "index.html"), retimeHtml(html, { from: duration, to: 30 }));
        const report = await lint(dir);
        assert.equal(report.errorCount, 0, errorsOf(report));
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  }
});
