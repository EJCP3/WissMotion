import { useRef, useState } from "react";
import { Button, Input, Select, cn, fieldBase, fieldText } from "../ui";
import { useLanguage } from "../i18n/LanguageContext";
import {
  COLOR_FIELDS,
  MOTION_PERSONALITIES,
  normalizeHex,
  type BrandColorField,
  type MotionPersonality,
} from "./brandTypes";
import type { StudioStringKey } from "../i18n/dictionaries";
import { GOOGLE_FONT_SUGGESTIONS } from "./googleFonts";
import { MAX_LOGO_BYTES, useBrandKit } from "./useBrandKit";
import { BrandPreview } from "./BrandPreview";

const WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const COLOR_LABEL_KEYS: Record<BrandColorField, StudioStringKey> = {
  primary: "brand.color.primary",
  secondary: "brand.color.secondary",
  accent: "brand.color.accent",
  background: "brand.color.background",
  surface: "brand.color.surface",
  text: "brand.color.text",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2 border-b border-border-strong px-3 py-3 last:border-b-0">
      <h3 className="text-step-11 font-semibold uppercase tracking-wide text-text-3">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-step-12 text-text-1">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ColorRow({
  field,
  label,
  value,
  invalid,
  onCommit,
}: {
  field: BrandColorField;
  label: string;
  value: string;
  invalid: boolean;
  onCommit: (field: BrandColorField, hex: string) => void;
}) {
  const six = normalizeHex(value) ?? "#000000";
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={six}
        aria-label={label}
        onChange={(e) => onCommit(field, e.target.value)}
        className="h-7 w-9 shrink-0 cursor-pointer rounded border border-border-strong bg-transparent p-0.5"
      />
      <div className="min-w-0 flex-1">
        <Input
          aria-label={`${label} hexadecimal`}
          value={value}
          invalid={invalid}
          onCommit={(next) => onCommit(field, next)}
        />
      </div>
    </div>
  );
}

function FontField({
  label,
  value,
  listId,
  hint,
  onCommit,
}: {
  label: string;
  value: string;
  listId: string;
  hint: string;
  onCommit: (next: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <Field label={label}>
        <Input
          value={value}
          onCommit={(next) => next.trim() && onCommit(next.trim())}
          list={listId}
        />
      </Field>
      <datalist id={listId}>
        {GOOGLE_FONT_SUGGESTIONS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <p className="text-step-11 text-text-4">{hint}</p>
    </div>
  );
}

/**
 * Editor manual de marca (panel "Marca"): nombre, colores, tipografías,
 * logo y personalidad, con vista previa en vivo. Persiste por proyecto en
 * localStorage; el brand.json del proyecto llega con la Fase 9.
 */
export function BrandPanel({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const { brand, errors, patch, setColor, reset, exportJson, importJson, copyTokens } =
    useBrandKit(projectId);
  const [notice, setNotice] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const bad = new Set(errors);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice((current) => (current === message ? null : current)), 2500);
  };

  const toggleWeight = (w: number) => {
    const weights = brand.fonts.weights.includes(w)
      ? brand.fonts.weights.filter((x) => x !== w)
      : [...brand.fonts.weights, w].sort((a, b) => a - b);
    patch({ fonts: { ...brand.fonts, weights: weights.length > 0 ? weights : [400] } });
  };

  const uploadLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      flash(t("brand.logoTooBig"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      if (dataUrl) patch({ logo: { ...brand.logo, full: dataUrl, icon: dataUrl } });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="pb-4" data-testid="brand-panel">
      <Section title={t("brand.identity")}>
        <Field label={t("brand.name")}>
          <Input
            value={brand.name}
            invalid={bad.has("name")}
            onCommit={(next) => patch({ name: next.trim().slice(0, 80) })}
          />
        </Field>
        <Field label={t("brand.tagline")}>
          <Input
            value={brand.tagline ?? ""}
            onCommit={(next) => patch({ tagline: next.trim().slice(0, 160) || undefined })}
          />
        </Field>
        <Field label={t("brand.url")}>
          <Input
            value={brand.url ?? ""}
            inputMode="url"
            onCommit={(next) => patch({ url: next.trim() || undefined })}
          />
        </Field>
      </Section>

      <Section title={t("brand.colors")}>
        {COLOR_FIELDS.map((field) => (
          <ColorRow
            key={field}
            field={field}
            label={t(COLOR_LABEL_KEYS[field])}
            value={brand.colors[field]}
            invalid={bad.has(`colors.${field}`)}
            onCommit={(f, hex) => {
              setColor(f, hex);
            }}
          />
        ))}
      </Section>

      <Section title={t("brand.fonts")}>
        <FontField
          label={t("brand.heading")}
          value={brand.fonts.heading}
          listId="wm-font-heading"
          hint={t("brand.fontHint")}
          onCommit={(next) => patch({ fonts: { ...brand.fonts, heading: next } })}
        />
        <FontField
          label={t("brand.body")}
          value={brand.fonts.body}
          listId="wm-font-body"
          hint={t("brand.fontHint")}
          onCommit={(next) => patch({ fonts: { ...brand.fonts, body: next } })}
        />
        <div className="grid gap-1">
          <span className="text-step-12 text-text-1">{t("brand.weights")}</span>
          <div className="flex flex-wrap gap-1">
            {WEIGHT_STEPS.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={brand.fonts.weights.includes(w)}
                onClick={() => toggleWeight(w)}
                className={cn(
                  "rounded border border-border-strong px-1.5 py-0.5 text-step-11",
                  brand.fonts.weights.includes(w)
                    ? "bg-on text-accent-ink"
                    : "text-text-3 hover:text-text-0",
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        <Field label={t("brand.personality")}>
          <Select
            label={t("brand.personality")}
            value={brand.motionPersonality ?? MOTION_PERSONALITIES[1]}
            options={MOTION_PERSONALITIES.map((p: MotionPersonality) => ({ label: p, value: p }))}
            onCommit={(next) => patch({ motionPersonality: next as MotionPersonality })}
          />
        </Field>
      </Section>

      <Section title={t("brand.logo")}>
        {brand.logo?.full && (
          <img
            src={brand.logo.full}
            alt=""
            className="h-12 w-auto max-w-full rounded border border-border-strong bg-bg-2 object-contain"
          />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => logoRef.current?.click()}>
            {t("brand.logoUpload")}
          </Button>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label={t("brand.logoUpload")}
            onChange={(e) => {
              uploadLogo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <Field label={t("brand.logoUrl")}>
          <Input
            value={brand.logo?.full && !brand.logo.full.startsWith("data:") ? brand.logo.full : ""}
            inputMode="url"
            placeholder="https://…"
            onCommit={(next) => patch({ logo: { ...brand.logo, full: next.trim() || undefined } })}
          />
        </Field>
      </Section>

      <Section title={t("brand.featuresCta")}>
        <Field label={t("brand.features")}>
          <textarea
            aria-label={t("brand.features")}
            value={(brand.features ?? []).join("\n")}
            rows={3}
            onBlur={(e) => {
              const features = e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 12);
              patch({ features: features.length > 0 ? features : undefined });
            }}
            className={cn(fieldBase, fieldText, "resize-y py-1.5")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("brand.ctaLabel")}>
            <Input
              value={brand.cta?.label ?? ""}
              onCommit={(next) =>
                patch(
                  next.trim()
                    ? { cta: { ...brand.cta, label: next.trim().slice(0, 60) } }
                    : { cta: undefined },
                )
              }
            />
          </Field>
          <Field label={t("brand.ctaUrl")}>
            <Input
              value={brand.cta?.url ?? ""}
              inputMode="url"
              onCommit={(next) =>
                patch({
                  cta: brand.cta ? { ...brand.cta, url: next.trim() || undefined } : undefined,
                })
              }
            />
          </Field>
        </div>
      </Section>

      <Section title={t("brand.preview")}>
        <BrandPreview brand={brand} />
      </Section>

      <Section title={t("brand.actions")}>
        {errors.length > 0 && (
          <p role="alert" className="text-step-12 text-danger-ink">
            {t("brand.invalid")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportJson}>
            {t("brand.export")}
          </Button>
          <Button variant="ghost" onClick={() => importRef.current?.click()}>
            {t("brand.import")}
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label={t("brand.import")}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const problems = await importJson(file);
              flash(problems.length === 0 ? t("brand.imported") : t("brand.importError"));
            }}
          />
          <Button
            variant="ghost"
            onClick={() =>
              void copyTokens().then((ok) => flash(ok ? t("brand.copied") : t("brand.copyFailed")))
            }
          >
            {t("brand.copyTokens")}
          </Button>
          <Button variant="ghost" onClick={reset}>
            {t("brand.reset")}
          </Button>
        </div>
        {notice && (
          <p role="status" className="text-step-12 text-text-2">
            {notice}
          </p>
        )}
      </Section>
    </div>
  );
}
