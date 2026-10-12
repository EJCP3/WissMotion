// Genera previews/<id>.png (un frame a mitad de animación) para cada ejemplo.
// Uso: node render-previews.mjs [--only <id>] — requiere el CLI compilado y
// Chrome (una vez, ~10 s por preset). Los PNG se commitean: son la base de la
// galería de Fase 3 (las miniaturas animadas llegan con batchRender).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "..", "..", "..", "packages", "cli", "dist", "cli.js");
const examplesDir = join(here, "examples");
const outDir = join(here, "previews");

// Instante representativo por preset (mitad de su animación principal).
const TIMES = {
  "fade-slide-out": 1.7,
  "blur-out": 1.7,
  "card-carousel": 1.0,
  "device-mockup-scroll": 1.8,
  "browser-scroll": 1.8,
  "counter-up": 1.5,
  "number-roll": 1.2,
  "kinetic-type": 0.8,
  "logo-build": 1.2,
  "feature-grid": 0.9,
  "split-screen": 0.8,
  "tr-push": 2.3,
  "tr-zoom-through": 2.3,
  "tr-morph": 2.3,
  "tr-whip": 2.3,
  typewriter: 0.7,
  pulse: 0.9,
  shake: 0.7,
  glow: 0.9,
  "spring-pop": 0.7,
  wipe: 0.8,
  "slide-stack": 0.9,
  "stagger-words": 0.8,
  "blur-in": 0.9,
  "scale-fade": 0.9,
  "stagger-chars": 0.6,
  "tracking-in": 0.9,
  "flip-3d": 0.6,
  "negative-mask": 1.2,
  "morph-box": 0.85,
  "card-stack": 1.75,
  marquee: 2,
  "ring-carousel": 2,
  "wall-pan": 1.6,
  "gradient-columns": 2,
  "bento-shuffle": 0.9,
};

export function previewTime(id) {
  return TIMES[id] ?? 1.0;
}

export function previewIds() {
  return readdirSync(examplesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function snapshot(id) {
  const tmp = join(outDir, `.${id}`);
  mkdirSync(tmp, { recursive: true });
  const r = spawnSync(
    process.execPath,
    [
      cli,
      "snapshot",
      join(examplesDir, id),
      "--at",
      String(previewTime(id)),
      "--no-end",
      "--describe",
      "false",
      "-o",
      tmp,
    ],
    { timeout: 180_000, stdio: "ignore" },
  );
  const frame = readdirSync(tmp).find((f) => f.startsWith("frame-") && f.endsWith(".png"));
  if (r.status !== 0 || !frame) {
    rmSync(tmp, { recursive: true, force: true });
    throw new Error(`snapshot falló para ${id}`);
  }
  renameSync(join(tmp, frame), join(outDir, `${id}.png`));
  rmSync(tmp, { recursive: true, force: true });
}

// Solo corre al ejecutar el script directo; importarlo (tests) no hace nada.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const onlyIndex = process.argv.indexOf("--only");
  const only = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1];
  if (!existsSync(cli)) {
    console.error(`CLI no compilado en ${cli}`);
    process.exit(2);
  }
  mkdirSync(outDir, { recursive: true });
  const ids = only ? [only] : previewIds();
  const failed = [];
  for (const id of ids) {
    try {
      snapshot(id);
      console.log(`OK: previews/${id}.png`);
    } catch (e) {
      console.error(`FALLA: ${id}: ${e.message}`);
      failed.push(id);
    }
  }
  if (failed.length > 0) process.exitCode = 1;
}
