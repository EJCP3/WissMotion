// Biblioteca de audio (Fase 5): SFX y fondos sintetizados con FFmpeg (sin
// derechos: se generan aquí, deterministas) + música propia importada con
// mood y licencia. Vive en ~/.wissmotion/audio (o WISSMOTION_AUDIO_DIR).
//   node library.mjs --generate            crea sfx/ y pads/ si faltan
//   node library.mjs --list [--mood m]     lista todo (genera lo sintético si falta)
//   node library.mjs --import f.mp3 --mood energico --license CC0 [--source url] [--name n]
//   node library.mjs --resolve <nombre|mood>   ruta del archivo
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function audioDir(dir = process.env.WISSMOTION_AUDIO_DIR) {
  return resolve(dir ?? join(homedir(), ".wissmotion", "audio"));
}

// Cada sonido = un filtro lavfi. anoisesrc con semilla fija: mismo archivo siempre.
export const SYNTH = {
  click: { kind: "sfx", src: "sine=f=2200:d=0.04", af: "afade=t=out:st=0.004:d=0.036,volume=3.5" },
  pop: {
    kind: "sfx",
    src: "aevalsrc='0.8*sin(2*PI*(700*t-1800*t*t))*exp(-28*t)':d=0.18",
    af: "volume=1",
  },
  whoosh: {
    kind: "sfx",
    src: "anoisesrc=color=pink:d=0.9:seed=7:a=0.6",
    af: "highpass=f=250,lowpass=f=3500,afade=t=in:d=0.4:curve=exp,afade=t=out:st=0.4:d=0.5,volume=3",
  },
  riser: {
    kind: "sfx",
    src: "aevalsrc='0.45*sin(2*PI*(180*t+110*t*t))':d=2.2",
    af: "afade=t=in:d=2.1:curve=exp,afade=t=out:st=2.1:d=0.1",
  },
  impact: {
    kind: "sfx",
    src: "aevalsrc='0.9*sin(2*PI*52*t)*exp(-3.5*t)':d=1.4",
    af: "lowpass=f=400,volume=1.2",
  },
  ding: {
    kind: "sfx",
    src: "aevalsrc='0.45*(sin(2*PI*880*t)+0.5*sin(2*PI*1320*t))*exp(-2.8*t)':d=1.6",
    af: "volume=1",
  },
  "pad-calma": {
    kind: "pad",
    mood: "calma",
    src: "aevalsrc='0.12*(sin(2*PI*220*t)+sin(2*PI*261.63*t)+sin(2*PI*329.63*t))*(0.8+0.2*sin(2*PI*0.2*t))':d=30",
    af: "lowpass=f=1800,afade=t=in:d=2,afade=t=out:st=27:d=3",
  },
  "pad-brillante": {
    kind: "pad",
    mood: "brillante",
    src: "aevalsrc='0.12*(sin(2*PI*261.63*t)+sin(2*PI*329.63*t)+sin(2*PI*392*t))*(0.8+0.2*sin(2*PI*0.5*t))':d=30",
    af: "lowpass=f=2600,afade=t=in:d=1.5,afade=t=out:st=27:d=3",
  },
};

export function synthArgs(name, out) {
  const s = SYNTH[name];
  if (!s) throw new Error(`sonido sintético desconocido: ${name}`);
  return [
    "-v",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    s.src,
    "-af",
    s.af,
    "-ac",
    "2",
    "-ar",
    "44100",
    out,
  ];
}

function synthPath(dir, name) {
  return join(dir, SYNTH[name].kind === "pad" ? "pads" : "sfx", `${name}.wav`);
}

/** Genera los sintéticos que falten. Devuelve los creados. */
export function generateSynth(dir = audioDir(), run = spawnSync) {
  const made = [];
  for (const name of Object.keys(SYNTH)) {
    const out = synthPath(dir, name);
    if (existsSync(out)) continue;
    mkdirSync(join(out, ".."), { recursive: true });
    const r = run("ffmpeg", synthArgs(name, out), { encoding: "utf8" });
    if (r.status !== 0) throw new Error(`ffmpeg (${name}): ${r.stderr || r.error?.message}`);
    made.push(out);
  }
  return made;
}

function readIndex(dir) {
  const path = join(dir, "music", "index.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
}

export function importMusic({ file, mood, license, source, name }, dir = audioDir()) {
  if (!existsSync(file)) throw new Error(`no existe: ${file}`);
  if (!mood || !license)
    throw new Error("hacen falta --mood y --license (p. ej. CC0, CC-BY 4.0, propia)");
  const musicDir = join(dir, "music");
  mkdirSync(musicDir, { recursive: true });
  const id = (name ?? basename(file, extname(file))).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const dest = join(musicDir, `${id}${extname(file)}`);
  copyFileSync(file, dest);
  const entry = { name: id, kind: "music", mood, license, source: source ?? null, file: dest };
  const index = readIndex(dir).filter((e) => e.name !== id);
  index.push(entry);
  writeFileSync(join(musicDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  return entry;
}

/** Todo lo disponible: música importada + sintéticos generados. */
export function listAudio(dir = audioDir(), { mood } = {}) {
  const synth = Object.entries(SYNTH)
    .map(([name, s]) => ({
      name,
      kind: s.kind,
      mood: s.mood ?? null,
      license: "sintético (sin derechos)",
      file: synthPath(dir, name),
    }))
    .filter((e) => existsSync(e.file));
  const all = [...readIndex(dir), ...synth];
  return mood ? all.filter((e) => e.mood === mood) : all;
}

/** Ruta por nombre exacto, o la primera música/pad con ese mood. */
export function resolveAudio(query, dir = audioDir()) {
  const all = listAudio(dir);
  const hit =
    all.find((e) => e.name === query) ??
    all.find((e) => e.mood === query && e.kind === "music") ??
    all.find((e) => e.mood === query);
  return hit?.file ?? null;
}

function opt(args, name) {
  const i = args.indexOf(name);
  const v = i === -1 ? undefined : args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  try {
    if (args.includes("--generate")) {
      const made = generateSynth();
      console.log(made.length ? `creados:\n${made.join("\n")}` : "ya estaba todo generado");
    } else if (args.includes("--import")) {
      const entry = importMusic({
        file: resolve(opt(args, "--import") ?? ""),
        mood: opt(args, "--mood"),
        license: opt(args, "--license"),
        source: opt(args, "--source"),
        name: opt(args, "--name"),
      });
      console.log(`importada: ${entry.name} (${entry.mood}, ${entry.license})`);
    } else if (args.includes("--resolve")) {
      generateSynth();
      const file = resolveAudio(opt(args, "--resolve") ?? "");
      if (!file) throw new Error("no encontrado (mira --list)");
      console.log(file);
    } else {
      generateSynth();
      for (const e of listAudio(audioDir(), { mood: opt(args, "--mood") })) {
        console.log(
          `${e.kind.padEnd(5)} ${e.name.padEnd(16)} ${(e.mood ?? "-").padEnd(10)} ${e.license}`,
        );
      }
    }
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
