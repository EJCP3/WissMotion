// Render por lotes (Fase 6 básico): un proyecto → todos los destinos en un
// comando, sobre el `hyperframes render` existente:
//   node render-batch.mjs --project ./mi-promo --dest all|youtube|reels|tiktok|shorts|linkedin|x|webm|gif|hero
//     [--variables-file vars.json] [--quality draft|looks|delivery] [--workers 2] [--force] [--dry-run]
// Cada destino es {format, fps, quality, resolution?}; 16:9 rinde nativo
// (1280×720: el upscale a 1080p exige factor no entero y el CLI lo rechaza).
// Si el aspecto no coincide pero el index.html trae layout para ese formato
// (CSS [data-format="9:16"], ver templates/formats.mjs), se genera
// .format-9x16.html desde el index.html actual, se renderiza con --composition
// y se borra al terminar; si no,
// se omite con aviso (salvo --force). Deja renders/<nombre>.<dest>.<ext> + manifest.json.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyFormat, formatFileName } from "../templates/formats.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export const DESTINATIONS = {
  youtube: { format: "mp4", fps: 30, quality: "delivery", aspect: "16:9" },
  linkedin: { format: "mp4", fps: 30, quality: "standard", aspect: "16:9" },
  x: { format: "mp4", fps: 30, quality: "standard", aspect: "16:9" },
  hero: { format: "mp4", fps: 30, quality: "looks", aspect: "16:9" },
  webm: { format: "webm", fps: 30, quality: "standard", aspect: "16:9" },
  gif: { format: "gif", fps: 15, quality: "standard", aspect: "16:9" },
  reels: { format: "mp4", fps: 30, quality: "delivery", resolution: "portrait", aspect: "9:16" },
  tiktok: { format: "mp4", fps: 30, quality: "delivery", resolution: "portrait", aspect: "9:16" },
  shorts: { format: "mp4", fps: 30, quality: "delivery", resolution: "portrait", aspect: "9:16" },
  square: { format: "mp4", fps: 30, quality: "delivery", aspect: "1:1" },
  feed: { format: "mp4", fps: 30, quality: "delivery", aspect: "4:5" },
};

export const DEST_IDS = Object.keys(DESTINATIONS);

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

export function aspectOf(width, height) {
  const d = gcd(width, height);
  return `${width / d}:${height / d}`;
}

/** Lee data-width/height de la composición raíz del proyecto. */
export async function readCompositionSize(projectDir) {
  const html = await readFile(join(projectDir, "index.html"), "utf8");
  const root = /<div[^>]*data-composition-id[^>]*>/.exec(html)?.[0] ?? "";
  const w = /data-width="(\d+)"/.exec(root)?.[1];
  const h = /data-height="(\d+)"/.exec(root)?.[1];
  if (!w || !h) throw new Error("index.html sin data-width/height en la composición raíz");
  return { width: Number(w), height: Number(h), aspect: aspectOf(Number(w), Number(h)) };
}

/** Formatos con layout propio en el HTML (además del base 16:9). */
export function formatsIn(html) {
  const found = new Set([...html.matchAll(/\[data-format="([0-9]+:[0-9]+)"\]/g)].map((m) => m[1]));
  if (found.size > 0) found.add("16:9");
  return [...found];
}

export function planBatch({ dest, aspect, quality, workers, formats = [] }) {
  const ids = dest === "all" ? DEST_IDS : [dest];
  if (dest !== "all" && !DESTINATIONS[dest]) throw new Error(`destino desconocido: ${dest}`);
  return ids.map((id) => {
    const d = DESTINATIONS[id];
    return {
      dest: id,
      ...d,
      quality: quality ?? d.quality,
      workers,
      compatible: d.aspect === aspect || formats.includes(d.aspect),
      ...(d.aspect !== aspect && formats.includes(d.aspect)
        ? { composition: formatFileName(d.aspect) }
        : {}),
    };
  });
}

export function renderArgs({ projectDir, outFile, job, variablesFile }) {
  const args = [
    "render",
    projectDir,
    "-o",
    outFile,
    "--format",
    job.format,
    "--fps",
    String(job.fps),
  ];
  if (job.quality) args.push("--quality", job.quality);
  if (job.resolution) args.push("--resolution", job.resolution);
  if (job.composition) args.push("--composition", job.composition);
  if (variablesFile) args.push("--variables-file", variablesFile);
  args.push("--workers", String(job.workers ?? 2));
  return args;
}

export async function runBatch({
  projectDir,
  dest = "all",
  variablesFile,
  quality,
  workers = 2,
  force = false,
  dryRun = false,
  cliPath = join(here, "..", "..", "packages", "cli", "dist", "cli.js"),
  outBase,
}) {
  const project = resolve(projectDir);
  const { aspect } = await readCompositionSize(project);
  const name = basename(project);
  const rendersDir = outBase ?? join(project, "renders");
  mkdirSync(rendersDir, { recursive: true });
  const html = await readFile(join(project, "index.html"), "utf8");
  const plan = planBatch({ dest, aspect, quality, workers, formats: formatsIn(html) });
  const ext = { mp4: "mp4", webm: "webm", gif: "gif" };
  const results = [];
  for (const job of plan) {
    const file = join(rendersDir, `${name}.${job.dest}.${ext[job.format] ?? job.format}`);
    if (!job.compatible && !force) {
      results.push({
        dest: job.dest,
        file,
        ok: false,
        skipped: `aspecto ${aspect} ≠ ${job.aspect}`,
      });
      continue;
    }
    // Derivado del index.html actual: lo editado en el Studio llega a todos los formatos.
    if (job.composition && !dryRun) {
      writeFileSync(join(project, job.composition), applyFormat(html, job.aspect), "utf8");
    }
    const args = renderArgs({ projectDir: project, outFile: file, job, variablesFile });
    if (dryRun) {
      results.push({ dest: job.dest, file, ok: true, dryRun: true, args });
      continue;
    }
    const r = spawnSync(process.execPath, [cliPath, ...args], {
      timeout: 1_800_000,
      stdio: "inherit",
    });
    // Fuera tras el render: un segundo HTML raíz en el proyecto rompe el lint
    // (multiple_root_compositions) y podría duplicar audio en el Studio.
    if (job.composition) rmSync(join(project, job.composition), { force: true });
    results.push({ dest: job.dest, file, ok: r.status === 0 && existsSync(file) });
  }
  const manifest = { project: name, aspect, at: new Date().toISOString(), results };
  await writeFile(
    join(rendersDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return manifest;
}

function opt(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

function has(args, name) {
  return args.includes(name);
}

// Solo corre con --project (importarlo desde tests no hace nada).
if (process.argv.includes("--project")) {
  const args = process.argv.slice(2);
  const project = opt(args, "--project");
  if (!project) {
    console.error(
      "Uso: node render-batch.mjs --project dir [--dest all|id (square, feed…)] [--variables-file f] [--quality q] [--workers n] [--force] [--dry-run]",
    );
    process.exit(2);
  }
  try {
    const manifest = await runBatch({
      projectDir: project,
      dest: opt(args, "--dest") ?? "all",
      variablesFile: opt(args, "--variables-file"),
      quality: opt(args, "--quality"),
      workers: Number(opt(args, "--workers") ?? 2),
      force: has(args, "--force"),
      dryRun: has(args, "--dry-run"),
    });
    const ok = manifest.results.filter((r) => r.ok).length;
    const skipped = manifest.results.filter((r) => r.skipped).length;
    const failed = manifest.results.length - ok - skipped;
    console.log(
      `lote: ${ok} ok, ${skipped} omitidos, ${failed} fallidos → ${join(resolve(project), "renders", "manifest.json")}`,
    );
    if (failed > 0) process.exitCode = 1;
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
