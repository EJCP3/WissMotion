// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAiChat } from "./useAiChat";
import { writeConfig } from "./providers";

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

function Probe({ onApi }: { onApi: (api: ReturnType<typeof useAiChat>) => void }) {
  const api = useAiChat("proj");
  onApi(api);
  return null;
}

async function mountChat() {
  let api!: ReturnType<typeof useAiChat>;
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mounted = { root, host };
  await act(async () => root.render(<Probe onApi={(a) => (api = a)} />));
  const rerender = async () => act(async () => root.render(<Probe onApi={(a) => (api = a)} />));
  return { get: () => api, rerender };
}

describe("useAiChat", () => {
  it("sin clave responde borrador local sin coste", async () => {
    writeConfig({ provider: "anthropic", model: "m", apiKey: "", baseUrl: "https://x" });
    const chat = await mountChat();
    await act(async () => chat.get().send("promo de mi app"));
    await chat.rerender();
    expect(chat.get().messages).toHaveLength(2);
    const reply = chat.get().messages[1];
    expect(reply.local).toBe(true);
    expect(reply.text).toContain("promo-app");
    expect(localStorage.getItem("wissmotion-studio:ai-usage")).toBeNull();
  });

  it("el límite bloquea proveedores de pago con mensaje", async () => {
    writeConfig({ provider: "openai", model: "gpt-4o-mini", apiKey: "K", baseUrl: "https://x" });
    localStorage.setItem(
      "wissmotion-studio:ai-usage",
      JSON.stringify({ inputTokens: 0, outputTokens: 0, usd: 99 }),
    );
    localStorage.setItem("wissmotion-studio:ai-limit-usd", "5");
    const chat = await mountChat();
    await act(async () => chat.get().send("hola"));
    await chat.rerender();
    expect(chat.get().messages[1].text).toContain("límite");
    expect(chat.get().messages[1].local).toBe(true);
  });

  it("éxito suma uso y persiste historial", async () => {
    writeConfig({ provider: "openai", model: "gpt-4o-mini", apiKey: "K", baseUrl: "https://x" });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              choices: [{ message: { content: "va" } }],
              usage: { prompt_tokens: 100, completion_tokens: 50 },
            }),
          }) as Response,
      ),
    );
    const chat = await mountChat();
    await act(async () => chat.get().send("hola"));
    await chat.rerender();
    expect(chat.get().messages[1]).toMatchObject({ text: "va", local: false });
    const usage = JSON.parse(localStorage.getItem("wissmotion-studio:ai-usage")!);
    expect(usage.inputTokens).toBe(100);
    expect(usage.usd).toBeCloseTo((100 * 0.15 + 50 * 0.6) / 1_000_000, 12);
    expect(JSON.parse(localStorage.getItem("wissmotion-studio:ai-chat:proj")!).length).toBe(2);
  });

  it("fallo del proveedor degrada a borrador con aviso", async () => {
    writeConfig({ provider: "openai", model: "gpt-4o-mini", apiKey: "K", baseUrl: "https://x" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" }) as Response),
    );
    const chat = await mountChat();
    await act(async () => chat.get().send("promo de mi app"));
    await chat.rerender();
    const reply = chat.get().messages[1];
    expect(reply.local).toBe(true);
    expect(reply.text).toContain("falló");
    expect(reply.text).toContain("promo-app");
  });
});
