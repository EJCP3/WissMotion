// Películas de varias escenas: un storyboard JSON → una escena por plantilla
// (instanciada con la marca y en el formato pedido) → render de cada escena →
// unión con transiciones xfade de ffmpeg (+ música opcional) → revisión.
//   node film.mjs --storyboard pelicula.json --out ./mi-pelicula [--format 9:16]
//     [--quality draft|standard|delivery] [--workers 2] [--studio] [--dry-run]
//   (--studio: además lo guarda como borrador en el Studio, Home → Borradores)
//   node film.mjs --review ./mi-pelicula
// Cada escena sigue siendo un proyecto normal (editable en el Studio); la
// película se recompone en cada build. Unir clips ya renderizados evita que
// los ids/clases de plantillas distintas choquen en un mismo documento.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { instantiate } from "../templates/instantiate.mjs";
import { FORMAT_SIZES } from "../templates/formats.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, "..", "..", "packages", "cli", "dist", "cli.js");
/** Carpeta de borradores que lista el Studio (Home → Borradores). */
export const STUDIO_PROJECTS = join(here, "..", "..", "packages", "studio", "data", "projects");

/** Transiciones xfade de ffmpeg que admitimos (las que leen bien en promo). */
export const TRANSITIONS = [
  "fade",
  "fadeblack",
  "fadewhite",
  "dissolve",
  "slideleft",
  "slideright",
  "slideup",
  "slidedown",
  "smoothleft",
  "smoothup",
  "wipeleft",
  "wipeup",
  "circleopen",
  "circleclose",
  "zoomin",
  "radial",
];

export const DEFAULT_TRANSITION = { type: "fade", duration: 0.5 };

/** Errores del storyboard (lista vacía = válido). */
export function validateStoryboard(sb, templateIds) {
  const errors = [];
  if (!sb || typeof sb !== "object") return ["storyboard no es un objeto"];
  if (!/^[a-z0-9-]+$/.test(sb.name ?? "")) errors.push("name: slug en minúsculas (a-z, 0-9, -)");
  if (sb.format && !FORMAT_SIZES[sb.format]) errors.push(`format desconocido: ${sb.format}`);
  if (!Array.isArray(sb.scenes) || sb.scenes.length === 0) {
    errors.push("scenes: al menos una escena");
    return errors;
  }
  sb.scenes.forEach((scene, i) => {
    if (!templateIds.includes(scene.template)) {
      errors.push(`scenes[${i}].template desconocida: ${scene.template}`);
    }
    const t = scene.transition;
    if (t && !TRANSITIONS.includes(t.type)) {
      errors.push(`scenes[${i}].transition.type desconocida: ${t.type}`);
    }
    if (t && !(t.duration > 0 && t.duration <= 2)) {
      errors.push(`scenes[${i}].transition.duration entre 0 y 2 s`);
    }
  });
  return errors;
}

/**
 * Argumentos de ffmpeg para unir clips con xfade (la transición i va entre
 * el clip i y el i+1). Cada clip pasa por fps/format/settb comunes porque
 * xfade exige la misma base de tiempo. Puro: testeable sin ffmpeg.
 */
export function xfadeArgs({ clips, transitions, out, music, fps = 30 }) {
  const args = ["-y"];
  for (const c of clips) args.push("-i", c.file);
  if (music) args.push("-i", music);
  const parts = clips.map((_, i) => `[${i}:v]fps=${fps},format=yuv420p,settb=AVTB[c${i}]`);
  let last = "c0";
  let elapsed = clips[0].duration;
  for (let i = 1; i < clips.length; i++) {
    const t = transitions[i - 1] ?? DEFAULT_TRANSITION;
    const offset = Math.max(0, elapsed - t.duration);
    const label = i === clips.length - 1 ? "vout" : `x${i}`;
    parts.push(
      `[${last}][c${i}]xfade=transition=${t.type}:duration=${t.duration}:offset=${offset.toFixed(3)}[${label}]`,
    );
    last = label;
    elapsed = offset + clips[i].duration;
  }
  if (clips.length === 1) parts.push(`[c0]null[vout]`);
  const total = elapsed;
  if (music) {
    const fadeAt = Math.max(0, total - 1.5);
    parts.push(
      `[${clips.length}:a]atrim=0:${total.toFixed(3)},afade=t=in:d=0.4,afade=t=out:st=${fadeAt.toFixed(3)}:d=1.5[aout]`,
    );
  }
  args.push("-filter_complex", parts.join(";"), "-map", "[vout]");
  if (music) args.push("-map", "[aout]", "-c:a", "aac", "-b:a", "192k");
  args.push("-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart");
  args.push(out);
  return { args, total };
}

function probeDuration(file) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  );
  const d = Number(r.stdout.trim());
  if (!(d > 0)) throw new Error(`no se pudo leer la duración de ${file}`);
  return d;
}

async function loadBrand(brand, baseDir) {
  if (!brand) return {};
  if (typeof brand === "object") return brand;
  return JSON.parse(await readFile(resolve(baseDir, brand), "utf8"));
}

/** Construye la película. Con dryRun solo instancia y devuelve el plan. */
export async function buildFilm({
  storyboard,
  baseDir = process.cwd(),
  outDir,
  format,
  quality = "standard",
  workers = 2,
  dryRun = false,
  studio = false,
  studioDir,
  cli = CLI,
}) {
  const templateIds = readdirSync(join(here, "..", "templates"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const errors = validateStoryboard(storyboard, templateIds);
  if (errors.length > 0) throw new Error(`storyboard inválido: ${errors.join("; ")}`);
  const fmt = format ?? storyboard.format ?? "16:9";
  const brand = await loadBrand(storyboard.brand, baseDir);
  const out = resolve(outDir);
  mkdirSync(join(out, "renders"), { recursive: true });

  const scenes = [];
  for (const [i, scene] of storyboard.scenes.entries()) {
    const dir = join(out, "escenas", `${String(i + 1).padStart(2, "0")}-${scene.template}`);
    await instantiate({
      templateId: scene.template,
      brand,
      contentVars: scene.vars ?? {},
      outDir: dir,
      format: fmt,
    });
    scenes.push({
      dir,
      template: scene.template,
      file: join(out, "renders", `escena-${String(i + 1).padStart(2, "0")}.mp4`),
      transition: scene.transition ?? storyboard.transition ?? DEFAULT_TRANSITION,
    });
  }
  const filmFile = join(out, `${storyboard.name}.${fmt.replace(":", "x")}.mp4`);
  const manifest = { name: storyboard.name, format: fmt, film: filmFile, scenes };
  if (dryRun) return { ...manifest, dryRun: true };

  for (const s of scenes) {
    const r = spawnSync(
      process.execPath,
      [
        cli,
        "render",
        s.dir,
        "-o",
        s.file,
        "--format",
        "mp4",
        "--fps",
        "30",
        "--quality",
        quality,
        "--variables-file",
        join(s.dir, "variables.json"),
        "--workers",
        String(workers),
      ],
      { stdio: "inherit", timeout: 1_800_000 },
    );
    if (r.status !== 0 || !existsSync(s.file)) throw new Error(`falló el render de ${s.dir}`);
    s.duration = probeDuration(s.file);
  }
  const music = storyboard.music ? resolve(baseDir, storyboard.music) : undefined;
  const { args, total } = xfadeArgs({
    clips: scenes,
    transitions: scenes.slice(0, -1).map((s) => s.transition),
    out: filmFile,
    music,
  });
  const r = spawnSync("ffmpeg", ["-v", "error", ...args], { stdio: "inherit" });
  if (r.status !== 0 || !existsSync(filmFile)) throw new Error("falló la unión con ffmpeg");
  const result = { ...manifest, duration: Number(total.toFixed(3)) };
  if (studio) {
    result.studio = (await exportToStudio(result, { studioDir, hasAudio: Boolean(music) })).dir;
  }
  await writeFile(join(out, "film.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

/** Hornea valores en los defaults de data-composition-variables (como el Studio). */
export function bakeVariables(html, values) {
  return html.replace(
    /(<html[^>]*data-composition-variables=')(\[[\s\S]*?\])(')/,
    (_m, prefix, json, suffix) => {
      const declared = JSON.parse(json.replace(/&#39;/g, "'"));
      for (const v of declared) if (values[v.id] !== undefined) v.default = values[v.id];
      return `${prefix}${JSON.stringify(declared).replace(/'/g, "&#39;")}${suffix}`;
    },
  );
}

/** index.html del borrador: la película final como un clip de video. */
export function filmPlayerHtml({ id, title, width, height, duration, hasAudio }) {
  const audio = hasAudio ? `data-has-audio="true"` : "muted";
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>${title} · película</title>
    <style>
      html,
      body {
        margin: 0;
        background: #000;
      }
      #stage {
        position: relative;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: #000;
      }
      #film {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    </style>
  </head>
  <body>
    <div
      id="stage"
      data-composition-id="${id}"
      data-start="0"
      data-width="${width}"
      data-height="${height}"
    >
      <video
        id="film"
        class="clip"
        src="pelicula.mp4"
        playsinline
        ${audio}
        data-start="0"
        data-duration="${duration}"
        data-track-index="0"
      ></video>
      <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
      <script>
        const tl = gsap.timeline({ paused: true });
        window.__timelines = window.__timelines || {};
        window.__timelines["${id}"] = tl;
      </script>
    </div>
  </body>
</html>
`;
}

/**
 * Exporta la película como borrador del Studio: index.html reproduce
 * pelicula.mp4 y cada escena va en compositions/ con sus variables
 * horneadas (editable en el Studio). Reconstruir sobrescribe el mismo borrador.
 */
export async function exportToStudio(film, { studioDir = STUDIO_PROJECTS, hasAudio = false } = {}) {
  const dir = join(studioDir, film.name);
  mkdirSync(join(dir, "compositions"), { recursive: true });
  copyFileSync(film.film, join(dir, "pelicula.mp4"));
  const size = FORMAT_SIZES[film.format];
  await writeFile(
    join(dir, "index.html"),
    filmPlayerHtml({
      id: film.name,
      title: film.name,
      width: size.width,
      height: size.height,
      duration: film.duration,
      hasAudio,
    }),
    "utf8",
  );
  const compositions = [];
  for (const [i, s] of film.scenes.entries()) {
    const html = await readFile(join(s.dir, "index.html"), "utf8");
    const values = JSON.parse(await readFile(join(s.dir, "variables.json"), "utf8"));
    const name = `compositions/escena-${String(i + 1).padStart(2, "0")}-${s.template}.html`;
    await writeFile(join(dir, name), bakeVariables(html, values), "utf8");
    compositions.push(name);
  }
  return { dir, compositions };
}

/** Hallazgos de `hyperframes check` que merecen atención (sin ruido de estructura). */
export function summarizeCheck(report) {
  const NOISE = new Set(["nested_structure_needs_subcomposition"]);
  const issues = [];
  for (const section of ["lint", "runtime", "layout", "motion", "contrast"]) {
    for (const f of report?.[section]?.findings ?? []) {
      if (NOISE.has(f.code)) continue;
      issues.push({
        section,
        severity: f.severity,
        code: f.code,
        message: f.message,
        fixHint: f.fixHint,
        time: f.time,
      });
    }
  }
  return issues;
}

/**
 * Revisión: `hyperframes check` por escena + hoja de 12 fotogramas de la
 * película. Deja review.json y review.md para que una persona o un agente
 * con visión (leyendo la hoja) corrija antes de entregar.
 */
export async function reviewFilm({ outDir, cli = CLI }) {
  const out = resolve(outDir);
  const film = JSON.parse(await readFile(join(out, "film.json"), "utf8"));
  const scenes = [];
  for (const s of film.scenes) {
    const r = spawnSync(process.execPath, [cli, "check", s.dir, "--json", "--samples", "5"], {
      encoding: "utf8",
      timeout: 300_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    const text = r.stdout ?? "";
    let issues;
    try {
      issues = summarizeCheck(JSON.parse(text.slice(text.indexOf("{"))));
    } catch {
      issues = [
        { section: "check", severity: "error", code: "check_failed", message: text.slice(0, 300) },
      ];
    }
    scenes.push({ template: s.template, dir: s.dir, issues });
  }
  mkdirSync(join(out, "review"), { recursive: true });
  const sheet = join(out, "review", "pelicula.jpg");
  spawnSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    film.film,
    "-vf",
    `fps=12/${film.duration},scale=320:-2,tile=4x3:padding=4:color=gray`,
    "-frames:v",
    "1",
    sheet,
  ]);
  const errors = scenes.reduce(
    (n, s) => n + s.issues.filter((i) => i.severity === "error").length,
    0,
  );
  const warnings = scenes.reduce(
    (n, s) => n + s.issues.filter((i) => i.severity === "warning").length,
    0,
  );
  const review = { film: film.film, sheet, errors, warnings, scenes };
  await writeFile(join(out, "review", "review.json"), `${JSON.stringify(review, null, 2)}\n`);
  const md = [
    `# Revisión de ${film.name} (${film.format}, ${film.duration} s)`,
    "",
    `Hoja de fotogramas: \`review/pelicula.jpg\` — mírala entera antes de entregar.`,
    `Errores: ${errors} · Avisos: ${warnings}`,
    "",
    "Ojo: un hallazgo de contraste o layout en un instante de entrada/salida animada (fundido) puede ser transitorio; confírmalo en la hoja o con un snapshot en ese t.",
    "",
    ...scenes.flatMap((s, i) => [
      `## Escena ${i + 1} · ${s.template}`,
      ...(s.issues.length === 0
        ? ["Sin hallazgos."]
        : s.issues.map(
            (x) =>
              `- **${x.severity}** \`${x.code}\` (${x.section}${typeof x.time === "number" ? `, t=${x.time} s` : ""}): ${x.message}${x.fixHint ? ` → ${x.fixHint}` : ""}`,
          )),
      "",
    ]),
  ].join("\n");
  await writeFile(join(out, "review", "review.md"), md);
  return review;
}

function opt(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

if (process.argv.includes("--storyboard") || process.argv.includes("--review")) {
  const args = process.argv.slice(2);
  try {
    if (args.includes("--review")) {
      const review = await reviewFilm({ outDir: opt(args, "--review") });
      console.log(
        `revisión: ${review.errors} errores, ${review.warnings} avisos → ${join(resolve(opt(args, "--review")), "review", "review.md")}`,
      );
      if (review.errors > 0) process.exitCode = 1;
    } else {
      const path = resolve(opt(args, "--storyboard"));
      const out = opt(args, "--out");
      if (!out) throw new Error("falta --out");
      const film = await buildFilm({
        storyboard: JSON.parse(await readFile(path, "utf8")),
        baseDir: dirname(path),
        outDir: out,
        format: opt(args, "--format"),
        quality: opt(args, "--quality"),
        workers: Number(opt(args, "--workers") ?? 2),
        dryRun: args.includes("--dry-run"),
        studio: args.includes("--studio"),
      });
      console.log(
        film.dryRun
          ? `plan: ${film.scenes.length} escenas en ${film.format} (dry-run)`
          : `película: ${film.film} (${film.duration} s)${
              film.studio
                ? `
borrador del Studio: ${film.studio}`
                : ""
            }`,
      );
    }
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
