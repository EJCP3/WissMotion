import { buildProjectApiPath } from "../utils/projectRouting";
import { studioApiFetch } from "../utils/studioApiFetch";
import { readStoredBrand } from "../brand/useBrandKit";
import type { BrandV1 } from "../brand/brandTypes";
import { applyFormat } from "./templateFormats";
import type { WissmotionTemplate } from "./wissmotionTemplates";

// brand.json → ids de variable estándar (espejo de BRAND_MAP en
// wissmotion/templates/instantiate.mjs).
export function brandToTemplateDefaults(brand: BrandV1): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (id: string, value: string | undefined) => {
    if (value !== undefined) out[id] = value;
  };
  put("brandPrimary", brand.colors.primary);
  put("brandSecondary", brand.colors.secondary);
  put("brandAccent", brand.colors.accent);
  put("brandBackground", brand.colors.background);
  put("brandSurface", brand.colors.surface);
  put("brandText", brand.colors.text);
  put("brandHeading", brand.fonts.heading);
  put("brandBody", brand.fonts.body);
  put("brandLogo", brand.logo?.full);
  put("brandName", brand.name);
  put("brandTagline", brand.tagline);
  return out;
}

/** Fusiona defaults ← marca del proyecto. Solo rellena lo declarado. */
export function mergeTemplateVariables(
  template: WissmotionTemplate,
  brand: BrandV1 | null,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const v of template.variables) values[v.id] = v.default;
  if (brand) {
    const mapped = brandToTemplateDefaults(brand);
    for (const v of template.variables) {
      if (mapped[v.id] !== undefined) values[v.id] = mapped[v.id];
    }
  }
  return values;
}

/**
 * Reescribe los defaults de data-composition-variables en el HTML con los
 * valores fusionados: la copia instalada previsualiza con la marca puesta,
 * y el panel Variables la retoca después.
 */
export function bakeVariables(html: string, values: Record<string, unknown>): string {
  return html.replace(
    /(<html[^>]*data-composition-variables=')(\[[\s\S]*?\])(')/,
    (_match, prefix: string, json: string, suffix: string) => {
      const declared = JSON.parse(json) as Array<{ id: string; default?: unknown }>;
      for (const v of declared) {
        if (values[v.id] !== undefined) v.default = values[v.id];
      }
      return `${prefix}${JSON.stringify(declared)}${suffix}`;
    },
  );
}

async function putNewFile(
  projectId: string,
  name: string,
  body: string,
  contentType: string,
): Promise<string> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = attempt === 1 ? name : name.replace(/(\.[^.]+)$/, `-${attempt}$1`);
    const response = await studioApiFetch(
      buildProjectApiPath(projectId, `/files/${encodeURIComponent(candidate)}`),
      {
        method: "PUT",
        headers: { "Content-Type": contentType, "If-None-Match": "*" },
        body,
      },
    );
    if (response.ok) return candidate;
    lastStatus = response.status;
    if (response.status !== 409) break;
  }
  throw new Error(`write ${lastStatus}`);
}

/**
 * Instala una plantilla WissMotion en el proyecto: HTML con la marca
 * horneada + variables.json (solo si no existe). Devuelve la ruta para
 * abrirla en el editor. `overrides` (wizard) gana a marca y defaults.
 */
export async function installWissmotionTemplate(
  projectId: string,
  template: WissmotionTemplate,
  opts?: {
    brand?: BrandV1 | null;
    vars?: Record<string, unknown>;
    fileName?: string;
    format?: string;
  },
): Promise<string> {
  const brand = opts && "brand" in opts ? (opts.brand ?? null) : readStoredBrand(projectId);
  const values = { ...mergeTemplateVariables(template, brand), ...(opts?.vars ?? {}) };
  const format = opts?.format && opts.format !== template.format ? opts.format : null;
  const html = format ? applyFormat(template.html, format) : template.html;
  const baseName =
    opts?.fileName ?? `${template.id}${format ? `-${format.replace(":", "x")}` : ""}.html`;
  const compPath = await putNewFile(
    projectId,
    `compositions/${baseName}`,
    bakeVariables(html, values),
    "text/plain",
  );
  try {
    await putNewFile(
      projectId,
      "variables.json",
      JSON.stringify(values, null, 2),
      "application/json",
    );
  } catch {
    // Ya hay variables.json del proyecto: los horneados mandan igual.
  }
  return compPath;
}
