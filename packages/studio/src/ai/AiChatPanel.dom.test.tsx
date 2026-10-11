// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiChatPanel } from "./AiChatPanel";

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

async function mountPanel() {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mounted = { root, host };
  await act(async () => root.render(<AiChatPanel projectId="panel" />));
  return host;
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("AiChatPanel", () => {
  it("muestra config BYOK, medidor y estado vacío", async () => {
    const host = await mountPanel();
    expect(host.querySelector('[data-testid="ai-panel"]')).not.toBeNull();
    expect(host.textContent).toContain("Proveedor");
    expect(host.textContent).toContain("Uso:");
    expect(host.textContent).toContain("sin coste");
  });

  it("enviar sin clave responde borrador local y lo marca", async () => {
    const host = await mountPanel();
    const prompt = host.querySelector(
      'input[aria-label="Escribe tu mensaje…"]',
    ) as HTMLInputElement;
    await act(async () => {
      prompt.focus();
      setInput(prompt, "promo de mi app");
      prompt.blur();
    });
    // El blur commitea y auto-envía; espera al fallback local.
    for (let i = 0; i < 50 && !host.textContent?.includes("Borrador local"); i += 1) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });
    }
    expect(host.textContent).toContain("Borrador local");
    expect(host.textContent).toContain("promo-app");
  });

  it("cambiar de proveedor persiste la config", async () => {
    const host = await mountPanel();
    expect(localStorage.getItem("wissmotion-studio:ai-config")).toBeNull();
    const trigger = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Ollama"),
    ) as HTMLButtonElement;
    await act(async () => trigger.click());
    const option = [...document.querySelectorAll('[role="option"]')].find((o) =>
      o.textContent?.includes("OpenAI"),
    ) as HTMLElement;
    await act(async () => option.click());
    expect(JSON.parse(localStorage.getItem("wissmotion-studio:ai-config")!).provider).toBe(
      "openai",
    );
  });
});
