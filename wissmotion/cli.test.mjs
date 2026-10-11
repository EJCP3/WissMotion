import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCommand, usage } from "./cli.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function runCli(...args) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [join(here, "cli.mjs"), ...args],
      { timeout: 60_000 },
      (error, stdout, stderr) => {
        if (error && error.code !== 0 && !stdout) return reject(new Error(stderr || error.message));
        resolve({ code: error?.code ?? 0, stdout });
      },
    );
  });
}

describe("cli.mjs unificado", () => {
  it("usage lista los 12 comandos", () => {
    const help = usage();
    for (const name of [
      "mcp",
      "brand-validate",
      "brand-extract",
      "brands",
      "template",
      "templateize",
      "render",
      "voiceover",
      "captions",
      "beats",
      "package",
      "agents",
    ]) {
      assert.ok(help.includes(name), name);
    }
  });

  it("resolveCommand resuelve y rechaza desconocidos", () => {
    assert.ok(resolveCommand("render").endsWith(join("render", "render-batch.mjs")));
    assert.throws(() => resolveCommand("nope"), /desconocido/);
  });

  it("brands --list contra biblioteca temporal", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wissmotion-cli-"));
    const env = { ...process.env, WISSMOTION_BRANDS_DIR: dir };
    const empty = await new Promise((resolve, reject) => {
      execFile(
        process.execPath,
        [join(here, "cli.mjs"), "brands", "--list"],
        { timeout: 60_000, env },
        (e, stdout) => (e && e.code !== 0 ? reject(e) : resolve(stdout)),
      );
    });
    assert.ok(empty.includes("vacía"));
    const { rm } = await import("node:fs/promises");
    await rm(dir, { recursive: true, force: true });
    assert.ok(env.WISSMOTION_BRANDS_DIR);
  });

  it("brand-validate valida el ejemplo vía dispatcher", async () => {
    const { code, stdout } = await runCli(
      "brand-validate",
      join(here, "brand-kit", "brand.example.json"),
    );
    assert.equal(code, 0);
    assert.ok(stdout.includes("OK"));
  });
});
