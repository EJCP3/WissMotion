// Contexto legible del MCP (Fase 8.1): recursos (marca, plantillas, kit de
// movimiento, guía) y prompts de flujo ("crear promo de app", "adaptar a 9:16").
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listBrands, resolveLibraryDir } from "../brand-kit/brand-library.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_MIME = "application/json";

export const RESOURCES = [
  {
    uri: "wissmotion://templates",
    name: "Plantillas",
    description: "Plantillas promo con formato, duración y variables.",
    mimeType: JSON_MIME,
    read: ({ listTemplates }) => listTemplates(),
  },
  {
    uri: "wissmotion://motion",
    name: "Kit de movimiento",
    description: "Personalidades, presets y transiciones con sus easings.",
    mimeType: JSON_MIME,
    read: ({ motionKit }) => motionKit(),
  },
  {
    uri: "wissmotion://brands",
    name: "Biblioteca de marcas",
    description: "Marcas guardadas en ~/.wissmotion/brands.",
    mimeType: JSON_MIME,
    read: () => listBrands(resolveLibraryDir()),
  },
  {
    uri: "wissmotion://brand-schema",
    name: "Esquema brand.json v1",
    description: "JSON Schema de la marca (campos obligatorios y formatos).",
    mimeType: JSON_MIME,
    read: () => readFile(join(root, "brand-kit", "brand.schema.json"), "utf8"),
  },
  {
    uri: "wissmotion://guide",
    name: "Guía para agentes",
    description: "AGENTS.md de WissMotion: mapa, reglas y comandos.",
    mimeType: "text/markdown",
    read: () => readFile(join(root, "AGENTS.md"), "utf8"),
  },
];

const CLOSE = `Antes de entregar: lint_check con 0 errores y frame_snapshot para revisar los fotogramas con visión; corrige lo que veas mal. Pide confirmación antes de render_batch (tarda).`;

export const PROMPTS = [
  {
    name: "crear-promo-app",
    description: "Promo de una app móvil adaptada a su marca.",
    arguments: [
      { name: "app", description: "Nombre de la app", required: true },
      { name: "url", description: "Web de la app para extraer la marca", required: false },
      { name: "out", description: "Carpeta de salida", required: false },
    ],
    build: ({ app, url, out }) =>
      [
        `Crea un video promo de la app "${app}" con WissMotion.`,
        url
          ? `1. brand_extract con ${url}; revisa colores y fuentes y guárdala con brand_save.`
          : "1. Pregunta por la marca (brand_list) o crea una válida con brand_validate.",
        '2. template_list: elige la plantilla de app (p. ej. "promo-app") y propón textos breves.',
        `3. template_instantiate en ${out ?? "./promo-app"} con la marca y las variables.`,
        "4. Ajusta textos con project_set_variables si hace falta.",
        CLOSE,
      ].join("\n"),
  },
  {
    name: "crear-promo-web",
    description: "Promo de una web o SaaS a partir de su URL.",
    arguments: [
      { name: "url", description: "URL de la web", required: true },
      { name: "out", description: "Carpeta de salida", required: false },
    ],
    build: ({ url, out }) =>
      [
        `Crea un video promo de ${url} con WissMotion.`,
        "1. brand_extract con la URL; corrige lo que no cuadre y guárdala con brand_save.",
        "2. template_list: elige una plantilla web/SaaS; saca titular, 3 features y CTA de la web.",
        `3. template_instantiate en ${out ?? "./promo-web"}; si son varias escenas, film_build.`,
        CLOSE,
      ].join("\n"),
  },
  {
    name: "adaptar-formato",
    description: "Adapta un proyecto existente a otro formato (9:16, 1:1, 4:5…).",
    arguments: [
      { name: "project", description: "Carpeta del proyecto", required: true },
      { name: "format", description: "16:9, 9:16, 1:1 o 4:5", required: true },
    ],
    build: ({ project, format }) =>
      [
        `Adapta el proyecto ${project} al formato ${format}.`,
        "1. project_info para ver tamaño, variables y la plantilla de origen.",
        `2. Si viene de una plantilla, template_instantiate con format "${format}" y los mismos valores (variables.json + brand.json) en una carpeta nueva.`,
        `3. Si no, render_batch con dryRun para ver qué destinos encajan con ${format}.`,
        CLOSE,
      ].join("\n"),
  },
];
