import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { WISSMOTION_TEMPLATES, parseTemplateVariables } from "./wissmotionTemplates";
import { TEMPLATE_HTML } from "./wissmotionTemplates.generated";

describe("wissmotionTemplates", () => {
  it("expone las 17 plantillas con manifiesto, póster y variables", () => {
    expect(WISSMOTION_TEMPLATES).toHaveLength(17);
    const ids = WISSMOTION_TEMPLATES.map((t) => t.id).sort();
    expect(ids).toEqual([
      "antes-despues",
      "evento",
      "feature-highlight",
      "fichas-logo",
      "historia",
      "lanzamiento",
      "lista-cinetica",
      "logo-sting",
      "oferta",
      "palabra",
      "precios",
      "promo-app",
      "promo-web",
      "ruleta-colores",
      "stats",
      "tabla-ui",
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

  it("el HTML generado está al día con wissmotion/templates (corre sync-templates.mjs si falla)", () => {
    for (const t of WISSMOTION_TEMPLATES) {
      const disk = readFileSync(
        new URL(`../../../../wissmotion/templates/${t.id}/index.html`, import.meta.url),
        "utf8",
      );
      expect(TEMPLATE_HTML[t.id], t.id).toBe(disk);
    }
  });
});
