import { saveProjectFilesWithHistory, type RecordEditInput } from "../utils/studioFileHistory";
import { bakeVariables, brandToTemplateDefaults } from "../home/wissmotionInstall";
import { brandFontsLink } from "../home/templateFormats";
import { validateBrandStructure, type BrandV1 } from "./brandTypes";

export const PROJECT_BRAND_FILE = "brand.json";

/** Composición con la marca horneada: defaults brand* + link de fuentes. */
export function rebrandHtml(html: string, brand: BrandV1): string {
  if (!html.includes("data-composition-variables")) return html;
  const values = brandToTemplateDefaults(brand);
  return brandFontsLink(bakeVariables(html, values), values, brand.fonts.weights);
}

/** variables.json con las claves brand* reemplazadas (el resto intacto). */
export function rebrandVariablesJson(json: string, brand: BrandV1): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return json;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json;
  const current = parsed as Record<string, unknown>;
  const next = { ...current };
  for (const [id, value] of Object.entries(brandToTemplateDefaults(brand))) {
    if (id in current) next[id] = value;
  }
  return `${JSON.stringify(next, null, 2)}\n`;
}

/** brand.json del proyecto si existe y valida (viaja con el repo a otra PC). */
export async function readProjectBrand(
  readFile: (path: string) => Promise<string>,
): Promise<BrandV1 | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(PROJECT_BRAND_FILE));
    return validateBrandStructure(parsed).length === 0 ? (parsed as BrandV1) : null;
  } catch {
    return null;
  }
}

/**
 * Aplica la marca a todo el proyecto en una sola entrada de deshacer:
 * composiciones con variables (defaults brand* + fuentes) y variables.json.
 * Después guarda brand.json (se crea si no existe; fuera del historial).
 */
export async function applyBrandToProject(input: {
  projectId: string;
  brand: BrandV1;
  compositions: readonly string[];
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string, expectedContent?: string) => Promise<void>;
  recordEdit: (entry: RecordEditInput) => Promise<void>;
}): Promise<number> {
  const { brand, readFile } = input;
  const files: Record<string, (content: string) => string> = {};
  for (const path of input.compositions) files[path] = (html) => rebrandHtml(html, brand);
  if ((await readFile("variables.json").catch(() => null)) !== null) {
    files["variables.json"] = (json) => rebrandVariablesJson(json, brand);
  }
  const changed = await saveProjectFilesWithHistory({
    projectId: input.projectId,
    label: "Aplicar marca",
    files,
    readFile,
    writeFile: input.writeFile,
    recordEdit: input.recordEdit,
  });
  // El writer exige el contenido previo si el archivo ya existe (concurrencia).
  let previous: string | undefined;
  try {
    previous = await readFile(PROJECT_BRAND_FILE);
  } catch {
    previous = undefined;
  }
  const content = `${JSON.stringify(brand, null, 2)}\n`;
  if (previous !== content) await input.writeFile(PROJECT_BRAND_FILE, content, previous);
  return changed.filter((p) => p !== "variables.json").length;
}
