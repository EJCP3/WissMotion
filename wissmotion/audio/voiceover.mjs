// Voz en off por lotes (Fase 5): guion.json [{id?, text, voice?, lang?, speed?}]
// → un WAV por segmento vía `hyperframes tts` (Kokoro local) + manifiesto.
// Sin backend (pip install kokoro-onnx soundfile) no falla: marca pendientes
// con la acción exacta y sale 0. El WAV resultante se referencia desde la
// composición como <audio> o se mezcla en el render.
//   node voiceover.mjs --script guion.json --out audio/ [--voice af_heart] [--lang es] [--dry-run]
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export class VoiceoverError extends Error {}

export function buildTtsArgs({ text, out, voice, lang, speed, cli }) {
  const args = [cli, "tts", text, "-o", out];
  if (voice) args.push("--voice", voice);
  if (lang) args.push("--lang", lang);
  if (speed) args.push("--speed", String(speed));
  return args;
}

export function checkTtsBackend(run = spawnSync, cli = "hyperframes") {
  const r = run("node", [cli, "tts", "--list"], {
    timeout: 120_000,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.status === 0) return { ok: true };
  if (/kokoro|soundfile|pip install|ModuleNotFound|No module/i.test(out)) {
    return { ok: false, hint: "pip install kokoro-onnx soundfile" };
  }
  return { ok: false, hint: out.slice(0, 200) || `tts salió con código ${r.status}` };
}

export async function runVoiceover({
  script,
  outDir,
  voice,
  lang,
  dryRun = false,
  run = spawnSync,
  cliPath,
  probeTts = true,
}) {
  const cli = cliPath ?? "hyperframes";
  mkdirSync(outDir, { recursive: true });
  const backend = probeTts ? checkTtsBackend(run, cli) : { ok: true };
  const segments = [];
  for (const [index, seg] of script.entries()) {
    const id = seg.id ?? `seg-${String(index + 1).padStart(2, "0")}`;
    const file = join(outDir, `vo-${id}.wav`);
    const entry = { id, text: seg.text, file, status: "pending" };
    if (!backend.ok) {
      entry.status = `pending: backend sin instalar (${backend.hint})`;
      segments.push(entry);
      continue;
    }
    const args = buildTtsArgs({
      text: seg.text,
      out: file,
      voice: seg.voice ?? voice,
      lang: seg.lang ?? lang,
      speed: seg.speed,
      cli,
    });
    if (dryRun) {
      entry.status = "dry-run";
      entry.args = args;
      segments.push(entry);
      continue;
    }
    const r = run(process.execPath, args, { timeout: 600_000, stdio: "ignore" });
    entry.status = r.status === 0 ? "ok" : `error: código ${r.status}`;
    segments.push(entry);
  }
  const manifest = { backend: backend.ok ? "ok" : backend.hint, segments };
  await writeFile(join(outDir, "voiceover.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function opt(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

// Solo corre con --script (importarlo desde tests no hace nada).
if (process.argv.includes("--script")) {
  const { readFile } = await import("node:fs/promises");
  const args = process.argv.slice(2);
  try {
    const scriptPath = opt(args, "--script");
    const out = opt(args, "--out");
    if (!scriptPath || !out)
      throw new VoiceoverError(
        "uso: --script guion.json --out audio/ [--voice v] [--lang es] [--dry-run]",
      );
    const script = JSON.parse(await readFile(resolve(scriptPath), "utf8"));
    if (!Array.isArray(script)) throw new VoiceoverError("el guion es un array [{text,…}]");
    const manifest = await runVoiceover({
      script,
      outDir: resolve(out),
      voice: opt(args, "--voice"),
      lang: opt(args, "--lang") ?? "es",
      dryRun: args.includes("--dry-run"),
    });
    const ok = manifest.segments.filter((s) => s.status === "ok").length;
    console.log(`voz: ${ok}/${manifest.segments.length} ok (${manifest.backend})`);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
