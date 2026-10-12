import { describe, expect, it } from "vitest";
import { applyFormat, brandFontsLink } from "./templateFormats";
import { WISSMOTION_TEMPLATES } from "./wissmotionTemplates";

// Ruta en variable: el original es .mjs sin tipos y solo lo carga vitest.
const ORIGINAL = new URL("../../../../wissmotion/templates/formats.mjs", import.meta.url).href;
const FONTS = new URL("../../../../wissmotion/templates/fonts.mjs", import.meta.url).href;

describe("templateFormats", () => {
  it("es idéntico a wissmotion/templates/formats.mjs en todas las plantillas y formatos", async () => {
    const original: { applyFormat: (html: string, f: string) => string } = await import(
      /* @vite-ignore */ ORIGINAL
    );
    for (const template of WISSMOTION_TEMPLATES) {
      for (const format of template.formats) {
        expect(applyFormat(template.html, format)).toBe(
          original.applyFormat(template.html, format),
        );
      }
    }
  });

  it("brandFontsLink es idéntico a wissmotion/templates/fonts.mjs", async () => {
    const original: {
      brandFontsLink: (html: string, v: Record<string, unknown>, w?: number[]) => string;
    } = await import(/* @vite-ignore */ FONTS);
    const cases: Array<[Record<string, unknown>, number[] | undefined]> = [
      [{ brandHeading: "Sora", brandBody: "Inter" }, [400, 600]],
      [{ brandHeading: "Open Sans" }, undefined],
      [{}, undefined],
    ];
    for (const template of WISSMOTION_TEMPLATES) {
      for (const [values, weights] of cases) {
        expect(brandFontsLink(template.html, values, weights)).toBe(
          original.brandFontsLink(template.html, values, weights),
        );
      }
    }
  });

  it("las plantillas multiformato declaran 16:9, 9:16, 1:1 y 4:5", () => {
    const promo = WISSMOTION_TEMPLATES.find((t) => t.id === "promo-app");
    expect(promo?.formats).toEqual(["16:9", "9:16", "1:1", "4:5"]);
    const out = applyFormat(promo?.html ?? "", "9:16");
    expect(out).toContain('data-format="9:16"');
    expect(out).toContain('data-height="1920"');
  });
});
