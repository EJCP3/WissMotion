import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "..", "..", "packages", "cli", "dist", "cli.js");
const css = readFileSync(join(here, "mockups.css"), "utf8");
const readme = readFileSync(join(here, "README.md"), "utf8");
const devices = [...css.matchAll(/^\.(wm-[a-z]+) \{/gm)]
  .map((m) => m[1])
  .filter((c) => !["wm-device", "wm-screen"].includes(c));

describe("mockups", () => {
  it("los cinco dispositivos del CSS están documentados en el README y en el ejemplo", () => {
    assert.deepEqual(devices.sort(), [
      "wm-browser",
      "wm-laptop",
      "wm-phone",
      "wm-tablet",
      "wm-watch",
    ]);
    const html = readFileSync(join(here, "index.html"), "utf8");
    for (const d of devices) {
      assert.ok(readme.includes(`\`${d}\``), `${d}: README`);
      assert.ok(html.includes(d), `${d}: ejemplo`);
    }
    assert.ok(statSync(join(here, "preview.png")).size > 1000, "preview.png");
  });

  it("el ejemplo pasa hyperframes lint", { timeout: 120_000 }, async () => {
    const stdout = await new Promise((resolve, reject) =>
      execFile(process.execPath, [cli, "lint", here, "--json"], (error, out) =>
        error && !out ? reject(error) : resolve(out),
      ),
    );
    const report = JSON.parse(stdout.slice(stdout.indexOf("{")));
    assert.equal(report.errorCount, 0);
  });
});
