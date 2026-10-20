import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SYNTH,
  generateSynth,
  importMusic,
  listAudio,
  resolveAudio,
  synthArgs,
} from "./library.mjs";
import { musicFile } from "../film/film.mjs";

const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

describe("library.mjs (biblioteca de audio)", () => {
  it("synthArgs arma un lavfi estéreo 44.1k y rechaza nombres desconocidos", () => {
    const args = synthArgs("whoosh", "o.wav");
    assert.deepEqual(args.slice(-5), ["-ac", "2", "-ar", "44100", "o.wav"]);
    assert.match(args[args.indexOf("-i") + 1], /seed=7/);
    assert.throws(() => synthArgs("nope", "o.wav"), /desconocido/);
  });

  it("generateSynth solo crea lo que falta", () => {
    const dir = mkdtempSync(join(tmpdir(), "wm-audio-"));
    try {
      const calls = [];
      const fake = (_cmd, args) => {
        calls.push(args.at(-1));
        writeFileSync(args.at(-1), "x");
        return { status: 0 };
      };
      assert.equal(generateSynth(dir, fake).length, Object.keys(SYNTH).length);
      assert.equal(generateSynth(dir, fake).length, 0);
      assert.ok(calls.some((f) => f.endsWith(join("pads", "pad-calma.wav"))));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("importa música con mood y licencia, y la resuelve por nombre o mood", () => {
    const dir = mkdtempSync(join(tmpdir(), "wm-audio-"));
    try {
      const src = join(dir, "Mi Tema.mp3");
      writeFileSync(src, "fake");
      assert.throws(() => importMusic({ file: src, mood: "energico" }, dir), /license/);
      const entry = importMusic({ file: src, mood: "energico", license: "CC0" }, dir);
      assert.equal(entry.name, "mi-tema");
      assert.equal(listAudio(dir, { mood: "energico" }).length, 1);
      assert.equal(resolveAudio("mi-tema", dir), entry.file);
      assert.equal(resolveAudio("energico", dir), entry.file);
      assert.equal(resolveAudio("nada", dir), null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("film acepta música por mood de la biblioteca", { skip: !hasFfmpeg && "sin ffmpeg" }, () => {
    const dir = mkdtempSync(join(tmpdir(), "wm-audio-"));
    const prev = process.env.WISSMOTION_AUDIO_DIR;
    process.env.WISSMOTION_AUDIO_DIR = dir;
    try {
      assert.match(musicFile("calma", dir), /pad-calma\.wav$/);
      assert.throws(() => musicFile("inexistente", dir), /no encontrada/);
    } finally {
      if (prev === undefined) delete process.env.WISSMOTION_AUDIO_DIR;
      else process.env.WISSMOTION_AUDIO_DIR = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
