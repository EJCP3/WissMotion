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
import type { BrandV1 } from "./brandTypes";
import { GOOGLE_FONT_SUGGESTIONS } from "./googleFonts";
import { MAX_LOGO_BYTES, useBrandKit } from "./useBrandKit";
import {
  deleteSavedBrand,
  duplicateSavedBrand,
  listSavedBrands,
  saveNamedBrand,
} from "./brandLibrary";
import { BrandPreview } from "./BrandPreview";
import {
  contrastRatio,
  hexToRgb,
  rgbToHex,
  suggestCompliantForegroundColor,
  tonesOf,
  wcagRating,
  type WcagRating,
} from "./contrast";

const WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const RATING_TONE: Record<WcagRating, string> = {
  aaa: "text-accent-ink",
  aa: "text-text-1",
  "aa-large": "text-text-3",
  fail: "text-danger-ink",
};

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
  const { brand, errors, patch, replace, setColor, reset, exportJson, importJson, copyTokens } =
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
      <LibrarySection brand={brand} onApply={replace} notify={flash} />
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

      <ContrastSection
        brand={brand}
        onFixText={(hex) => {
          setColor("text", hex);
        }}
      />

      <TonesSection brand={brand} onPick={(field, hex) => setColor(field, hex)} />

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

const CONTRAST_PAIRS: {
  fg: (brand: BrandV1) => string;
  bg: (brand: BrandV1) => string;
  label: StudioStringKey;
}[] = [
  { fg: (b) => b.colors.text, bg: (b) => b.colors.background, label: "brand.pair.body" },
  { fg: (b) => b.colors.text, bg: (b) => b.colors.surface, label: "brand.pair.surface" },
  { fg: () => "#ffffff", bg: (b) => b.colors.primary, label: "brand.pair.cta" },
  { fg: (b) => b.colors.primary, bg: (b) => b.colors.background, label: "brand.pair.accent" },
];

const RATING_LABEL: Record<WcagRating, StudioStringKey> = {
  aaa: "brand.rating.aaa",
  aa: "brand.rating.aa",
  "aa-large": "brand.rating.aaLarge",
  fail: "brand.rating.fail",
};

function ContrastSection({
  brand,
  onFixText,
}: {
  brand: BrandV1;
  onFixText: (hex: string) => void;
}) {
  const { t } = useLanguage();
  const textRgb = hexToRgb(brand.colors.text);
  const bgRgb = hexToRgb(brand.colors.background);
  const bodyRatio = textRgb && bgRgb ? contrastRatio(textRgb, bgRgb) : null;
  const needsFix = bodyRatio !== null && bodyRatio < 4.5;

  const fix = () => {
    if (!textRgb || !bgRgb) return;
    onFixText(rgbToHex(suggestCompliantForegroundColor(textRgb, bgRgb, 4.5)));
  };

  return (
    <Section title={t("brand.contrast")}>
      <div className="grid gap-1.5" data-testid="brand-contrast">
        {CONTRAST_PAIRS.map((pair) => {
          const fg = hexToRgb(pair.fg(brand));
          const bg = hexToRgb(pair.bg(brand));
          if (!fg || !bg) return null;
          const ratio = contrastRatio(fg, bg);
          const rating = wcagRating(ratio);
          return (
            <div key={pair.label} className="flex items-center gap-2 text-step-12">
              <span
                className="flex overflow-hidden rounded border border-border-strong"
                aria-hidden="true"
              >
                <span className="h-4 w-4" style={{ background: pair.fg(brand) }} />
                <span className="h-4 w-4" style={{ background: pair.bg(brand) }} />
              </span>
              <span className="min-w-0 flex-1 truncate text-text-2">{t(pair.label)}</span>
              <span className="tabular-nums text-text-3">{ratio.toFixed(2)}</span>
              <span className={cn("w-16 text-right font-semibold", RATING_TONE[rating])}>
                {t(RATING_LABEL[rating])}
              </span>
            </div>
          );
        })}
      </div>
      {needsFix && (
        <div className="grid gap-1.5 rounded-md border border-danger/30 bg-danger/10 p-2">
          <p role="alert" className="text-step-12 text-danger-ink">
            {t("brand.contrastWarning")} ({bodyRatio === null ? "–" : bodyRatio.toFixed(2)})
          </p>
          <div>
            <Button variant="ghost" onClick={fix}>
              {t("brand.useSuggested")}
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}

function TonesSection({
  brand,
  onPick,
}: {
  brand: BrandV1;
  onPick: (field: BrandColorField, hex: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <Section title={t("brand.tones")}>
      <p className="text-step-11 text-text-4">{t("brand.tonesHint")}</p>
      <div className="grid gap-1.5" data-testid="brand-tones">
        {COLOR_FIELDS.map((field) => (
          <div key={field} className="flex items-center gap-1.5">
            <span className="w-20 shrink-0 truncate text-step-11 text-text-3">
              {t(COLOR_LABEL_KEYS[field])}
            </span>
            <div className="flex flex-1 gap-1">
              {tonesOf(brand.colors[field]).map((tone, index) => (
                <button
                  key={`${field}-${index}`}
                  type="button"
                  title={tone}
                  aria-label={`${t(COLOR_LABEL_KEYS[field])} ${tone}`}
                  onClick={() => onPick(field, tone)}
                  className="h-6 flex-1 rounded border border-border-strong"
                  style={{ background: tone }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function LibrarySection({
  brand,
  onApply,
  notify,
}: {
  brand: BrandV1;
  onApply: (brand: BrandV1) => void;
  notify: (message: string) => void;
}) {
  const { t } = useLanguage();
  const [saved, setSaved] = useState(listSavedBrands);
  const [picked, setPicked] = useState("");
  const [name, setName] = useState("");

  const apply = (brandName: string) => {
    const found = listSavedBrands().find((b) => b.name === brandName);
    if (!found) return;
    onApply(found.brand);
    notify(t("brand.applied"));
  };

  return (
    <Section title={t("brand.library")}>
      {saved.length > 0 ? (
        <div className="grid gap-2">
          <Field label={t("brand.libraryPick")}>
            <select
              aria-label={t("brand.libraryPick")}
              value={picked}
              onChange={(e) => {
                setPicked(e.target.value);
                if (e.target.value) apply(e.target.value);
              }}
              className={cn(fieldBase, fieldText, "py-1.5")}
            >
              <option value="">{t("brand.libraryPick")}</option>
              {saved.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              disabled={!picked}
              onClick={() => {
                if (!picked) return;
                try {
                  setSaved(duplicateSavedBrand(picked, `${picked}${t("brand.copySuffix")}`));
                  notify(t("brand.duplicated"));
                } catch {
                  notify(t("brand.importError"));
                }
              }}
            >
              {t("brand.duplicate")}
            </Button>
            <Button
              variant="ghost"
              disabled={!picked}
              onClick={() => {
                if (!picked) return;
                setSaved(deleteSavedBrand(picked));
                setPicked("");
                notify(t("brand.deleted"));
              }}
            >
              {t("brand.delete")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-step-12 text-text-3">{t("brand.noBrands")}</p>
      )}
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Input
            aria-label={t("brand.saveName")}
            value={name}
            placeholder={t("brand.saveName")}
            onCommit={setName}
          />
        </div>
        <Button
          variant="ghost"
          disabled={!name.trim()}
          onClick={() => {
            try {
              setSaved(saveNamedBrand(name, brand));
              setName("");
              notify(t("brand.saved"));
            } catch {
              notify(t("brand.invalid"));
            }
          }}
        >
          {t("brand.save")}
        </Button>
      </div>
    </Section>
  );
}
