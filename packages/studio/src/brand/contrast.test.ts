import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  hexToRgb,
  requiredContrastRatio,
  rgbToHex,
  suggestCompliantForegroundColor,
  tonesOf,
  wcagRating,
  type Rgb,
} from "./contrast";
import {
  contrastRatio as cliRatio,
  relativeLuminance as cliLuminance,
  suggestCompliantForegroundColor as cliSuggest,
} from "../../../cli/src/commands/contrast-bg.js";
import { relativeLuminance } from "./contrast";

const PAIRS: [Rgb, Rgb][] = [
  [
    [0, 0, 0],
    [255, 255, 255],
  ],
  [
    [109, 40, 217],
    [250, 249, 247],
  ],
  [
    [28, 25, 23],
    [255, 255, 255],
  ],
  [
    [14, 165, 233],
    [28, 25, 23],
  ],
];

describe("contrast (espejo de cli/contrast-bg)", () => {
  it("coincide con el CLI en luminancia, ratio y sugerencia", () => {
    for (const [fg, bg] of PAIRS) {
      expect(relativeLuminance(fg)).toBe(cliLuminance(fg));
      expect(contrastRatio(fg, bg)).toBe(cliRatio(fg, bg));
      expect(suggestCompliantForegroundColor(fg, bg, 4.5)).toEqual(cliSuggest(fg, bg, 4.5));
    }
  });

  it("negro sobre blanco da 21 y un color consigo mismo da 1", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([109, 40, 217], [109, 40, 217])).toBeCloseTo(1, 5);
  });

  it("califica AAA / AA / AA-grande / falla en los umbrales", () => {
    expect(wcagRating(21)).toBe("aaa");
    expect(wcagRating(7)).toBe("aaa");
    expect(wcagRating(4.5)).toBe("aa");
    expect(wcagRating(3)).toBe("aa-large");
    expect(wcagRating(2.99)).toBe("fail");
    expect(requiredContrastRatio(false)).toBe(4.5);
    expect(requiredContrastRatio(true)).toBe(3);
  });

  it("la sugerencia siempre alcanza el ratio pedido", () => {
    for (const [fg, bg] of PAIRS) {
      const fixed = suggestCompliantForegroundColor(fg, bg, 4.5);
      expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(4.5);
    }
    // Gris medio sobre blanco se oscurece; gris oscuro sobre negro se aclara.
    expect(suggestCompliantForegroundColor([119, 119, 119], [255, 255, 255], 4.5)[0]).toBeLessThan(
      119,
    );
    expect(suggestCompliantForegroundColor([100, 100, 100], [0, 0, 0], 4.5)[0]).toBeGreaterThan(
      100,
    );
  });

  it("hexToRgb/rgbToHex redondean el viaje", () => {
    expect(hexToRgb("#6d28d9")).toEqual([109, 40, 217]);
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    expect(hexToRgb("no")).toBeNull();
    expect(rgbToHex([109, 40, 217])).toBe("#6d28d9");
  });

  it("tonesOf deriva 5 tonos con el color en el centro", () => {
    const tones = tonesOf("#6d28d9");
    expect(tones).toHaveLength(5);
    expect(tones[2]).toBe("#6d28d9");
    for (const tone of tones) expect(tone).toMatch(/^#[0-9a-f]{6}$/);
    expect(tonesOf("no")).toEqual([]);
  });
});
