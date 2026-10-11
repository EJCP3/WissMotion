// Subtítulos con estilos de la marca (Fase 5): SRT/VTT → ASS.
// El ASS viste la marca (fuente de titulares, color de texto, caja) y el
// reproductor/render lo quema sobre el video. Puro, sin dependencias.
//   node captions.mjs --in subs.srt --brand ../brand-kit/brand.example.json --out subs.ass [--shift 0.5] [--size 56]
import { readFile, writeFile } from "node:fs/promises";

export class CaptionsError extends Error {}

function toSeconds(h, m, s, frac) {
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(`0.${frac}`);
}

function parseTimeStamp(value, decimal) {
  const m = new RegExp(`^(\\d+):(\\d{2}):(\\d{2})[${decimal}](\\d{1,3})$`).exec(value.trim());
  if (!m) return null;
  return toSeconds(m[1], m[2], m[3], m[4].padEnd(3, "0"));
}

/** Parsea SRT o VTT a cues [{start, end, text}]. */
export function parseCues(input) {
  const text = input.replace(/^\uFEFF/, "");
  const isVtt = text.startsWith("WEBVTT");
  const blocks = text
    .split(/\r?\n\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (isVtt && lines[0].startsWith("WEBVTT")) lines.shift();
    if (lines.length === 0) continue;
    let arrow = 0;
    if (!lines[0].includes("-->")) {
      if (lines.length < 2 || !lines[1].includes("-->")) continue;
      arrow = 1;
    }
    const [from, to] = lines[arrow].split("-->");
    const start = parseTimeStamp(from, ",.");
    const end = parseTimeStamp(to, ",.");
    const words = lines
      .slice(arrow + 1)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (start === null || end === null || end <= start || !words) continue;
    cues.push({ start, end, text: words });
  }
  if (cues.length === 0) throw new CaptionsError("sin cues válidos (¿SRT/VTT?)");
  return cues;
}

function hexToAss(hex) {
  const h = hex.replace("#", "").toLowerCase();
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/.test(full)) throw new CaptionsError(`color inválido: ${hex}`);
  const r = full.slice(0, 2);
  const g = full.slice(2, 4);
  const b = full.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

function assTime(seconds) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = (s % 60).toFixed(2).padStart(5, "0");
  return `${h}:${String(m).padStart(2, "0")}:${rest}`;
}

function escapeAss(text) {
  return text.replace(/\{/g, "(").replace(/\}/g, ")");
}

/** Cues + marca → documento ASS completo. shift mueve tiempos (s, puede ser negativo). */
export function cuesToAss(cues, brand, { shift = 0, size = 56 } = {}) {
  const style =
    `Brand,${brand.fonts.heading},${size},&H00FFFFFF,${hexToAss(brand.colors.text)},` +
    `&H000000FF,&H96000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1`;
  const events = cues
    .map(
      (c) =>
        `Dialogue: 0,${assTime(c.start + shift)},${assTime(c.end + shift)},Brand,,0,0,0,,${escapeAss(c.text)}`,
    )
    .join("\n");
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1280",
    "PlayResY: 720",
    "WrapStyle: 2",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: ${style}`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    events,
    "",
  ].join("\n");
}

function opt(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

// Solo corre con --in (importarlo desde tests no hace nada).
if (process.argv.includes("--in")) {
  const args = process.argv.slice(2);
  try {
    const input = opt(args, "--in");
    const out = opt(args, "--out");
    const brandPath = opt(args, "--brand");
    if (!input || !out || !brandPath)
      throw new CaptionsError(
        "uso: --in subs.srt --brand marca.json --out subs.ass [--shift s] [--size n]",
      );
    const [subs, brandRaw] = await Promise.all([
      readFile(input, "utf8"),
      readFile(brandPath, "utf8"),
    ]);
    const brand = JSON.parse(brandRaw);
    const shift = Number(opt(args, "--shift") ?? 0);
    const size = Number(opt(args, "--size") ?? 56);
    if (!Number.isFinite(shift) || !Number.isFinite(size) || size <= 0) {
      throw new CaptionsError("--shift/--size numéricos (size > 0)");
    }
    await writeFile(out, cuesToAss(parseCues(subs), brand, { shift, size }), "utf8");
    console.log(`OK: ${out}`);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
