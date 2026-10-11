// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from "vitest";
import {
  deleteSavedBrand,
  duplicateSavedBrand,
  listSavedBrands,
  saveNamedBrand,
} from "./brandLibrary";
import { DEFAULT_BRAND } from "./brandTypes";

const BRAND = { ...DEFAULT_BRAND, name: "Acme" };

beforeEach(() => localStorage.clear());

describe("brandLibrary", () => {
  it("empieza vacía y guarda validando", () => {
    expect(listSavedBrands()).toEqual([]);
    const brands = saveNamedBrand("Acme", BRAND);
    expect(brands).toHaveLength(1);
    expect(brands[0].name).toBe("Acme");
    expect(brands[0].brand.name).toBe("Acme");
    expect(typeof brands[0].updatedAt).toBe("string");
  });

  it("reemplaza al guardar el mismo nombre y ordena", () => {
    saveNamedBrand("B", BRAND);
    saveNamedBrand("A", BRAND);
    expect(listSavedBrands().map((b) => b.name)).toEqual(["A", "B"]);
    saveNamedBrand("A", { ...BRAND, tagline: "nuevo" });
    expect(listSavedBrands()).toHaveLength(2);
    expect(listSavedBrands().find((b) => b.name === "A")?.brand.tagline).toBe("nuevo");
  });

  it("rechaza sin nombre o marca inválida, y omite basura guardada", () => {
    expect(() => saveNamedBrand("  ", BRAND)).toThrow();
    expect(() => saveNamedBrand("X", { ...BRAND, name: "" })).toThrow();
    localStorage.setItem("wissmotion-studio:brands", JSON.stringify([{ name: "Rota" }, null, "x"]));
    expect(listSavedBrands()).toEqual([]);
  });

  it("duplica y elimina", () => {
    saveNamedBrand("Acme", BRAND);
    duplicateSavedBrand("Acme", "Acme 2");
    expect(
      listSavedBrands()
        .map((b) => b.name)
        .sort(),
    ).toEqual(["Acme", "Acme 2"]);
    expect(() => duplicateSavedBrand("Falta", "X")).toThrow();
    deleteSavedBrand("Acme");
    expect(listSavedBrands().map((b) => b.name)).toEqual(["Acme 2"]);
  });
});
