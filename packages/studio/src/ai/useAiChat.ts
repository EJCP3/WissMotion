import { useCallback, useState } from "react";
import {
  PROVIDERS,
  addUsage,
  estimateTokens,
  generateWithProvider,
  readConfig,
  readUsage,
  writeConfig,
  type ProviderConfig,
  type UsageTotals,
} from "./providers";
import { formatDraft } from "./localDraft";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  local: boolean;
}

const TRANSCRIPT_PREFIX = "wissmotion-studio:ai-chat:";
const LIMIT_KEY = "wissmotion-studio:ai-limit-usd";
export const DEFAULT_LIMIT_USD = 5;

const SYSTEM_PROMPT = [
  "Eres el asistente de video de WissMotion (español).",
  "Ayudas a crear promos: pide marca, plantilla y contenido si faltan.",
  "Plantillas: promo-app, promo-web, logo-sting, feature-highlight, stats, testimonios, oferta, precios, evento, lanzamiento, antes-despues, historia.",
  "Responde breve y con pasos accionables. Sin código salvo que lo pidan.",
].join(" ");

function transcriptKey(projectId: string): string {
  return `${TRANSCRIPT_PREFIX}${projectId}`;
}

function readTranscript(projectId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(transcriptKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed.slice(-100) : [];
  } catch {
    return [];
  }
}

export function readLimitUsd(): number {
  try {
    const raw = Number(localStorage.getItem(LIMIT_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LIMIT_USD;
  } catch {
    return DEFAULT_LIMIT_USD;
  }
}

/**
 * Chat con BYOK + medidor + degradación local. Sin clave (o si el proveedor
 * falla), responde con el borrador determinista en vez de romperse.
 */
export function useAiChat(projectId: string) {
  const [config, setConfigState] = useState<ProviderConfig>(readConfig);
  const [messages, setMessages] = useState<ChatMessage[]>(() => readTranscript(projectId));
  const [usage, setUsage] = useState<UsageTotals>(readUsage);
  const [limitUsd, setLimitUsdState] = useState<number>(readLimitUsd);
  const [sending, setSending] = useState(false);

  const persist = useCallback(
    (next: ChatMessage[]) => {
      setMessages(next);
      try {
        localStorage.setItem(transcriptKey(projectId), JSON.stringify(next.slice(-100)));
      } catch {
        // Historial opcional.
      }
    },
    [projectId],
  );

  const setConfig = useCallback((next: ProviderConfig) => {
    setConfigState(next);
    writeConfig(next);
  }, []);

  const setLimitUsd = useCallback((next: number) => {
    const value = Number.isFinite(next) && next > 0 ? next : DEFAULT_LIMIT_USD;
    setLimitUsdState(value);
    try {
      localStorage.setItem(LIMIT_KEY, String(value));
    } catch {
      // Límite en memoria.
    }
  }, []);

  const clear = useCallback(() => persist([]), [persist]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setSending(true);
      const userTurn: ChatMessage = { role: "user", text: trimmed, local: false };
      const history = [...messages, userTurn];
      persist(history);
      try {
        const def = PROVIDERS.find((p) => p.id === config.provider) ?? PROVIDERS[0];
        if (def.needsKey && !config.apiKey) throw new Error("sin-clave");
        if (usage.usd >= limitUsd && def.models[0].pricePerM[0] + def.models[0].pricePerM[1] > 0) {
          throw new Error("limite");
        }
        const model = def.models.find((m) => m.id === config.model) ?? def.models[0];
        const result = await generateWithProvider(config, SYSTEM_PROMPT, trimmed);
        const totals = addUsage(result.inputTokens, result.outputTokens, model.pricePerM);
        setUsage(totals);
        persist([
          ...history,
          { role: "assistant", text: result.text || "(respuesta vacía)", local: false },
        ]);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "";
        const fallback =
          reason === "sin-clave"
            ? "Sin clave configurada: te dejo un borrador local (sin coste) mientras la pones abajo."
            : reason === "limite"
              ? "Llegaste al límite de gasto: sube el tope o sigue con el borrador local."
              : "El proveedor falló: te dejo el borrador local para no frenarte.";
        persist([
          ...history,
          {
            role: "assistant",
            text: `${fallback}\n\n${formatDraft({ producto: trimmed })}`,
            local: true,
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [config, limitUsd, messages, persist, sending, usage.usd],
  );

  return {
    config,
    setConfig,
    messages,
    usage,
    limitUsd,
    setLimitUsd,
    sending,
    send,
    clear,
    estimateTokens,
  };
}
