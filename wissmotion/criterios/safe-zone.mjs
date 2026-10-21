// Zona segura (criterios/README.md, reglas comunes): avisa del texto que entra
// en los márgenes que tapan Reels/TikTok/YouTube. Cada margen es un rectángulo
// y se comprueba con `hyperframes check --caption-zone`, una pasada por margen.
//   node safe-zone.mjs --project dir [--format 9:16] [--meta] [--seek .25,.5,.75,1]
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CLI } from "../templates/determinism.mjs";

/** Márgenes en px sobre el tamaño de referencia de cada formato. */
export const SAFE_ZONES = {
  "9:16": { w: 1080, h: 1920, side: 108, top: 150, bottom: 340 },
  "4:5": { w: 1080, h: 1350, side: 108, top: 80, bottom: 80 },
  "1:1": { w: 1080, h: 1080, side: 135, top: 80, bottom: 80 },
  "16:9": { w: 1920, h: 1080, side: 96, top: 54, bottom: 54 },
};
// Anuncios de Meta en 9:16: texto fuera del 14 % de arriba y del 35 % de abajo.
const META = { top: 0.14, bottom: 0.35 };

/** Formato más cercano a la proporción del lienzo. */
export function formatOf(width, height) {
  const off = (id) => Math.abs(SAFE_ZONES[id].w / SAFE_ZONES[id].h - width / height);
  return Object.keys(SAFE_ZONES).sort((a, b) => off(a) - off(b))[0];
}

/** Los cuatro márgenes como rectángulos en fracciones 0-1 del lienzo. */
export function marginStrips(format, { meta = false } = {}) {
  const z = SAFE_ZONES[format];
  if (!z) throw new Error(`formato desconocido: ${format} (${Object.keys(SAFE_ZONES).join(", ")})`);
  const side = z.side / z.w;
  const top = meta && format === "9:16" ? META.top : z.top / z.h;
  const bottom = meta && format === "9:16" ? META.bottom : z.bottom / z.h;
  return [
    { edge: "arriba", x0: 0, y0: 0, x1: 1, y1: top },
    { edge: "abajo", x0: 0, y0: 1 - bottom, x1: 1, y1: 1 },
    { edge: "izquierda", x0: 0, y0: 0, x1: side, y1: 1 },
    { edge: "derecha", x0: 1 - side, y0: 0, x1: 1, y1: 1 },
  ];
}

/** Hallazgos `caption_zone_collision` del JSON de check, sea cual sea su anidado. */
export function zoneIssues(report) {
  const found = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      if (v.code === "caption_zone_collision") found.push(v);
      else Object.values(v).forEach(walk);
    }
  };
  walk(report);
  return found;
}

function canvasOf(project) {
  const html = readFileSync(join(project, "index.html"), "utf8");
  const w = /data-width="(\d+)"/.exec(html);
  const h = /data-height="(\d+)"/.exec(html);
  if (!w || !h) throw new Error("index.html no declara data-width / data-height");
  return { width: Number(w[1]), height: Number(h[1]) };
}

const fmtZone = (s, seek) =>
  `x0=${s.x0.toFixed(4)};y0=${s.y0.toFixed(4)};x1=${s.x1.toFixed(4)};y1=${s.y1.toFixed(4)};seek=${seek}`;

/** { format, issues: [{ edge, time, text, selector }] } */
// ponytail: una pasada de check por margen (4 Chrome); una sola pasada con varias zonas si se vuelve lento.
export function checkSafeZone(project, { format, meta = false, seek = ".25,.5,.75,1" } = {}) {
  const dir = resolve(project);
  const { width, height } = canvasOf(dir);
  const fmt = format ?? formatOf(width, height);
  const issues = [];
  for (const strip of marginStrips(fmt, { meta })) {
    const r = spawnSync(
      process.execPath,
      [
        CLI,
        "check",
        dir,
        "--json",
        "--no-contrast",
        "--no-at-transitions",
        "--samples",
        "1",
        "--no-browser-gpu",
        "--caption-zone",
        fmtZone(strip, seek),
      ],
      { encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024 },
    );
    let report;
    try {
      report = JSON.parse(r.stdout);
    } catch {
      throw new Error(
        `check no devolvió JSON (${strip.edge}): ${(r.stderr || r.stdout).slice(0, 400)}`,
      );
    }
    for (const i of zoneIssues(report)) {
      issues.push({ edge: strip.edge, time: i.time, text: i.text, selector: i.selector });
    }
  }
  return { format: fmt, width, height, issues };
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
    console.error(
      "Uso: node safe-zone.mjs --project dir [--format 9:16] [--meta] [--seek .25,.5,.75,1]",
    );
    process.exit(2);
  }
  try {
    const res = checkSafeZone(project, {
      format: opt(args, "--format"),
      meta: args.includes("--meta"),
      seek: opt(args, "--seek"),
    });
    console.log(`Formato ${res.format} (${res.width}×${res.height})`);
    for (const i of res.issues) {
      console.log(`FUERA DE ZONA ${i.edge} @${i.time}s ${i.selector ?? ""} "${i.text ?? ""}"`);
    }
    if (res.issues.length === 0) console.log("OK: ningún texto en los márgenes.");
    else {
      console.log(
        "Si es un elemento entrando o saliendo, ignóralo; si es intencionado, márcalo con data-layout-allow-caption-zone.",
      );
    }
    process.exitCode = res.issues.length === 0 ? 0 : 1;
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
