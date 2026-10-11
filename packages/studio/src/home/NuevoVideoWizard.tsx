// Asistente Nuevo video promo: marca → plantilla → contenido → crear.
// Reutiliza la biblioteca (marcas), el catálogo (plantillas + pósters) y la
// instalación con horneado. Termina abriendo el editor (preview y render
// viven allí); el paso IA llega con la Fase 7.
import { useMemo, useState } from "react";
import { ArrowLeft, SpinnerGap, WarningCircle, X } from "@phosphor-icons/react";
import { useLanguage } from "../i18n/LanguageContext";
import { listSavedBrands } from "../brand/brandLibrary";
import type { BrandV1 } from "../brand/brandTypes";
import { installWissmotionTemplate, mergeTemplateVariables } from "./wissmotionInstall";
import { WISSMOTION_TEMPLATES, type WissmotionTemplate } from "./wissmotionTemplates";

const inputCls =
  "h-10 w-full rounded-sm border border-border-strong bg-bg-0 px-3 text-step-13 text-text-0 outline-none placeholder:text-text-4 focus:border-accent";

function ContentField({
  variable,
  value,
  onChange,
}: {
  variable: { id: string; type: string; label: string };
  value: unknown;
  onChange: (next: string) => void;
}) {
  if (variable.type === "color") {
    return (
      <label className="grid gap-1.5 text-step-13 text-text-1">
        <span>{variable.label}</span>
        <span className="flex items-center gap-2">
          <input
            type="color"
            aria-label={variable.label}
            value={typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-14 shrink-0 cursor-pointer rounded-sm border border-border-strong bg-transparent p-1"
          />
          <input
            aria-label={`${variable.label} hexadecimal`}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
        </span>
      </label>
    );
  }
  if (variable.type === "number") {
    return (
      <label className="grid gap-1.5 text-step-13 text-text-1">
        <span>{variable.label}</span>
        <input
          type="number"
          aria-label={variable.label}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      </label>
    );
  }
  if (variable.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-step-13 text-text-1">
        <input
          type="checkbox"
          aria-label={variable.label}
          checked={value === true || value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          className="size-4 accent-[var(--color-accent)]"
        />
        <span>{variable.label}</span>
      </label>
    );
  }
  return (
    <label className="grid gap-1.5 text-step-13 text-text-1">
      <span>{variable.label}</span>
      <input
        aria-label={variable.label}
        value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </label>
  );
}

export function NuevoVideoWizard({
  targetId,
  onClose,
  onOpenProject,
}: {
  targetId: string | null;
  onClose: () => void;
  onOpenProject: (projectId: string, compPath?: string) => void;
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [brands] = useState(listSavedBrands);
  const [brandName, setBrandName] = useState("");
  const [templateId, setTemplateId] = useState(WISSMOTION_TEMPLATES[0].id);
  const [vars, setVars] = useState<Record<string, unknown>>({});
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template: WissmotionTemplate =
    WISSMOTION_TEMPLATES.find((item) => item.id === templateId) ?? WISSMOTION_TEMPLATES[0];
  const brand: BrandV1 | null = useMemo(() => {
    if (!brandName) return null;
    return brands.find((b) => b.name === brandName)?.brand ?? null;
  }, [brands, brandName]);

  const effective = useMemo(() => {
    const merged = mergeTemplateVariables(template, brand);
    for (const key of edited) {
      if (vars[key] !== undefined) merged[key] = vars[key];
    }
    return merged;
  }, [template, brand, vars, edited]);

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    setVars({});
    setEdited(new Set());
  };

  const pickBrand = (name: string) => {
    setBrandName(name);
  };

  async function handleCreate() {
    if (!targetId || working) return;
    setWorking(true);
    setError(null);
    try {
      const compPath = await installWissmotionTemplate(targetId, template, {
        brand,
        vars: effective,
      });
      onOpenProject(targetId, compPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
      setWorking(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("wizard.title")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/70"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-md border border-border-strong bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-step-16 font-bold text-text-0">{t("wizard.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("home.close")}
            className="rounded-sm p-1 text-text-3 hover:text-text-0"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex gap-2 border-b border-border px-6 py-3" aria-label={t("wizard.title")}>
          {[t("wizard.stepBrand"), t("wizard.stepTemplate"), t("wizard.stepContent")].map(
            (label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                aria-current={step === i || undefined}
                className={
                  step === i
                    ? "rounded-full bg-on px-3 py-1 text-step-12 font-semibold text-text-0"
                    : "rounded-full px-3 py-1 text-step-12 text-text-3 hover:text-text-0"
                }
              >
                {label}
              </button>
            ),
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {step === 0 ? (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-step-13 text-text-1">
                <span>{t("wizard.pickBrand")}</span>
                <select
                  aria-label={t("wizard.pickBrand")}
                  value={brandName}
                  onChange={(e) => pickBrand(e.target.value)}
                  className={`${inputCls} py-0`}
                >
                  <option value="">{t("wizard.noBrand")}</option>
                  {brands.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              {brand ? (
                <div className="flex gap-1.5" aria-label={t("wizard.brandColors")}>
                  {(
                    ["primary", "secondary", "accent", "background", "surface", "text"] as const
                  ).map((key) => (
                    <span
                      key={key}
                      title={key}
                      className="h-8 flex-1 rounded-sm border border-border-strong"
                      style={{ background: brand.colors[key] }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {step === 1 ? (
            <div className="grid grid-cols-3 gap-4" data-testid="wizard-templates">
              {WISSMOTION_TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickTemplate(item.id)}
                  aria-pressed={item.id === templateId}
                  className={
                    item.id === templateId
                      ? "rounded-sm text-left outline-2 outline-accent"
                      : "rounded-sm text-left outline-transparent hover:outline hover:outline-border-strong"
                  }
                >
                  <span className="block aspect-video w-full overflow-hidden rounded-sm bg-hover">
                    <img
                      src={item.poster}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="mt-1.5 block truncate text-step-12 font-semibold text-text-0">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {step === 2 ? (
            <div className="grid gap-3">
              {template.variables.map((v) => (
                <ContentField
                  key={v.id}
                  variable={v}
                  value={effective[v.id]}
                  onChange={(next) => {
                    setVars((prev) => ({ ...prev, [v.id]: next }));
                    setEdited((prev) => new Set(prev).add(v.id));
                  }}
                />
              ))}
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 flex items-center gap-1.5 text-step-12 text-danger-ink">
              <WarningCircle size={14} aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="flex h-10 items-center gap-1.5 rounded-none px-4 text-step-13 font-medium text-text-2 hover:text-text-0"
          >
            {step > 0 ? <ArrowLeft size={15} aria-hidden="true" /> : null}
            {step > 0 ? t("wizard.back") : t("home.cancel")}
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="h-10 rounded-none bg-accent px-6 text-step-13 font-semibold text-on-accent transition-transform duration-press enabled:active:scale-[0.98]"
            >
              {t("wizard.next")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!targetId || working}
              className="flex h-10 items-center gap-2 rounded-none bg-accent px-6 text-step-13 font-semibold text-on-accent transition-transform duration-press enabled:active:scale-[0.98] disabled:opacity-40"
            >
              {working ? (
                <SpinnerGap size={16} className="animate-spin" aria-hidden="true" />
              ) : null}
              {working ? t("wizard.creating") : t("wizard.create")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
