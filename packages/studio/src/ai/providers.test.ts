// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addUsage,
  defaultConfig,
  estimateTokens,
  generateWithProvider,
  readConfig,
  readUsage,
  writeConfig,
  type ProviderConfig,
} from "./providers";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

function okJson(payload: unknown) {
  return { ok: true, json: async () => payload } as Response;
}

describe("providers", () => {
  it("config por defecto es Ollama local y persiste", () => {
    expect(readConfig()).toEqual(defaultConfig());
    writeConfig({
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "k",
      baseUrl: "https://x.test",
    });
    expect(readConfig().model).toBe("gpt-4o-mini");
  });

  it("config rota o modelo ajeno cae a defaults", () => {
    localStorage.setItem("wissmotion-studio:ai-config", "{no-json");
    expect(readConfig()).toEqual(defaultConfig());
    writeConfig({ provider: "openai", model: "inexistente", apiKey: "", baseUrl: "" });
    const back = readConfig();
    expect(back.model).toBe("gpt-4o-mini");
    expect(back.baseUrl).toBe("https://api.openai.com");
  });

  it("el medidor suma tokens y USD", () => {
    expect(readUsage()).toEqual({ inputTokens: 0, outputTokens: 0, usd: 0 });
    const totals = addUsage(1000, 500, [3, 15]);
    expect(totals.inputTokens).toBe(1000);
    expect(totals.usd).toBeCloseTo((1000 * 3 + 500 * 15) / 1_000_000, 10);
    expect(estimateTokens("hola")).toBe(1);
    expect(estimateTokens("a".repeat(40))).toBe(10);
  });

  it("anthropic: URL, headers y uso reportado", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        return okJson({
          content: [{ text: "hola" }],
          usage: { input_tokens: 10, output_tokens: 5 },
        });
      }),
    );
    const config: ProviderConfig = {
      provider: "anthropic",
      model: "m",
      apiKey: "k",
      baseUrl: "https://api.anthropic.com/",
    };
    const result = await generateWithProvider(config, "sys", "hi");
    expect(calls[0].url).toBe("https://api.anthropic.com/v1/messages");
    expect((calls[0].init.headers as Record<string, string>)["x-api-key"]).toBe("k");
    expect(result).toEqual({ text: "hola", inputTokens: 10, outputTokens: 5 });
  });

  it("anthropic sin clave y error HTTP con mensaje", async () => {
    const noKey: ProviderConfig = {
      provider: "anthropic",
      model: "m",
      apiKey: "",
      baseUrl: "https://x",
    };
    await expect(generateWithProvider(noKey, "s", "p")).rejects.toThrow(/clave/);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401, text: async () => "bad key" }) as Response),
    );
    await expect(generateWithProvider({ ...noKey, apiKey: "k" }, "s", "p")).rejects.toThrow(
      /401.*bad key/,
    );
  });

  it("openai-compatible manda Authorization solo con clave y estima uso", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(JSON.stringify((init?.headers as Record<string, string>) ?? {}));
        return okJson({ choices: [{ message: { content: "yo" } }] });
      }),
    );
    const result = await generateWithProvider(
      { provider: "ollama", model: "llama3.1", apiKey: "", baseUrl: "http://localhost:11434" },
      "sys",
      "hola mundo",
    );
    expect(result.text).toBe("yo");
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(calls[0]).not.toContain("Bearer");
    await generateWithProvider(
      { provider: "openai", model: "gpt-4o-mini", apiKey: "K", baseUrl: "https://x.test" },
      "sys",
      "hi",
    );
    expect(calls[1]).toContain("Bearer K");
  });

  it("gemini usa generateContent con key en query", async () => {
    let seen = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        seen = String(url);
        return okJson({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
      }),
    );
    const result = await generateWithProvider(
      { provider: "gemini", model: "gemini-2.0-flash", apiKey: "K", baseUrl: "https://g.test" },
      "s",
      "p",
    );
    expect(seen).toContain("gemini-2.0-flash:generateContent?key=K");
    expect(result.text).toBe("ok");
  });
});
