// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { draftScript, draftStoryboard, formatDraft, pickTemplate } from "./localDraft";

describe("localDraft", () => {
  it("elige plantilla por palabras clave y cae a feature-highlight", () => {
    expect(pickTemplate({ producto: "Mi app iOS" }).template).toBe("promo-app");
    expect(pickTemplate({ producto: "webinar de cocina" }).template).toBe("evento");
    expect(pickTemplate({ producto: "historia para reels" }).template).toBe("historia");
    expect(pickTemplate({ producto: "cosa rara sin pista" }).template).toBe("feature-highlight");
  });

  it("guion de 3 beats con segundos y storyboard con 3 escenas", () => {
    const beats = draftScript({ producto: "Acme", publico: "equipos" });
    expect(beats).toHaveLength(3);
    expect(beats.map((b) => b.escena)).toEqual([1, 2, 3]);
    expect(beats[1].texto).toContain("equipos");
    const { scenes } = draftStoryboard({ producto: "Acme" });
    expect(scenes).toHaveLength(3);
    expect(scenes[0].plantilla).toBe("logo-sting");
    expect(scenes[1].plantilla).toBe("feature-highlight");
  });

  it("el formato es determinista y menciona plantillas", () => {
    const a = formatDraft({ producto: "Acme" });
    expect(a).toBe(formatDraft({ producto: "Acme" }));
    expect(a).toContain("logo-sting");
    expect(a).toContain("[corporativo]");
  });
});
