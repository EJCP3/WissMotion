// Marcas de corte al beat (Fase 5): beats/<audio>.json del CLI (`hyperframes
// beats`) → cortes sugeridos cada N beats + BPM. Puro, sin dependencias.
//   node beat-marks.mjs --beats beats/musica.json --out marks.json [--every 8] [--offset 0]
import { readFile, writeFile } from "node:fs/promises";

export class BeatMarksError extends Error {}

/** beats.json (tiempos en s) → {bpm, cuts[]} con un corte cada `every` beats desde `offset`. */
export function beatsToMarks(beats, { every = 8, offset = 0 } = {}) {
  if (!Number.isInteger(every) || every <= 0) throw new BeatMarksError("--every entero positivo");
  const times = (Array.isArray(beats) ? beats : (beats.beats ?? beats.times ?? []))
    .map(Number)
    .filter((t) => Number.isFinite(t) && t >= 0)
    .sort((a, b) => a - b);
  if (times.length < 2) throw new BeatMarksError("beats insuficientes (¿beats/<audio>.json?)");
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  const median = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  const bpm = 60 / median;
  const cuts = times.filter((_, i) => (i - offset) % every === 0 && i >= offset);
  return { bpm: Math.round(bpm * 10) / 10, beatInterval: Math.round(median * 1000) / 1000, cuts };
}

function opt(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

// Solo corre con --beats (importarlo desde tests no hace nada).
if (process.argv.includes("--beats")) {
  const args = process.argv.slice(2);
  try {
    const beatsPath = opt(args, "--beats");
    const out = opt(args, "--out");
    if (!beatsPath || !out)
      throw new BeatMarksError(
        "uso: --beats beats/musica.json --out marks.json [--every 8] [--offset 0]",
      );
    const beats = JSON.parse(await readFile(beatsPath, "utf8"));
    const every = Number(opt(args, "--every") ?? 8);
    const offset = Number(opt(args, "--offset") ?? 0);
    const marks = beatsToMarks(beats, { every, offset });
    await writeFile(out, `${JSON.stringify(marks, null, 2)}\n`, "utf8");
    console.log(`OK: ${out} (${marks.bpm} bpm, ${marks.cuts.length} cortes)`);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
