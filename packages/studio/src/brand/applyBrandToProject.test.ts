import { describe, expect, it } from "vitest";
import { applyBrandToProject, rebrandHtml, rebrandVariablesJson } from "./applyBrandToProject";
import { DEFAULT_BRAND, type BrandV1 } from "./brandTypes";

const brand: BrandV1 = {
  ...DEFAULT_BRAND,
  name: "Acme",
  colors: { ...DEFAULT_BRAND.colors, primary: "#ff0000" },
  fonts: { ...DEFAULT_BRAND.fonts, heading: "Poppins" },
};

const html = `<html data-composition-variables='[{"id":"brandPrimary","type":"color","default":"#000000"},{"id":"title","type":"string","default":"Hola"}]'><head><title>x</title></head></html>`;

describe("applyBrandToProject", () => {
  it("hornea los defaults brand* y el link de fuentes, sin tocar el resto", () => {
    const out = rebrandHtml(html, brand);
    expect(out).toContain('"default":"#ff0000"');
    expect(out).toContain('"default":"Hola"');
    expect(out).toContain("family=Poppins");
  });

  it("deja igual una composición sin variables", () => {
    expect(rebrandHtml("<html><head></head></html>", brand)).toBe("<html><head></head></html>");
  });

  it("solo reemplaza las claves brand* que ya están en variables.json", () => {
    const out = JSON.parse(
      rebrandVariablesJson(JSON.stringify({ brandPrimary: "#000", title: "Hola" }), brand),
    );
    expect(out).toEqual({ brandPrimary: "#ff0000", title: "Hola" });
  });

  it("aplica a todas las composiciones, variables.json y crea brand.json", async () => {
    const disk = new Map<string, string>([
      ["index.html", "<html><head></head></html>"],
      ["compositions/a.html", html],
      ["variables.json", JSON.stringify({ brandPrimary: "#000", title: "Hola" })],
    ]);
    const edits: string[][] = [];
    const n = await applyBrandToProject({
      projectId: "p",
      brand,
      compositions: ["index.html", "compositions/a.html"],
      readFile: async (path) => {
        const v = disk.get(path);
        if (v === undefined) throw new Error("404");
        return v;
      },
      writeFile: async (path, content) => void disk.set(path, content),
      recordEdit: async (e) => void edits.push(Object.keys(e.files)),
    });
    expect(n).toBe(1);
    expect(edits).toEqual([["compositions/a.html", "variables.json"]]);
    expect(disk.get("compositions/a.html")).toContain("#ff0000");
    expect(JSON.parse(disk.get("variables.json") ?? "{}").brandPrimary).toBe("#ff0000");
    expect(JSON.parse(disk.get("brand.json") ?? "{}").name).toBe("Acme");
  });
});
