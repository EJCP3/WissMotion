// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NuevoVideoWizard } from "./NuevoVideoWizard";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

async function mountWizard(onOpenProject: (id: string, comp?: string) => void = () => {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mounted = { root, host };
  await act(async () =>
    root.render(
      <NuevoVideoWizard targetId="p1" onClose={() => {}} onOpenProject={onOpenProject} />,
    ),
  );
  return host;
}

function clickText(host: HTMLElement, text: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find((b) => b.textContent === text);
  if (!found) throw new Error(`botón no encontrado: ${text}`);
  return found as HTMLButtonElement;
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("NuevoVideoWizard", () => {
  it("recorre marca → plantilla → contenido y crea con la marca aplicada", async () => {
    localStorage.setItem(
      "wissmotion-studio:brands",
      JSON.stringify([
        {
          name: "Acme",
          brand: {
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
          },
          updatedAt: "2026-01-01",
        },
      ]),
    );
    const puts: { url: string; body: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        puts.push({ url: String(url), body: String(init?.body ?? "") });
        if (String(url) === "/api/projects" && init?.method === "POST") {
          return new Response(JSON.stringify({ id: "acme-historia" }), { status: 201 });
        }
        return new Response("ok", { status: 200 });
      }),
    );
    const opened: Array<{ id: string; comp?: string }> = [];
    const host = await mountWizard((id, comp) => opened.push({ id, comp }));

    // Paso 1: elegir marca.
    const brandSelect = host.querySelector(
      'select[aria-label="Marca (de la biblioteca)"]',
    ) as HTMLSelectElement;
    await act(async () => {
      brandSelect.value = "Acme";
      brandSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => clickText(host, "Siguiente").click());

    // Paso 2: elegir plantilla historia.
    const historia = [...host.querySelectorAll('[data-testid="wizard-templates"] button')].find(
      (b) => b.textContent?.includes("Historia corta"),
    ) as HTMLButtonElement;
    await act(async () => historia.click());
    await act(async () => clickText(host, "Siguiente").click());

    // Paso 3: editar el titular y crear.
    const title = host.querySelector('input[aria-label="Titular"]') as HTMLInputElement;
    await act(async () => {
      title.focus();
      setInput(title, "Hola mundo");
      title.blur();
    });
    await act(async () => clickText(host, "Crear video").click());

    // Borrador propio: POST /api/projects con el HTML + variables.json una sola vez.
    expect(puts).toHaveLength(2);
    expect(puts[0].url).toBe("/api/projects");
    const created = JSON.parse(puts[0].body) as { name: string; html: string };
    expect(created.name).toContain("Historia corta");
    expect(created.html).toContain("Hola mundo");
    expect(created.html).toContain("#111111");
    expect(puts[1].url).toContain("variables.json");
    expect(opened).toEqual([{ id: "acme-historia", comp: "index.html" }]);
  });

  it("si el servidor no crea proyectos (CLI), lo añade al proyecto actual", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        urls.push(String(url));
        if (String(url) === "/api/projects" && init?.method === "POST") {
          return new Response("{}", { status: 501 });
        }
        return new Response("ok", { status: 200 });
      }),
    );
    const opened: Array<{ id: string; comp?: string }> = [];
    const host = await mountWizard((id, comp) => opened.push({ id, comp }));
    await act(async () => clickText(host, "Siguiente").click());
    await act(async () => clickText(host, "Siguiente").click());
    await act(async () => clickText(host, "Crear video").click());
    expect(opened).toEqual([{ id: "p1", comp: "compositions/promo-app.html" }]);
    // variables.json se intenta una vez, sin copias numeradas.
    expect(
      urls.filter((u) => u.includes("variables")).every((u) => u.endsWith("variables.json")),
    ).toBe(true);
  });

  it("sin marca usa defaults y navega atrás", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok", { status: 200 })),
    );
    const host = await mountWizard();
    await act(async () => clickText(host, "Siguiente").click());
    await act(async () => clickText(host, "Siguiente").click());
    expect(host.textContent).toContain("Nombre de la app");
    await act(async () => clickText(host, "Atrás").click());
    expect(host.querySelector('[data-testid="wizard-templates"]')).not.toBeNull();
  });
});
