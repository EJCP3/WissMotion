import { describe, expect, it } from "vitest";
import { loadMotionPresets, presetAddSpec } from "./wissmotionPresets";

describe("wissmotionPresets", () => {
  it("expone los 9 tweens planos (escenas y compuestos quedan fuera)", () => {
    const presets = loadMotionPresets();
    expect(presets.map((p) => p.id).sort()).toEqual(
      [
        "blur-in",
        "blur-out",
        "fade-slide-out",
        "mask-reveal",
        "scale-fade",
        "slide-stack",
        "spring-pop",
        "stagger-words",
        "wipe",
      ].sort(),
    );
    for (const p of presets) {
      expect(p.duration).toBeGreaterThan(0);
      expect(p.ease.length).toBeGreaterThan(0);
    }
  });

  it("infiere fromTo/to y pasa vars intactas", () => {
    const byId = Object.fromEntries(loadMotionPresets().map((p) => [p.id, p]));
    expect(byId["mask-reveal"].method).toBe("fromTo");
    expect(presetAddSpec(byId["mask-reveal"])).toEqual({
      method: "fromTo",
      duration: 0.9,
      ease: "power3.out",
      properties: { clipPath: "inset(0 0% 0 0)" },
      fromProperties: { clipPath: "inset(0 100% 0 0)" },
    });
    expect(byId["fade-slide-out"].method).toBe("to");
    expect(presetAddSpec(byId["fade-slide-out"]).fromProperties).toBeUndefined();
    expect(byId["spring-pop"].properties).toEqual({ scale: 1, opacity: 1 });
  });
});
