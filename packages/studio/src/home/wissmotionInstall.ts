import { buildProjectApiPath } from "../utils/projectRouting";
import { studioApiFetch } from "../utils/studioApiFetch";
import { readStoredBrand } from "../brand/useBrandKit";
import type { BrandV1 } from "../brand/brandTypes";
import { applyFormat, brandFontsLink } from "./templateFormats";
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

/** Guarda un JSON nuevo en el proyecto (sufijo -2, -3… si ya existe). */
export function saveProjectJson(projectId: string, name: string, data: unknown): Promise<string> {
  return putNewFile(
    projectId,
    name,
    `${JSON.stringify(data, null, 2)}
`,
    "application/json",
  );
}

type InstallOptions = {
  brand?: BrandV1 | null;
  vars?: Record<string, unknown>;
  fileName?: string;
  format?: string;
};

/** HTML listo de una plantilla: formato, fuentes de marca y variables horneadas. */
export function buildTemplateDocument(
  projectId: string | null,
  template: WissmotionTemplate,
  opts?: InstallOptions,
): { html: string; values: Record<string, unknown>; format: string | null } {
  const brand =
    opts && "brand" in opts ? (opts.brand ?? null) : projectId ? readStoredBrand(projectId) : null;
  const values = { ...mergeTemplateVariables(template, brand), ...(opts?.vars ?? {}) };
  const format = opts?.format && opts.format !== template.format ? opts.format : null;
  const formatted = format ? applyFormat(template.html, format) : template.html;
  const html = brandFontsLink(formatted, values, brand?.fonts?.weights);
  return { html: bakeVariables(html, values), values, format };
}

/** Escribe variables.json solo si no existe (sin copias -2, -3…: nadie las lee). */
async function putVariablesIfAbsent(projectId: string, values: Record<string, unknown>) {
  await studioApiFetch(buildProjectApiPath(projectId, "/files/variables.json"), {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-None-Match": "*" },
    body: JSON.stringify(values, null, 2),
  }).catch(() => null);
}

/**
 * Instala una plantilla WissMotion en el proyecto: HTML con la marca
 * horneada + variables.json (solo si no existe). Devuelve la ruta para
 * abrirla en el editor. `overrides` (wizard) gana a marca y defaults.
 */
export async function installWissmotionTemplate(
  projectId: string,
  template: WissmotionTemplate,
  opts?: InstallOptions,
): Promise<string> {
  const { html, values, format } = buildTemplateDocument(projectId, template, opts);
  const baseName =
    opts?.fileName ?? `${template.id}${format ? `-${format.replace(":", "x")}` : ""}.html`;
  const compPath = await putNewFile(projectId, `compositions/${baseName}`, html, "text/plain");
  await putVariablesIfAbsent(projectId, values);
  return compPath;
}

/** El servidor no permite crear proyectos (modo CLI de un solo proyecto). */
export class ProjectCreationUnavailable extends Error {}

/**
 * Crea un borrador nuevo (su propia tarjeta en Borradores) con la plantilla
 * como index.html. Lanza ProjectCreationUnavailable si el host no lo admite.
 */
export async function createVideoProject(
  name: string,
  template: WissmotionTemplate,
  opts?: InstallOptions,
): Promise<{ projectId: string; compPath: string }> {
  const { html, values } = buildTemplateDocument(null, template, opts);
  const response = await studioApiFetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, html }),
  });
  if (response.status === 501 || response.status === 404) throw new ProjectCreationUnavailable();
  if (!response.ok) throw new Error(`create project ${response.status}`);
  const data = (await response.json()) as { id?: unknown };
  if (typeof data.id !== "string") throw new Error("create project: sin id");
  await putVariablesIfAbsent(data.id, values);
  return { projectId: data.id, compPath: "index.html" };
}
