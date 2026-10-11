// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bakeVariables,
  brandToTemplateDefaults,
  installWissmotionTemplate,
  mergeTemplateVariables,
} from "./wissmotionInstall";
import { WISSMOTION_TEMPLATES, parseTemplateVariables } from "./wissmotionTemplates";
import type { BrandV1 } from "../brand/brandTypes";

const BRAND: BrandV1 = {
  brandVersion: 1,
  name: "Acme",
  colors: {
    primary: "#111111",
    secondary: "#222222",
    accent: "#333333",
    background: "#ffffff",
    surface: "#eeeeee",
    text: "#000000",
  },
  fonts: { heading: "Sora", body: "Inter", weights: [400] },
};

const promoApp = WISSMOTION_TEMPLATES.find((t) => t.id === "promo-app")!;

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("wissmotionInstall", () => {
  it("brandToTemplateDefaults mapea colores, fuentes y textos (logo ausente se omite)", () => {
    const mapped = brandToTemplateDefaults(BRAND);
    expect(mapped.brandPrimary).toBe("#111111");
    expect(mapped.brandText).toBe("#000000");
    expect(mapped.brandHeading).toBe("Sora");
    expect(mapped.brandName).toBe("Acme");
    expect(mapped.brandLogo).toBeUndefined();
    expect(Object.keys(mapped).sort()).toEqual(
      [
        "brandAccent",
        "brandBackground",
        "brandBody",
        "brandHeading",
        "brandName",
        "brandPrimary",
        "brandSecondary",
        "brandSurface",
        "brandText",
      ].sort(),
    );
  });

  it("la marca rellena lo declarado y el contenido manda (aquí: defaults)", () => {
    const values = mergeTemplateVariables(promoApp, BRAND);
    expect(values.brandPrimary).toBe("#111111");
    expect(values.brandHeading).toBe("Sora");
    expect(values.brandName).toBe("Acme");
    expect(values.ctaLabel).toBe("Descargar gratis");
  });

  it("sin marca guardada quedan los defaults", () => {
    expect(mergeTemplateVariables(promoApp, null).brandPrimary).toBe("#6d28d9");
  });

  it("bakeVariables reescribe defaults y sigue parseando", () => {
    const baked = bakeVariables(promoApp.html, { brandName: "Acme", ctaLabel: "Ya" });
    expect(baked).toContain("Acme");
    const back = parseTemplateVariables(baked);
    expect(back.find((v) => v.id === "brandName")?.default).toBe("Acme");
    expect(back.find((v) => v.id === "ctaLabel")?.default).toBe("Ya");
    expect(back.find((v) => v.id === "feature1")?.default).toBe("Rápida y liviana");
  });

  it("instala HTML horneado + variables.json y devuelve la ruta", async () => {
    localStorage.setItem("wissmotion-studio:brand:p1", JSON.stringify(BRAND));
    const puts: { url: string; body: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        puts.push({ url: String(url), body: String(init?.body ?? "") });
        return new Response("ok", { status: 200 });
      }),
    );
    const compPath = await installWissmotionTemplate("p1", promoApp);
    expect(compPath).toBe("compositions/promo-app.html");
    expect(puts).toHaveLength(2);
    expect(puts[0].body).toContain("Acme");
    expect(JSON.parse(puts[1].body).brandPrimary).toBe("#111111");
  });

  it("reintenta el HTML en 409 y omite variables.json si existe", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const path = String(url);
        seen.push(path);
        if (path.includes("variables.json")) return new Response("x", { status: 409 });
        if (seen.filter((u) => !u.includes("variables.json")).length === 1) {
          return new Response("x", { status: 409 });
        }
        return new Response("ok", { status: 200 });
      }),
    );
    // variables.json: 50 intentos 409 → se omite sin romper.
    const compPath = await installWissmotionTemplate("p1", promoApp);
    expect(compPath).toBe("compositions/promo-app-2.html");
  });
});
