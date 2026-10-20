import { useState } from "react";
import { Button, Input, cn, fieldBase, fieldText } from "../ui";
import { useLanguage } from "../i18n/LanguageContext";
import { COLOR_FIELDS, type BrandColorField, type BrandV1 } from "./brandTypes";
import type { StudioStringKey } from "../i18n/dictionaries";
import {
  deleteSavedBrand,
  duplicateSavedBrand,
  listSavedBrands,
  saveNamedBrand,
} from "./brandLibrary";
import {
  contrastRatio,
  hexToRgb,
  rgbToHex,
  suggestCompliantForegroundColor,
  tonesOf,
  wcagRating,
  type WcagRating,
} from "./contrast";

// Secciones del panel Marca (contraste, tonos, biblioteca) y piezas comunes.
const RATING_TONE: Record<WcagRating, string> = {
  aaa: "text-accent-ink",
  aa: "text-text-1",
  "aa-large": "text-text-3",
  fail: "text-danger-ink",
};

export const COLOR_LABEL_KEYS: Record<BrandColorField, StudioStringKey> = {
  primary: "brand.color.primary",
  secondary: "brand.color.secondary",
  accent: "brand.color.accent",
  background: "brand.color.background",
  surface: "brand.color.surface",
  text: "brand.color.text",
};

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2 border-b border-border-strong px-3 py-3 last:border-b-0">
      <h3 className="text-step-11 font-semibold uppercase tracking-wide text-text-3">{title}</h3>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-step-12 text-text-1">
      <span>{label}</span>
      {children}
    </label>
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

export function ContrastSection({
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

export function TonesSection({
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

export function LibrarySection({
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
