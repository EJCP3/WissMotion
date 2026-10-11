// Genera sheets/<id>.jpg (12 fotogramas repartidos en rejilla 4x3) para cada
// referencia de references.json que aún no lo tenga. Uso: node sheets.mjs
// [--force]. Requiere ffmpeg/ffprobe en el PATH y los videos en su ruta
// (examples/ está en .gitignore: los MP4 no se commitean, las hojas sí).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const { references } = JSON.parse(readFileSync(join(here, "references.json"), "utf8"));
const force = process.argv.includes("--force");
mkdirSync(join(here, "sheets"), { recursive: true });

let failed = 0;
for (const ref of references) {
  const out = join(here, "sheets", `${ref.id}.jpg`);
  if (existsSync(out) && !force) continue;
  const video = join(root, ref.files[0]);
  if (!existsSync(video)) {
    console.error(`FALTA: ${ref.files[0]}`);
    failed++;
    continue;
  }
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video],
    { encoding: "utf8" },
  );
  const duration = Number(probe.stdout.trim());
  const r = spawnSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    video,
    "-vf",
    `fps=12/${duration},scale=240:-2,tile=4x3:padding=4:color=gray`,
    "-frames:v",
    "1",
    "-q:v",
    "4",
    out,
  ]);
  if (r.status !== 0) {
    console.error(`FALLA: ${ref.id}`);
    failed++;
    continue;
  }
  console.log(`OK: sheets/${ref.id}.jpg`);
}
if (failed > 0) process.exitCode = 1;
