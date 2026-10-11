import { describe, expect, it } from "vitest";
import { WISSMOTION_TEMPLATES, parseTemplateVariables } from "./wissmotionTemplates";

describe("wissmotionTemplates", () => {
  it("expone las 12 plantillas con manifiesto, póster y variables", () => {
    expect(WISSMOTION_TEMPLATES).toHaveLength(12);
    const ids = WISSMOTION_TEMPLATES.map((t) => t.id).sort();
    expect(ids).toEqual([
      "antes-despues",
      "evento",
      "feature-highlight",
      "historia",
      "lanzamiento",
      "logo-sting",
      "oferta",
      "precios",
      "promo-app",
      "promo-web",
      "stats",
      "testimonios",
    ]);
    for (const t of WISSMOTION_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.html).toContain(t.id);
      expect(t.poster.length).toBeGreaterThan(0);
      expect(t.variables.length).toBeGreaterThanOrEqual(5);
      for (const v of t.variables) {
        expect(typeof v.id).toBe("string");
        expect(v.default).not.toBeUndefined();
      }
    }
  });

  it("parseTemplateVariables rechaza esquemas rotos", () => {
    expect(parseTemplateVariables("<html></html>")).toEqual([]);
    expect(() =>
      parseTemplateVariables(
        `<html data-composition-variables='[{"id":"a","type":"nope","default":1}]'>`,
      ),
    ).toThrow();
    expect(() =>
      parseTemplateVariables(`<html data-composition-variables='[{"id":"a","type":"string"}]'>`),
    ).toThrow();
  });
});
