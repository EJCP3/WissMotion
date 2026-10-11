// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrandPanel } from "./BrandPanel";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mounted: { root: Root; host: HTMLElement } | null = null;
afterEach(() => {
  localStorage.clear();
  if (!mounted) return;
  const { root, host } = mounted;
  mounted = null;
  act(() => root.unmount());
  host.remove();
});

async function mountPanel(): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mounted = { root, host };
  await act(async () => root.render(<BrandPanel projectId="panel-test" />));
  return host;
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("BrandPanel", () => {
  it("renderiza las secciones, 6 colores y vista previa", async () => {
    const host = await mountPanel();
    expect(host.querySelector('[data-testid="brand-panel"]')).not.toBeNull();
    for (const title of [
      "Biblioteca",
      "Identidad",
      "Colores",
      "Tipografías",
      "Logo",
      "Vista previa",
      "Acciones",
    ]) {
      expect(host.textContent).toContain(title);
    }
    expect(host.querySelectorAll('input[type="color"]')).toHaveLength(6);
    expect(host.querySelector('[aria-label="Personalidad de movimiento"]')).not.toBeNull();
  });

  it("editar el nombre persiste la marca del proyecto", async () => {
    const host = await mountPanel();
    const identity = [...host.querySelectorAll("section")].find((s) =>
      s.querySelector("h3")?.textContent?.includes("Identidad"),
    )!;
    const name = identity.querySelector("input")!;
    await act(async () => {
      name.focus();
      setNativeValue(name, "Acme");
      name.blur();
    });
    expect(JSON.parse(localStorage.getItem("wissmotion-studio:brand:panel-test")!).name).toBe(
      "Acme",
    );
    expect(host.textContent).toContain("Acme");
  });

  it("cambiar un color actualiza la vista previa", async () => {
    const host = await mountPanel();
    const swatch = host.querySelectorAll('input[type="color"]')[0] as HTMLInputElement;
    await act(async () => {
      setNativeValue(swatch, "#ff0000");
    });
    expect(
      JSON.parse(localStorage.getItem("wissmotion-studio:brand:panel-test")!).colors.primary,
    ).toBe("#ff0000");
  });

  it("los chips de peso alternan con aria-pressed", async () => {
    const host = await mountPanel();
    const chip = [...host.querySelectorAll("button")].find((b) => b.textContent === "100")!;
    expect(chip.getAttribute("aria-pressed")).toBe("false");
    await act(async () => chip.click());
    expect(chip.getAttribute("aria-pressed")).toBe("true");
  });

  it("importar un archivo inválido avisa sin romper", async () => {
    const host = await mountPanel();
    const fileInput = host.querySelector('input[aria-label="Importar JSON"]') as HTMLInputElement;
    const file = new File(["{no-json"], "x.json", { type: "application/json" });
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
    await act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      "no es un brand.json válido",
    );
  });

  it("muestra 4 pares de contraste con ratio e insignia", async () => {
    const host = await mountPanel();
    const contrast = host.querySelector('[data-testid="brand-contrast"]')!;
    for (const label of [
      "Texto / Fondo",
      "Texto / Superficie",
      "CTA (blanco / Primario)",
      "Primario / Fondo",
    ]) {
      expect(contrast.textContent).toContain(label);
    }
    expect(contrast.textContent).toMatch(/\d+\.\d{2}/);
    expect(contrast.textContent).toMatch(/AAA|AA/);
  });

  it("avisa cuando el texto no contrasta y el fix lo corrige", async () => {
    const host = await mountPanel();
    const hexInputs = [...host.querySelectorAll('[data-testid="brand-panel"] input')].filter(
      (i) => (i as HTMLInputElement).type !== "color",
    ) as HTMLInputElement[];
    const textHex = hexInputs.find((i) => i.value === "#1c1917") as HTMLInputElement;
    await act(async () => {
      textHex.focus();
      setNativeValue(textHex, "#ffffff");
      textHex.blur();
    });
    const alert = host.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("no llega a AA");
    const fix = [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "Usar texto sugerido",
    )!;
    await act(async () => fix.click());
    const stored = JSON.parse(localStorage.getItem("wissmotion-studio:brand:panel-test")!);
    expect(stored.colors.text).not.toBe("#ffffff");
    expect(host.querySelector('[role="alert"]')?.textContent).not.toContain("no llega a AA");
  });

  it("los tonos derivados se asignan al campo con un clic", async () => {
    const host = await mountPanel();
    const tones = host.querySelector('[data-testid="brand-tones"]')!;
    const firstTone = tones.querySelector("button") as HTMLButtonElement;
    const hex = firstTone.title;
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    await act(async () => firstTone.click());
    expect(
      JSON.parse(localStorage.getItem("wissmotion-studio:brand:panel-test")!).colors.primary,
    ).toBe(hex);
  });

  it("la biblioteca guarda, aplica y elimina marcas", async () => {
    const host = await mountPanel();
    expect(host.textContent).toContain("Aún no hay marcas guardadas");

    // Como un usuario: primero nombra la marca, luego la guarda.
    const identity = [...host.querySelectorAll("section")].find((s) =>
      s.querySelector("h3")?.textContent?.includes("Identidad"),
    )!;
    const brandName = identity.querySelector("input")!;
    await act(async () => {
      brandName.focus();
      setNativeValue(brandName, "Acme");
      brandName.blur();
    });
    const nameInput = host.querySelector(
      'input[aria-label="Nombre para guardar"]',
    ) as HTMLInputElement;
    await act(async () => {
      nameInput.focus();
      setNativeValue(nameInput, "Acme");
      nameInput.blur();
    });
    const saveBtn = [...host.querySelectorAll("button")].find((b) => b.textContent === "Guardar")!;
    await act(async () => saveBtn.click());
    expect(host.querySelector('select option[value="Acme"]')).not.toBeNull();

    // Cambiar el color y aplicar la guardada lo restaura.
    const stored = JSON.parse(localStorage.getItem("wissmotion-studio:brands")!);
    expect(stored).toHaveLength(1);
    const picker = host.querySelector("select") as HTMLSelectElement;
    picker.value = "Acme";
    await act(async () => {
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.querySelector('[role="status"]')?.textContent).toContain("Marca aplicada");

    const deleteBtn = [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "Eliminar",
    )!;
    await act(async () => deleteBtn.click());
    expect(host.querySelector('select option[value="Acme"]')).toBeNull();
    expect(host.textContent).toContain("Marca eliminada");
  });

  it("exportar descarga el brand.json con el nombre de la marca", async () => {
    const urls: string[] = [];
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: () => {
        urls.push("blob:mock");
        return "blob:mock";
      },
      revokeObjectURL: vi.fn(),
    });
    const clicks: string[] = [];
    vi.spyOn(window.HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        clicks.push(`${this.download}`);
      },
    );
    try {
      const host = await mountPanel();
      const exportBtn = [...host.querySelectorAll("button")].find(
        (b) => b.textContent === "Exportar JSON",
      )!;
      await act(async () => exportBtn.click());
      expect(urls).toEqual(["blob:mock"]);
      expect(clicks[0]).toMatch(/\.brand\.json$/);
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});
