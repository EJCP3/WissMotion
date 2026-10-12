import { describe, expect, it } from "vitest";
import {
  REFERENCE_SHEETS,
  WISSMOTION_REFERENCES,
  buildReferenceBrief,
} from "./wissmotionReferences";

describe("wissmotionReferences", () => {
  it("cada ficha de references.json tiene su hoja importada y viceversa", () => {
    expect(Object.keys(REFERENCE_SHEETS).sort()).toEqual(
      WISSMOTION_REFERENCES.map((ref) => ref.id).sort(),
    );
    for (const ref of WISSMOTION_REFERENCES) expect(ref.sheet.length).toBeGreaterThan(0);
  });

  it("el brief lleva formato, técnicas, cómo recrear, faltas y la ficha", () => {
    const flight = WISSMOTION_REFERENCES.find((ref) => ref.id === "flight-tracker");
    if (!flight) throw new Error("falta flight-tracker");
    const brief = buildReferenceBrief(flight);
    expect(brief).toContain("«Flight Tracker (píldora → widget)» (16:9 / 9:16, 16.5 s)");
    expect(brief).toContain("presets morph-box");
    expect(brief).toContain("plantilla promo-app");
    expect(brief).toContain("mockups wm-phone");
    expect(brief).toContain('"flight-tracker"');
    // Con faltas (todas las reales están "lista" hoy): el brief las lista.
    const partial = { ...flight, status: "parcial" as const, missing: ["algo pendiente"] };
    expect(buildReferenceBrief(partial)).toContain(
      "Aún no existe en WissMotion (resuélvelo a mano): algo pendiente",
    );
  });

  it("una referencia lista no menciona faltas", () => {
    const ready = WISSMOTION_REFERENCES.find((ref) => ref.id === "mascara-negativa");
    if (!ready) throw new Error("falta mascara-negativa");
    expect(buildReferenceBrief(ready)).not.toContain("Aún no existe");
  });
});
