import { studioLanguages, type StudioLang } from "../i18n/dictionaries";
import { useLanguage } from "../i18n/LanguageContext";
import { cn } from "./ui";

/** Segmentado ES|EN del header. Siempre visible: el idioma es del producto. */
export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t("header.language")}
      className="flex h-ctl items-center overflow-hidden rounded-md border border-border-strong"
    >
      {studioLanguages.map((option: StudioLang) => (
        <button
          key={option}
          type="button"
          aria-pressed={lang === option}
          onClick={() => setLang(option)}
          className={cn(
            "h-full px-2 text-step-11 font-semibold uppercase",
            lang === option ? "bg-on text-accent-ink" : "text-text-3 hover:text-text-0",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
