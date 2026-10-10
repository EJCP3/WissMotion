import { describe, expect, it } from "vitest";
import {
  COLOR_FIELDS,
  DEFAULT_BRAND,
  MOTION_PERSONALITIES,
  normalizeHex,
  validateBrandStructure,
} from "./brandTypes";

describe("brandTypes", () => {
  it("normaliza hex de 3 dígitos y rechaza lo demás", () => {
    expect(normalizeHex("#fff")).toBe("#ffffff");
    expect(normalizeHex("#6D28D9")).toBe("#6d28d9");
    expect(normalizeHex("  #0ea5e9  ")).toBe("#0ea5e9");
    expect(normalizeHex("morado")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("#gggggg")).toBeNull();
  });

  it("los 6 campos de color del esquema existen", () => {
    expect(COLOR_FIELDS).toEqual([
      "primary",
      "secondary",
      "accent",
      "background",
      "surface",
      "text",
    ]);
    for (const field of COLOR_FIELDS) {
      expect(normalizeHex(DEFAULT_BRAND.colors[field])).not.toBeNull();
    }
  });

  it("la marca por defecto es estructuralmente válida salvo el nombre", () => {
    expect(validateBrandStructure(DEFAULT_BRAND)).toEqual(["name"]);
  });

  it("marca inválidos con rutas de campo", () => {
    expect(validateBrandStructure(null)).toEqual(["$"]);
    expect(validateBrandStructure({ ...DEFAULT_BRAND, brandVersion: 2 })).toContain("brandVersion");
    expect(
      validateBrandStructure({
        ...DEFAULT_BRAND,
        name: "Acme",
        colors: { ...DEFAULT_BRAND.colors, primary: "no" },
      }),
    ).toEqual(["colors.primary"]);
    expect(
      validateBrandStructure({
        ...DEFAULT_BRAND,
        name: "Acme",
        fonts: { heading: "", body: "", weights: [] },
      }),
    ).toEqual(["fonts.heading", "fonts.body"]);
  });

  it("las personalidades cubren las 6 de la Fase 2", () => {
    expect(MOTION_PERSONALITIES).toEqual([
      "suave",
      "enérgico",
      "premium",
      "juguetón",
      "corporativo",
      "tech",
    ]);
  });
});
