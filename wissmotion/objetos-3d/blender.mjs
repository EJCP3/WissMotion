// Blender en modo consola (sin ventana) para WissMotion: render con Cycles
// a WebM con alfa, exportar .blend → .glb y correr scripts de modelado.
//   node blender.mjs render modelo.glb --out objeto.webm [--frames 96 --res 1080 --samples 48 --color #hex --metal 0.3]
//   node blender.mjs export escena.blend --out modelo.glb
//   node blender.mjs run script.py [-- args del script]
// Blender: $BLENDER_PATH o la versión más nueva instalada. Requiere ffmpeg.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const scripts = join(here, "blender");

/** Ruta del ejecutable de Blender, o null si no hay. */
export function findBlender(env = process.env, platform = process.platform) {
  if (env.BLENDER_PATH) return existsSync(env.BLENDER_PATH) ? env.BLENDER_PATH : null;
  if (platform === "win32") {
    const base = "C:/Program Files/Blender Foundation";
    if (!existsSync(base)) return null;
    const versions = readdirSync(base)
      .map((d) => ({ d, v: (d.match(/\d+(\.\d+)*/)?.[0] ?? "0").split(".").map(Number) }))
      .sort((a, b) => compareVersions(b.v, a.v));
    for (const { d } of versions) {
      const exe = join(base, d, "blender.exe");
      if (existsSync(exe)) return exe;
    }
    return null;
  }
  if (platform === "darwin") {
    const app = "/Applications/Blender.app/Contents/MacOS/Blender";
    return existsSync(app) ? app : null;
  }
  const which = spawnSync("which", ["blender"], { encoding: "utf8" });
  return which.status === 0 ? which.stdout.trim() : null;
}

export function compareVersions(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Ejecuta Blender sin ventana. `file` abre un .blend antes del script. */
export function runBlender({ script, args = [], file, blender = findBlender() }) {
  if (!blender) {
    throw new Error(
      "Blender no encontrado: instálalo o define BLENDER_PATH con la ruta a blender(.exe)",
    );
  }
  const argv = ["-b", ...(file ? [file] : ["--factory-startup"]), "-P", script, "--", ...args];
  const r = spawnSync(blender, argv, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  // Blender devuelve 0 aunque el script falle: se confirma con la marca WM_OK.
  if (r.status !== 0 || !out.includes("WM_OK")) {
    const tail = out.split("\n").slice(-25).join("\n");
    throw new Error(`Blender falló (código ${r.status}):\n${tail}`);
  }
  return out;
}

/** Turntable con Cycles → WebM VP9 con alfa (4 s por defecto, bucle limpio). */
export function renderTurntable({
  input,
  out,
  frames = 96,
  res = 1080,
  samples = 48,
  color,
  metal,
}) {
  const tmp = mkdtempSync(join(tmpdir(), "wm-blender-"));
  try {
    const args = ["--input", resolve(input), "--out", tmp, "--frames", String(frames)];
    args.push("--res", String(res), "--samples", String(samples));
    if (color) args.push("--color", color);
    if (metal !== undefined) args.push("--metal", String(metal));
    runBlender({ script: join(scripts, "render_turntable.py"), args });
    const fps = Math.round(frames / 4);
    const ff = spawnSync(
      "ffmpeg",
      ["-v", "error", "-y", "-framerate", String(fps), "-i", join(tmp, "frame_%04d.png")].concat([
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuva420p",
        "-b:v",
        "0",
        "-crf",
        "30",
        resolve(out),
      ]),
      { encoding: "utf8" },
    );
    if (ff.status !== 0) throw new Error(`ffmpeg falló: ${ff.stderr}`);
    return resolve(out);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function opt(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [cmd, target, ...rest] = process.argv.slice(2);
  try {
    if (cmd === "render" && target && opt(rest, "--out")) {
      const num = (n) => (opt(rest, n) === undefined ? undefined : Number(opt(rest, n)));
      const file = renderTurntable({
        input: target,
        out: opt(rest, "--out"),
        frames: num("--frames"),
        res: num("--res"),
        samples: num("--samples"),
        color: opt(rest, "--color"),
        metal: num("--metal"),
      });
      console.log(`OK: ${file}`);
    } else if (cmd === "export" && target && opt(rest, "--out")) {
      runBlender({
        script: join(scripts, "export_glb.py"),
        file: resolve(target),
        args: ["--out", resolve(opt(rest, "--out"))],
      });
      console.log(`OK: ${resolve(opt(rest, "--out"))}`);
    } else if (cmd === "run" && target) {
      const extra = rest[0] === "--" ? rest.slice(1) : rest;
      process.stdout.write(runBlender({ script: resolve(target), args: extra }));
    } else {
      console.error(
        "Uso:\n  node blender.mjs render modelo.glb --out objeto.webm [--frames 96 --res 1080 --samples 48 --color #hex --metal 0.3]\n  node blender.mjs export escena.blend --out modelo.glb\n  node blender.mjs run script.py [-- args]",
      );
      process.exitCode = 2;
    }
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
