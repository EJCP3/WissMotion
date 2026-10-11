import { useState } from "react";
import { Button, Input, Select, cn } from "../ui";
import { useLanguage } from "../i18n/LanguageContext";
import { PROVIDERS, type ProviderConfig } from "./providers";
import { useAiChat } from "./useAiChat";

function ConfigForm({
  config,
  onChange,
  limitUsd,
  onLimit,
}: {
  config: ProviderConfig;
  onChange: (next: ProviderConfig) => void;
  limitUsd: number;
  onLimit: (next: number) => void;
}) {
  const { t } = useLanguage();
  const def = PROVIDERS.find((p) => p.id === config.provider) ?? PROVIDERS[0];
  return (
    <div className="grid gap-2 border-b border-border-strong px-3 py-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-step-12 text-text-1">
          <span>{t("ai.provider")}</span>
          <Select
            label={t("ai.provider")}
            value={config.provider}
            options={PROVIDERS.map((p) => ({ label: p.label, value: p.id }))}
            onCommit={(next) => {
              const found = PROVIDERS.find((p) => p.id === next) ?? PROVIDERS[0];
              onChange({
                provider: found.id,
                model: found.models[0].id,
                apiKey: config.apiKey,
                baseUrl: found.defaultBaseUrl,
              });
            }}
          />
        </label>
        <label className="grid gap-1 text-step-12 text-text-1">
          <span>{t("ai.model")}</span>
          <Select
            label={t("ai.model")}
            value={config.model}
            options={def.models.map((m) => ({
              label: `${m.label}${m.pricePerM[0] + m.pricePerM[1] === 0 ? ` (${t("ai.free")})` : ""}`,
              value: m.id,
            }))}
            onCommit={(next) => onChange({ ...config, model: next })}
          />
        </label>
      </div>
      {def.needsKey ? (
        <label className="grid gap-1 text-step-12 text-text-1">
          <span>{t("ai.apiKey")}</span>
          <Input
            value={config.apiKey}
            type="password"
            placeholder="sk-…"
            onCommit={(next) => onChange({ ...config, apiKey: next.trim() })}
          />
        </label>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-step-12 text-text-1">
          <span>{t("ai.baseUrl")}</span>
          <Input
            value={config.baseUrl}
            onCommit={(next) => onChange({ ...config, baseUrl: next.trim() || def.defaultBaseUrl })}
          />
        </label>
        <label className="grid gap-1 text-step-12 text-text-1">
          <span>{t("ai.limitUsd")}</span>
          <Input
            value={String(limitUsd)}
            inputMode="decimal"
            onCommit={(next) => {
              const parsed = Number(next.replace(",", "."));
              if (Number.isFinite(parsed) && parsed > 0) onLimit(parsed);
            }}
          />
        </label>
      </div>
      <p className="text-step-11 text-text-4">{def.hint}</p>
    </div>
  );
}

/**
 * Panel Asistente (Fase 7): chat BYOK con medidor de gasto y degradación a
 * borrador local. Sin clave o sin red, propone guion+storyboard sin coste.
 */
export function AiChatPanel({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const { config, setConfig, messages, usage, limitUsd, setLimitUsd, sending, send, clear } =
    useAiChat(projectId);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex h-full flex-col" data-testid="ai-panel">
      <ConfigForm config={config} onChange={setConfig} limitUsd={limitUsd} onLimit={setLimitUsd} />
      <div className="flex items-center justify-between border-b border-border-strong px-3 py-1.5 text-step-11 text-text-3">
        <span className={cn(usage.usd >= limitUsd && limitUsd > 0 ? "text-danger-ink" : undefined)}>
          {`${t("ai.usage")}: $${usage.usd.toFixed(4)} / $${limitUsd} · ${usage.inputTokens + usage.outputTokens} tok`}
        </span>
        <button type="button" onClick={clear} className="hover:text-text-0">
          {t("ai.clear")}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-step-12 text-text-3">{t("ai.empty")}</p>
        ) : (
          <div className="grid gap-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap rounded-md px-2.5 py-2 text-step-12 leading-relaxed",
                  m.role === "user" ? "justify-self-end bg-on text-text-0" : "bg-bg-2 text-text-1",
                )}
              >
                {m.local ? (
                  <span className="mb-1 block text-step-11 font-semibold text-accent-ink">
                    {t("ai.localDraft")}
                  </span>
                ) : null}
                {m.text}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-border-strong p-2">
        <div className="min-w-0 flex-1">
          <Input
            aria-label={t("ai.prompt")}
            value={draft}
            placeholder={t("ai.prompt")}
            onCommit={(next) => {
              if (next.trim()) {
                setDraft("");
                void send(next);
              }
            }}
          />
        </div>
        <Button
          variant="primary"
          disabled={!draft.trim() || sending}
          onClick={() => {
            if (draft.trim()) {
              const text = draft;
              setDraft("");
              void send(text);
            }
          }}
        >
          {sending ? t("ai.sending") : t("ai.send")}
        </Button>
      </div>
    </div>
  );
}
