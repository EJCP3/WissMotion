// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiBriefFlow } from "./AiBriefFlow";

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

async function mountFlow(onOpenProject: (id: string, comp?: string) => void = () => {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mounted = { root, host };
  await act(async () => root.render(<AiBriefFlow projectId="p1" onOpenProject={onOpenProject} />));
  return host;
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function clickText(host: HTMLElement, text: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find((b) => b.textContent === text);
  if (!found) throw new Error(`botón no encontrado: ${text}`);
  return found as HTMLButtonElement;
}

describe("AiBriefFlow", () => {
  it("genera guion, deja cambiar plantilla y crea 3 composiciones", async () => {
    const puts: { url: string; body: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        puts.push({ url: String(url), body: String(init?.body ?? "") });
        return new Response("ok", { status: 200 });
      }),
    );
    const opened: Array<{ id: string; comp?: string }> = [];
    const host = await mountFlow((id, comp) => opened.push({ id, comp }));

    const product = host.querySelector('input[placeholder="Mi App"]') as HTMLInputElement;
    await act(async () => {
      product.focus();
      setInput(product, "Mi app");
      product.blur();
    });
    await act(async () => clickText(host, "Generar guion").click());
    const beat1 = host.querySelector('input[aria-label="Texto 1"]') as HTMLInputElement;
    expect(beat1.value).toContain("por fin sin fricción");
    expect(host.textContent).toContain("Intro de logo");

    await act(async () => clickText(host, "Crear composiciones").click());
    const htmlPuts = puts.filter(
      (p) => p.url.includes("/files/") && p.body.includes("data-composition-id"),
    );
    expect(htmlPuts).toHaveLength(3);
    const film = puts.find((p) => p.url.includes("pelicula.json"));
    expect(JSON.parse(film?.body ?? "{}")).toMatchObject({ name: "mi-app", format: "16:9" });
    expect(JSON.parse(film?.body ?? "{}").scenes).toHaveLength(3);
    expect(opened).toEqual([{ id: "p1", comp: "compositions/escena-1-logo-sting.html" }]);
    expect(host.textContent).toContain("Composiciones creadas");
  });

  it("exige producto para generar", async () => {
    const host = await mountFlow();
    expect(host.querySelector("button")).not.toBeNull();
    const generate = [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "Generar guion",
    ) as HTMLButtonElement;
    expect(generate.disabled).toBe(true);
  });
});
