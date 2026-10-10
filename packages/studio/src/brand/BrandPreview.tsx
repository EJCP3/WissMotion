import { useLanguage } from "../i18n/LanguageContext";
import type { BrandV1 } from "./brandTypes";

/**
 * Vista previa en vivo de la marca: un hero promo mínimo vestido con los
 * tokens (colores, tipografías, logo, CTA). No es el video — es la marca
 * viéndose a sí misma antes de aplicarse a una plantilla (Fase 3).
 */
export function BrandPreview({ brand }: { brand: BrandV1 }) {
  const { t } = useLanguage();
  const features = (brand.features ?? []).slice(0, 3);
  return (
    <div
      className="overflow-hidden rounded-lg border border-border-strong"
      style={{ background: brand.colors.background, color: brand.colors.text }}
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        {brand.logo?.full ? (
          <img src={brand.logo.full} alt="" className="h-6 w-auto object-contain" />
        ) : (
          <span
            className="inline-block h-5 w-5 rounded"
            style={{
              background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})`,
            }}
            aria-hidden="true"
          />
        )}
        <span
          className="text-step-11 font-semibold"
          style={{ fontFamily: `"${brand.fonts.heading}", sans-serif` }}
        >
          {brand.name || t("brand.previewUntitled")}
        </span>
      </div>
      <div className="px-4 py-3">
        <p
          className="text-step-14 font-bold leading-snug"
          style={{ fontFamily: `"${brand.fonts.heading}", sans-serif` }}
        >
          {brand.tagline || t("brand.previewTagline")}
        </p>
        {features.length > 0 && (
          <ul
            className="mt-2 grid gap-1 text-step-11"
            style={{ fontFamily: `"${brand.fonts.body}", sans-serif` }}
          >
            {features.map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: brand.colors.accent }}
                  aria-hidden="true"
                />
                {f}
              </li>
            ))}
          </ul>
        )}
        <span
          className="mt-3 inline-block rounded-md px-3 py-1.5 text-step-11 font-semibold"
          style={{ background: brand.colors.primary, color: "#ffffff" }}
        >
          {brand.cta?.label || t("brand.previewCta")}
        </span>
      </div>
    </div>
  );
}
