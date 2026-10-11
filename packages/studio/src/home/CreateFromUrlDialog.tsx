// Diálogo Crear-desde-URL: extrae la marca de un sitio vía el servidor y la
// guarda como marca del proyecto destino, que se abre en el editor.
import { useState } from "react";
import { Globe, SpinnerGap, WarningCircle, X } from "@phosphor-icons/react";
import { useLanguage } from "../i18n/LanguageContext";
import { writeStoredBrand } from "../brand/useBrandKit";
import { extractBrandFromUrl } from "./homeApi";

export function CreateFromUrlDialog({
  targetId,
  onClose,
  onOpenProject,
}: {
  targetId: string | null;
  onClose: () => void;
  onOpenProject: (projectId: string) => void;
}) {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExtract() {
    const trimmed = url.trim();
    if (!targetId || working || !trimmed) return;
    setWorking(true);
    setError(null);
    try {
      const { brand } = await extractBrandFromUrl(trimmed);
      if (!writeStoredBrand(targetId, brand)) throw new Error(t("home.extractError"));
      onOpenProject(targetId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("home.extractError"));
      setWorking(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("home.fromUrl")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-md border border-border-strong bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-step-16 font-bold text-text-0">
            <Globe size={20} aria-hidden="true" />
            {t("home.fromUrl")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("home.close")}
            className="rounded-sm p-1 text-text-3 hover:text-text-0"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <label className="mt-4 grid gap-1.5 text-step-13 text-text-1">
          {t("home.urlLabel")}
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleExtract();
              if (e.key === "Escape") onClose();
            }}
            placeholder="https://"
            inputMode="url"
            autoFocus
            className="h-10 rounded-sm border border-border-strong bg-bg-0 px-3 text-step-13 text-text-0 outline-none placeholder:text-text-4 focus:border-accent"
          />
        </label>
        {error ? (
          <p role="alert" className="mt-3 flex items-center gap-1.5 text-step-12 text-danger-ink">
            <WarningCircle size={14} aria-hidden="true" />
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-none px-5 text-step-13 font-medium text-text-2 hover:text-text-0"
          >
            {t("home.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleExtract()}
            disabled={!targetId || working || !url.trim()}
            className="flex h-10 items-center gap-2 rounded-none bg-accent px-5 text-step-13 font-semibold text-on-accent transition-transform duration-press enabled:active:scale-[0.98] disabled:opacity-40"
          >
            {working ? <SpinnerGap size={16} className="animate-spin" aria-hidden="true" /> : null}
            {working ? t("home.extracting") : t("home.fromUrl")}
          </button>
        </div>
      </div>
    </div>
  );
}
