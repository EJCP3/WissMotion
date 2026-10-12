// Regenera <plantilla>/preview.png (un fotograma representativo) con
// `hyperframes snapshot`. Uso: node render-previews.mjs [--only id]
// Requiere el CLI compilado y Chrome. Tras cambiar el aspecto de una
// plantilla, regenera su póster (la galería del Studio lo muestra).
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "..", "..", "packages", "cli", "dist", "cli.js");

// Instante donde la plantilla se ve completa (no en la entrada ni la salida).
const TIMES = {
  "promo-app": 4.5,
  "promo-web": 4.5,
  lanzamiento: 4.5,
  palabra: 1.2,
  "lista-cinetica": 4,
};

export function previewTime(id) {
  return TIMES[id] ?? 3;
}

export function snapshotPreview(id) {
  const out = mkdtempSync(join(tmpdir(), `wm-preview-${id}-`));
  const r = spawnSync(
    process.execPath,
    [
      cli,
      "snapshot",
      join(here, id),
      "--at",
      String(previewTime(id)),
      "--no-end",
      "--describe",
      "false",
      "-o",
      out,
    ],
    { stdio: "ignore", timeout: 180_000 },
  );
  const frame = readdirSync(out).find((f) => f.startsWith("frame-") && f.endsWith(".png"));
  if (r.status !== 0 || !frame) throw new Error(`snapshot falló para ${id}`);
  copyFileSync(join(out, frame), join(here, id, "preview.png"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const i = process.argv.indexOf("--only");
  const ids =
    i === -1
      ? readdirSync(here, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
      : [process.argv[i + 1]];
  let failed = 0;
  for (const id of ids) {
    try {
      snapshotPreview(id);
      console.log(`OK: ${id}/preview.png`);
    } catch (e) {
      console.error(`FALLA: ${e.message}`);
      failed++;
    }
  }
  if (failed > 0) process.exitCode = 1;
}
