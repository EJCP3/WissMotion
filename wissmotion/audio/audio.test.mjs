import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CaptionsError, cuesToAss, parseCues } from "./captions.mjs";
import { BeatMarksError, beatsToMarks } from "./beat-marks.mjs";
import { buildTtsArgs, checkTtsBackend, runVoiceover } from "./voiceover.mjs";

const BRAND = {
  colors: { text: "#1c1917" },
  fonts: { heading: "Sora", body: "Inter" },
};

const SRT = `1
00:00:01,000 --> 00:00:03,500
Hola mundo

2
00:00:04,000 --> 00:00:06,000
Segunda línea
con dos versos
`;

const VTT = `WEBVTT

00:00:01.000 --> 00:00:02.500
Hola mundo
`;

describe("captions.mjs (SRT/VTT → ASS con marca)", () => {
  it("parsea SRT multilínea y VTT", () => {
    const cues = parseCues(SRT);
    assert.equal(cues.length, 2);
    assert.deepEqual([cues[0].start, cues[0].end], [1, 3.5]);
    assert.equal(cues[1].text, "Segunda línea con dos versos");
    const vtt = parseCues(VTT);
    assert.equal(vtt.length, 1);
    assert.deepEqual([vtt[0].start, vtt[0].end], [1, 2.5]);
  });

  it("rechaza basura y cues invertidos", () => {
    assert.throws(() => parseCues("hola"), CaptionsError);
    assert.throws(() => parseCues("1\n00:00:05,000 --> 00:00:02,000\nX\n"), CaptionsError);
  });

  it("el ASS viste fuente y color de la marca (BGR) con shift", () => {
    const ass = cuesToAss(parseCues(SRT), BRAND, { shift: 0.5, size: 56 });
    assert.ok(ass.includes("Style: Brand,Sora,56"), "fuente y tamaño");
    assert.ok(ass.includes("&H0017191C"), "#1c1917 en BGR");
    assert.ok(ass.includes("Dialogue: 0,0:00:01.50,0:00:04.00"), "shift +0.5");
    assert.ok(ass.includes("Dialogue: 0,0:00:04.50,0:00:06.50"), "segundo cue");
  });

  it("color inválido y shift NaN fallan legible", () => {
    assert.throws(
      () => cuesToAss(parseCues(SRT), { colors: { text: "morado" }, fonts: BRAND.fonts }),
      CaptionsError,
    );
  });
});

describe("beat-marks.mjs", () => {
  it("120 bpm exactos dan cortes cada 8 beats", () => {
    const beats = Array.from({ length: 33 }, (_, i) => i * 0.5);
    const marks = beatsToMarks(beats, { every: 8, offset: 0 });
    assert.equal(marks.bpm, 120);
    assert.deepEqual(marks.cuts, [0, 4, 8, 12, 16]);
  });

  it("offset desplaza y every inválido falla", () => {
    const beats = Array.from({ length: 17 }, (_, i) => i * 0.5);
    assert.deepEqual(beatsToMarks(beats, { every: 4, offset: 2 }).cuts, [1, 3, 5, 7]);
    assert.throws(() => beatsToMarks(beats, { every: 0 }), BeatMarksError);
    assert.throws(() => beatsToMarks([1], {}), BeatMarksError);
  });
});

describe("voiceover.mjs", () => {
  it("buildTtsArgs arma el comando con voz/idioma/velocidad", () => {
    assert.deepEqual(
      buildTtsArgs({
        text: "Hola",
        out: "/a/vo.wav",
        voice: "af_heart",
        lang: "es",
        speed: 1.1,
        cli: "hf",
      }),
      [
        "hf",
        "tts",
        "Hola",
        "-o",
        "/a/vo.wav",
        "--voice",
        "af_heart",
        "--lang",
        "es",
        "--speed",
        "1.1",
      ],
    );
  });

  it("backend ausente se detecta sin correr nada", () => {
    const fake = () => ({
      status: 1,
      stdout: "",
      stderr: "ModuleNotFoundError: No module named 'kokoro'",
    });
    const backend = checkTtsBackend(fake, "hf");
    assert.equal(backend.ok, false);
    assert.ok(backend.hint.includes("pip install"));
  });

  it("runVoiceover dry-run escribe manifiesto sin renderizar", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const out = await mkdtemp(join(tmpdir(), "wissmotion-vo-"));
    const calls = [];
    const manifest = await runVoiceover({
      script: [
        { id: "intro", text: "Hola" },
        { text: "Adiós", voice: "am_adam" },
      ],
      outDir: out,
      lang: "es",
      dryRun: true,
      probeTts: false,
      run: (...args) => {
        calls.push(args);
        return { status: 0 };
      },
    });
    assert.equal(calls.length, 0);
    assert.equal(manifest.segments.length, 2);
    assert.equal(manifest.segments[0].status, "dry-run");
    assert.ok(manifest.segments[0].args.includes("Hola"));
    assert.ok(manifest.segments[1].args.includes("am_adam"));
    const { rm } = await import("node:fs/promises");
    await rm(out, { recursive: true, force: true });
  });
});
