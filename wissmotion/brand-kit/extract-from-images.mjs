// Marca desde capturas (Fase 1): para apps sin web, capturas de App Store /
// Play Store o imágenes sueltas. FFmpeg reduce cada imagen a píxeles RGB,
// se cuantizan por área y se mapean a los 6 colores del brand.json.
//   node extract-from-images.mjs a.png b.jpg --name "Mi App" [--logo icono.png] --out b.json [--save n]
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { contrast, saturation } from "./extract-lib.mjs";
import { resolveLibraryDir, saveBrand } from "./brand-library.mjs";
import { validateBrand } from "./validate-brand.mjs";

const SIZE = 192; // lado de la miniatura que se analiza (trazos finos incluidos)

function hex(r, g, b) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Píxeles RGB de una imagen reducida a SIZE×SIZE (FFmpeg, sin dependencias). */
export function readPixels(file, run = spawnSync) {
  const r = run(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-vf",
      `scale=${SIZE}:${SIZE}`,
      "-frames:v",
      "1",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-",
    ],
    { maxBuffer: SIZE * SIZE * 3 * 2 },
  );
  if (r.status !== 0)
    throw new Error(`no pude leer ${file}: ${String(r.stderr ?? r.error?.message)}`);
  return r.stdout;
}

/** Cuenta colores cuantizados (pasos de 16) por área en todas las imágenes. */
export function countColors(buffers) {
  const counts = new Map();
  for (const buf of buffers) {
    for (let i = 0; i + 2 < buf.length; i += 3) {
      const q = (v) => Math.min(255, Math.round(v / 16) * 16);
      const key = hex(q(buf[i]), q(buf[i + 1]), q(buf[i + 2]));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function hue(c) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/**
 * Candidatos a color de marca: cromáticos legibles sobre el fondo, agrupados
 * por tono (30°) y pesados por área × saturación. Representante de cada grupo
 * = su tono más extenso. Una captura no dice cuál es "la marca" (un gráfico
 * rojo puede pesar más que un verde de marca), por eso se devuelven todos.
 */
export function brandCandidates(counts, background) {
  const groups = new Map();
  for (const [c, n] of counts) {
    if (saturation(c) < 0.35 || contrast(c, background) < 1.6) continue;
    const bin = Math.floor(hue(c) / 30) * 30;
    const g = groups.get(bin) ?? { weight: 0, best: c, bestN: 0 };
    g.weight += n * saturation(c);
    if (n > g.bestN) Object.assign(g, { best: c, bestN: n });
    groups.set(bin, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.weight - a.weight)
    .map((g) => ({ hex: g.best, weight: Math.round(g.weight) }));
}

/**
 * Colores por área: fondo = el que más ocupa; superficie = el siguiente
 * neutro cercano al fondo; texto = el de más contraste con el fondo;
 * primario/secundario = los dos primeros candidatos (o los forzados).
 */
export function colorsFromCounts(counts, { primary: forcedPrimary, accent: forcedAccent } = {}) {
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  if (ranked.length === 0) throw new Error("sin píxeles");
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const visible = ranked.filter((c) => counts.get(c) / total >= 0.002);
  const background = ranked[0];
  const neutrals = visible.filter((c) => saturation(c) < 0.15);
  const chromatic = brandCandidates(counts, background).map((c) => c.hex);
  const surface =
    neutrals.find((c) => c !== background && contrast(c, background) < 1.3) ??
    neutrals.find((c) => c !== background) ??
    background;
  const text = [...visible].sort((a, b) => contrast(b, background) - contrast(a, background))[0];
  const primary = forcedPrimary ?? chromatic[0] ?? text;
  const secondary = chromatic.find((c) => c !== primary && contrast(c, primary) > 1.3) ?? primary;
  const accent =
    forcedAccent ?? chromatic.find((c) => c !== primary && c !== secondary) ?? secondary;
  return { primary, secondary, accent, background, surface, text };
}

export function brandFromImages({ files, name, logo, primary, accent, run }) {
  const counts = countColors(files.map((f) => readPixels(f, run)));
  const colors = colorsFromCounts(counts, { primary, accent });
  const brand = {
    brandVersion: 1,
    name: name || "Mi app",
    colors,
    fonts: { heading: "Inter", body: "Inter", weights: [400, 700] },
  };
  if (logo) {
    const href = pathToFileURL(resolve(logo)).href;
    brand.logo = { full: href, icon: href };
  }
  return { brand, candidates: brandCandidates(counts, colors.background) };
}

function opt(args, flag) {
  const i = args.indexOf(flag);
  const v = i === -1 ? undefined : args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const valued = new Set(["--name", "--logo", "--out", "--save", "--primary", "--accent"]);
  const files = args.filter((a, i) => !a.startsWith("--") && !valued.has(args[i - 1]));
  if (files.length === 0) {
    console.error(
      'Uso: node extract-from-images.mjs captura1.png [captura2.jpg…] --name "Mi App" [--logo icono.png] [--primary #hex] [--accent #hex] [--out b.json] [--save nombre]',
    );
    process.exit(2);
  }
  try {
    const { brand, candidates } = brandFromImages({
      files,
      name: opt(args, "--name"),
      logo: opt(args, "--logo"),
      primary: opt(args, "--primary")?.toLowerCase(),
      accent: opt(args, "--accent")?.toLowerCase(),
    });
    const { valid, errors } = await validateBrand(brand);
    if (!valid) throw new Error(JSON.stringify(errors));
    const out = opt(args, "--out");
    if (out) await writeFile(resolve(out), `${JSON.stringify(brand, null, 2)}\n`);
    const save = opt(args, "--save");
    if (save) await saveBrand(resolveLibraryDir(), save, brand);
    console.log(JSON.stringify(brand.colors, null, 2));
    console.log(
      `Candidatos a color de marca (repite con --primary si no es el primero): ${candidates
        .slice(0, 5)
        .map((c) => c.hex)
        .join(", ")}`,
    );
    console.log(
      "Fuentes: Inter por defecto (una captura no las revela); ajústalas en el panel Marca.",
    );
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
