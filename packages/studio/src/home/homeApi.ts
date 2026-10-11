// Cliente del Home: solo endpoints que ya expone el servidor
// (lista de proyectos, detalle, crear archivo por PUT, instalar plantilla).
// Sin literales de color: el hex ratchet solo perdona theme.css.

import { encodeUrlPath } from "@hyperframes/parsers";
import { buildProjectApiPath } from "../utils/projectRouting";
import { studioApiFetch } from "../utils/studioApiFetch";

export interface HomeProject {
  id: string;
  title?: string;
}

export interface HomeProjectDetails extends HomeProject {
  compositions: string[];
}

/** Composición mínima válida (isCompositionSource pide data-composition-id). */
export const BLANK_COMPOSITION_HTML = [
  "<!doctype html>",
  '<html lang="es">',
  "  <head>",
  '    <meta charset="UTF-8" />',
  '    <meta name="viewport" content="width=1920, height=1080" />',
  "    <title>Sin título</title>",
  "    <style>",
  "      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: white; }",
  "    </style>",
  "  </head>",
  "  <body>",
  '    <div data-composition-id="main" data-duration="6" data-width="1920" data-height="1080"></div>',
  "  </body>",
  "</html>",
  "",
].join("\n");

function isProjectId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** GET /api/projects — en CLI es un solo proyecto; en dev pueden ser varios. */
export async function listHomeProjects(): Promise<HomeProject[]> {
  const response = await studioApiFetch("/api/projects");
  if (!response.ok) throw new Error(`projects ${response.status}`);
  const data = (await response.json()) as
    | { projects?: Array<{ id?: unknown; title?: unknown }> }
    | Array<{ id?: unknown; title?: unknown }>;
  const list = Array.isArray(data) ? data : (data.projects ?? []);
  return list.flatMap((entry) => {
    if (!entry || !isProjectId(entry.id)) return [];
    return [
      {
        id: entry.id,
        title: typeof entry.title === "string" && entry.title ? entry.title : undefined,
      },
    ];
  });
}

/** GET /api/projects/:id — título y composiciones para la tarjeta. Null si falla. */
export async function getHomeProjectDetails(id: string): Promise<HomeProjectDetails | null> {
  try {
    const response = await studioApiFetch(buildProjectApiPath(id, ""));
    if (!response.ok) return null;
    const data = (await response.json()) as {
      id?: unknown;
      title?: unknown;
      compositions?: unknown;
    };
    if (!isProjectId(data.id)) return null;
    return {
      id: data.id,
      title: typeof data.title === "string" && data.title ? data.title : undefined,
      compositions: Array.isArray(data.compositions) ? data.compositions.filter(isProjectId) : [],
    };
  } catch {
    return null;
  }
}

/** Miniatura del servidor para la tarjeta (con fallback gris si 501/falla). */
export function projectThumbnailUrl(projectId: string, compPath: string): string {
  return `${buildProjectApiPath(projectId, `/thumbnail/${encodeUrlPath(compPath)}`)}?t=0.5&format=png`;
}

/**
 * PUT .../files/compositions/sin-titulo[N].html con If-None-Match: *.
 * Devuelve la ruta creada para abrirla en el editor.
 */
export async function createBlankComposition(projectId: string): Promise<string> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const name =
      attempt === 1 ? "compositions/sin-titulo.html" : `compositions/sin-titulo-${attempt}.html`;
    const response = await studioApiFetch(
      buildProjectApiPath(projectId, `/files/${encodeURIComponent(name)}`),
      {
        method: "PUT",
        headers: { "Content-Type": "text/plain", "If-None-Match": "*" },
        body: BLANK_COMPOSITION_HTML,
      },
    );
    if (response.ok) return name;
    lastStatus = response.status;
    if (response.status !== 409) break;
  }
  throw new Error(`create ${lastStatus}`);
}

/** POST /api/brand/extract — marca sin IA vía el servidor (501 si falta el extractor). */
export async function extractBrandFromUrl(
  url: string,
): Promise<{ brand: unknown; debug: unknown }> {
  const response = await studioApiFetch("/api/brand/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await response.json().catch(() => null)) as {
    brand?: unknown;
    error?: unknown;
  } | null;
  if (!response.ok || !data || data.brand == null) {
    throw new Error(typeof data?.error === "string" ? data.error : `extract ${response.status}`);
  }
  return data as { brand: unknown; debug: unknown };
}
/** POST .../registry/install — devuelve la composición escrita para abrirla. */
export async function installTemplateBlock(projectId: string, blockName: string): Promise<string> {
  const response = await studioApiFetch(buildProjectApiPath(projectId, "/registry/install"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blockName }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
    throw new Error(typeof data?.error === "string" ? data.error : `install ${response.status}`);
  }
  const data = (await response.json()) as { written?: unknown };
  const written = Array.isArray(data.written) ? data.written.filter(isProjectId) : [];
  const composition = written.find((file) => file.endsWith(".html")) ?? written[0];
  if (!composition) throw new Error("empty");
  return composition;
}
