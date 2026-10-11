// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateFromUrlDialog } from "./CreateFromUrlDialog";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BRAND = {
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

let mounted: { root: Root; host: HTMLElement } | null = null;
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  if (!mounted) return;
  const { root, host } = mounted;
  mounted = null;
  act(() => root.unmount());
  host.remove();
});

async function mountDialog(onOpenProject: (id: string) => void = () => {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mounted = { root, host };
  await act(async () =>
    root.render(
      <CreateFromUrlDialog targetId="p1" onClose={() => {}} onOpenProject={onOpenProject} />,
    ),
  );
  return host;
}

function setUrl(host: HTMLElement, value: string) {
  const input = host.querySelector('input[inputmode="url"]') as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return input;
}

function extractButton(host: HTMLElement): HTMLButtonElement {
  const buttons = [...host.querySelectorAll("button")];
  const found = buttons.find(
    (b) => b.textContent?.includes("Desde URL") || b.textContent?.includes("Extrayendo"),
  );
  if (!found) throw new Error("botón extraer no encontrado");
  return found as HTMLButtonElement;
}

describe("CreateFromUrlDialog", () => {
  it("pide URL y deshabilita extraer en vacío", async () => {
    const host = await mountDialog();
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(extractButton(host).disabled).toBe(true);
  });

  it("extrae, guarda la marca y abre el proyecto", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ brand: BRAND }) }) as Response),
    );
    const opened: string[] = [];
    const host = await mountDialog((id) => opened.push(id));
    await act(async () => {
      setUrl(host, "https://acme.test");
    });
    expect(extractButton(host).disabled).toBe(false);
    await act(async () => extractButton(host).click());
    expect(JSON.parse(localStorage.getItem("wissmotion-studio:brand:p1")!).name).toBe("Acme");
    expect(opened).toEqual(["p1"]);
  });

  it("muestra el error del servidor sin romper", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({ ok: false, status: 502, json: async () => ({ error: "caído" }) }) as Response,
      ),
    );
    const host = await mountDialog();
    await act(async () => {
      setUrl(host, "https://acme.test");
    });
    await act(async () => extractButton(host).click());
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("caído");
    expect(localStorage.getItem("wissmotion-studio:brand:p1")).toBeNull();
  });
});
