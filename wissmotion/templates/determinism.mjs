// Verificación de determinismo (Fase 2/10): un mismo instante debe dar el
// mismo fotograma pase lo que pase antes. Captura A → B → A (el segundo A
// llega saltando hacia atrás) y repite A en otra ejecución; los tres PNG de A
// tienen que ser idénticos byte a byte. Si no, la animación depende del
// orden de seek, del reloj o del azar y el render no coincidirá con el preview.
//   node determinism.mjs --project dir [--at 1.5] [--other 4]
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const CLI = join(here, "..", "..", "packages", "cli", "dist", "cli.js");

function snapshot(project, times) {
  const out = mkdtempSync(join(tmpdir(), "wm-det-"));
  try {
    const r = spawnSync(
      process.execPath,
      [
        CLI,
        "snapshot",
        project,
        "-o",
        out,
        "--at",
        times.join(","),
        "--no-end",
        "--describe",
        "false",
        "--no-browser-gpu",
      ],
      { encoding: "utf8", timeout: 180_000 },
    );
    const pngs = readdirSync(out)
      .filter((f) => f.endsWith(".png"))
      .sort();
    if (pngs.length !== times.length) {
      throw new Error(
        `snapshot dio ${pngs.length}/${times.length} fotogramas: ${(r.stderr || r.stdout).slice(0, 400)}`,
      );
    }
    return pngs.map((f) =>
      createHash("sha256")
        .update(readFileSync(join(out, f)))
        .digest("hex"),
    );
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

/** { deterministic, hashes } para el instante `at`, con `other` en medio. */
export function verifyDeterminism(project, { at, other }) {
  const [a1, , a2] = snapshot(resolve(project), [at, other, at]);
  const [a3] = snapshot(resolve(project), [at]);
  return {
    deterministic: a1 === a2 && a1 === a3,
    hashes: { forward: a1, afterSeekBack: a2, freshRun: a3 },
  };
}

function opt(args, flag) {
  const i = args.indexOf(flag);
  const v = i === -1 ? undefined : args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const project = opt(args, "--project");
  if (!project) {
    console.error("Uso: node determinism.mjs --project dir [--at 1.5] [--other 4]");
    process.exit(2);
  }
  try {
    const res = verifyDeterminism(project, {
      at: Number(opt(args, "--at") ?? 1.5),
      other: Number(opt(args, "--other") ?? 4),
    });
    console.log(JSON.stringify(res, null, 2));
    process.exitCode = res.deterministic ? 0 : 1;
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
