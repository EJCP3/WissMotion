// Proveedores BYOK para la IA del Studio (Fase 7): el usuario trae su clave
// (o su servidor local); nada sale del navegador salvo al proveedor elegido.
// Sin clave configurada, el chat usa el generador local determinista
// (localDraft.ts): degradación elegante, siempre funcional sin tokens.

import { studioApiFetch } from "../utils/studioApiFetch";

export type ProviderId = "anthropic" | "openai" | "openrouter" | "gemini" | "ollama" | "lmstudio";

export interface ProviderModel {
  id: string;
  label: string;
  /** USD por millón de tokens [input, output]. 0 = local/gratis. */
  pricePerM: [number, number];
}

export interface ProviderDef {
  id: ProviderId;
  label: string;
  models: ProviderModel[];
  defaultBaseUrl: string;
  needsKey: boolean;
  hint: string;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "anthropic",
    label: "Anthropic Claude",
    models: [
      { id: "claude-sonnet-4-20250514", label: "Sonnet 4", pricePerM: [3, 15] },
      { id: "claude-3-5-haiku-20241022", label: "Haiku 3.5", pricePerM: [0.8, 4] },
    ],
    defaultBaseUrl: "https://api.anthropic.com",
    needsKey: true,
    hint: "console.anthropic.com",
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini", pricePerM: [0.15, 0.6] },
      { id: "gpt-4o", label: "GPT-4o", pricePerM: [2.5, 10] },
    ],
    defaultBaseUrl: "https://api.openai.com",
    needsKey: true,
    hint: "platform.openai.com",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    models: [{ id: "auto", label: "Auto (elige el modelo en su web)", pricePerM: [0, 0] }],
    defaultBaseUrl: "https://openrouter.ai",
    needsKey: true,
    hint: "openrouter.ai/keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    models: [
      { id: "gemini-2.0-flash", label: "Flash 2.0", pricePerM: [0.1, 0.4] },
      { id: "gemini-2.5-pro", label: "Pro 2.5", pricePerM: [1.25, 10] },
    ],
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    needsKey: true,
    hint: "aistudio.google.com/apikey",
  },
  {
    id: "ollama",
    label: "Ollama (local, gratis)",
    models: [{ id: "llama3.1", label: "llama3.1", pricePerM: [0, 0] }],
    defaultBaseUrl: "http://localhost:11434",
    needsKey: false,
    hint: "ollama serve + ollama pull llama3.1",
  },
  {
    id: "lmstudio",
    label: "LM Studio (local, gratis)",
    models: [{ id: "local-model", label: "Modelo cargado", pricePerM: [0, 0] }],
    defaultBaseUrl: "http://localhost:1234",
    needsKey: false,
    hint: "servidor OpenAI-compatible de LM Studio",
  },
];

export interface ProviderConfig {
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
}

export const AI_CONFIG_KEY = "wissmotion-studio:ai-config";
export const AI_USAGE_KEY = "wissmotion-studio:ai-usage";

export function defaultConfig(): ProviderConfig {
  return { provider: "ollama", model: "llama3.1", apiKey: "", baseUrl: "http://localhost:11434" };
}

export function readConfig(): ProviderConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return defaultConfig();
    const parsed = JSON.parse(raw) as Partial<ProviderConfig>;
    const def = PROVIDERS.find((p) => p.id === parsed.provider);
    if (!def) return defaultConfig();
    return {
      provider: def.id,
      model: def.models.some((m) => m.id === parsed.model)
        ? (parsed.model as string)
        : def.models[0].id,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      baseUrl:
        typeof parsed.baseUrl === "string" && parsed.baseUrl ? parsed.baseUrl : def.defaultBaseUrl,
    };
  } catch {
    return defaultConfig();
  }
}

export function writeConfig(config: ProviderConfig): void {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Sin persistencia el chat sigue con la config en memoria.
  }
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  usd: number;
}

export function readUsage(): UsageTotals {
  try {
    const raw = localStorage.getItem(AI_USAGE_KEY);
    if (!raw) return { inputTokens: 0, outputTokens: 0, usd: 0 };
    const parsed = JSON.parse(raw) as Partial<UsageTotals>;
    return {
      inputTokens: Number(parsed.inputTokens) || 0,
      outputTokens: Number(parsed.outputTokens) || 0,
      usd: Number(parsed.usd) || 0,
    };
  } catch {
    return { inputTokens: 0, outputTokens: 0, usd: 0 };
  }
}

export function addUsage(
  inputTokens: number,
  outputTokens: number,
  pricePerM: [number, number],
): UsageTotals {
  const totals = readUsage();
  totals.inputTokens += inputTokens;
  totals.outputTokens += outputTokens;
  totals.usd += (inputTokens * pricePerM[0] + outputTokens * pricePerM[1]) / 1_000_000;
  try {
    localStorage.setItem(AI_USAGE_KEY, JSON.stringify(totals));
  } catch {
    // Medidor best-effort.
  }
  return totals;
}

/** ~4 caracteres por token (estimación para el medidor antes de responder). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  // studioApiFetch solo añade credentials omit/same-origin: en cross-origin
  // no viaja ninguna credencial y cumple la regla no-restricted-* del repo.
  const response = await studioApiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`proveedor ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`);
  }
  return response.json();
}

/**
 * Completa un prompt con el proveedor configurado. Devuelve texto + uso
 * estimado (los proveedores OpenAI-compatibles no siempre reportan uso, así
 * que el medidor estima por longitud).
 */
export async function generateWithProvider(
  config: ProviderConfig,
  system: string,
  prompt: string,
): Promise<GenerateResult> {
  const base = config.baseUrl.replace(/\/$/, "");
  const inputTokens = estimateTokens(system + prompt);
  if (config.provider === "anthropic") {
    if (!config.apiKey) throw new Error("falta la clave de Anthropic");
    const data = (await postJson(
      `${base}/v1/messages`,
      {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      {
        model: config.model,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: prompt }],
      },
    )) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.map((b) => b.text ?? "").join("") ?? "";
    return {
      text,
      inputTokens: data.usage?.input_tokens ?? inputTokens,
      outputTokens: data.usage?.output_tokens ?? estimateTokens(text),
    };
  }
  if (config.provider === "gemini") {
    if (!config.apiKey) throw new Error("falta la clave de Gemini");
    const data = (await postJson(
      `${base}/v1beta/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
      {},
      {
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: prompt }] }],
      },
    )) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text =
      data.candidates
        ?.map((c) => c.content?.parts?.map((p) => p.text ?? "").join("") ?? "")
        .join("") ?? "";
    return { text, inputTokens, outputTokens: estimateTokens(text) };
  }
  // OpenAI-compatibles: OpenAI, OpenRouter, Ollama, LM Studio.
  const headers: Record<string, string> = {};
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  const data = (await postJson(`${base}/v1/chat/completions`, headers, {
    model: config.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  })) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return {
    text,
    inputTokens: data.usage?.prompt_tokens ?? inputTokens,
    outputTokens: data.usage?.completion_tokens ?? estimateTokens(text),
  };
}
