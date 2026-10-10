// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { dictionaries, studioDefaultLang } from "./dictionaries";

describe("dictionaries", () => {
  it("el idioma por defecto del producto es español", () => {
    expect(studioDefaultLang).toBe("es");
  });

  it("es y en cubren exactamente las mismas claves", () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries.es).sort());
  });

  it("ninguna cadena queda vacía", () => {
    for (const lang of ["es", "en"] as const) {
      for (const [key, value] of Object.entries(dictionaries[lang])) {
        expect(value.trim().length, `${lang}:${key}`).toBeGreaterThan(0);
      }
    }
  });
});
