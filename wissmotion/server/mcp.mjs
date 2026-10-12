// Servidor MCP de WissMotion (Fase 8.1, transporte stdio).
// Expone el Brand Kit, las plantillas, el kit de movimiento y el render por
// lotes a cualquier agente (Claude Code, OpenCode, Cursor…) sin dependencias:
// JSON-RPC NDJSON sobre stdin/stdout según el protocolo MCP
// (initialize → notifications/initialized → tools/list → tools/call).
// Uso: node mcp.mjs  (los agentes lo lanzan con `npx wissmotion mcp`).
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBrand } from "../brand-kit/validate-brand.mjs";
import { extractBrand } from "../brand-kit/extract-lib.mjs";
import { getBrand, listBrands, resolveLibraryDir, saveBrand } from "../brand-kit/brand-library.mjs";
import { instantiate, parseDeclaredVariables } from "../templates/instantiate.mjs";
import { formatsIn, planBatch, readCompositionSize, DEST_IDS } from "../render/render-batch.mjs";
import { buildFilm, reviewFilm } from "../film/film.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function text(payload) {
  return {
    content: [
      {
        type: "text",
        text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

const TOOLS = [
  {
    def: {
      name: "brand_validate",
      description: "Valida un brand.json contra el esquema v1. Recibe la marca inline.",
      inputSchema: {
        type: "object",
        required: ["brand"],
        properties: { brand: { type: "object" } },
      },
    },
    run: async ({ brand }) => {
      const { valid, errors } = await validateBrand(brand);
      return text({ valid, errors });
    },
  },
  {
    def: {
      name: "brand_extract",
      description: "Extrae una marca desde una URL (sin IA): meta, colores, fuentes y favicon.",
      inputSchema: { type: "object", required: ["url"], properties: { url: { type: "string" } } },
    },
    run: async ({ url }) => {
      const { brand, debug } = await extractBrand(url);
      const { valid, errors } = await validateBrand(brand);
      return text({ brand, debug, valid, errors });
    },
  },
  {
    def: {
      name: "brand_list",
      description: "Lista las marcas guardadas en la biblioteca.",
      inputSchema: { type: "object", properties: { dir: { type: "string" } } },
    },
    run: async ({ dir }) => text(await listBrands(resolveLibraryDir(dir))),
  },
  {
    def: {
      name: "brand_save",
      description: "Guarda una marca validada en la biblioteca con un nombre.",
      inputSchema: {
        type: "object",
        required: ["name", "brand"],
        properties: {
          name: { type: "string" },
          brand: { type: "object" },
          dir: { type: "string" },
        },
      },
    },
    run: async ({ name, brand, dir }) => text(await saveBrand(resolveLibraryDir(dir), name, brand)),
  },
  {
    def: {
      name: "brand_get",
      description: "Lee una marca de la biblioteca por nombre.",
      inputSchema: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" }, dir: { type: "string" } },
      },
    },
    run: async ({ name, dir }) => text(await getBrand(resolveLibraryDir(dir), name)),
  },
  {
    def: {
      name: "template_list",
      description: "Lista las plantillas (id, nombre, formato, duración, variables).",
      inputSchema: { type: "object", properties: {} },
    },
    run: async () => {
      const dirs = (await readdir(join(root, "templates"), { withFileTypes: true }))
        .filter((d) => d.isDirectory() && !d.name.startsWith("."))
        .map((d) => d.name)
        .sort();
      const out = [];
      for (const id of dirs) {
        const manifest = await readJson(join(root, "templates", id, "template.json"));
        const html = await readFile(join(root, "templates", id, "index.html"), "utf8");
        out.push({
          ...manifest,
          variables: parseDeclaredVariables(html).map((v) => ({
            id: v.id,
            type: v.type,
            label: v.label,
          })),
        });
      }
      return text(out);
    },
  },
  {
    def: {
      name: "template_instantiate",
      description:
        "Instancia una plantilla con marca (nombre de biblioteca u objeto) + variables de contenido.",
      inputSchema: {
        type: "object",
        required: ["template", "out"],
        properties: {
          template: { type: "string" },
          brand: { type: ["object", "string"] },
          vars: { type: "object" },
          out: { type: "string" },
          format: { type: "string", enum: ["16:9", "9:16", "1:1", "4:5"] },
          brandsDir: { type: "string" },
        },
      },
    },
    run: async ({ template, brand, vars, out, format, brandsDir }) => {
      const brandObj =
        typeof brand === "string"
          ? await getBrand(resolveLibraryDir(brandsDir), brand)
          : (brand ?? {});
      return text(
        await instantiate({
          templateId: template,
          brand: brandObj,
          contentVars: vars ?? {},
          outDir: out,
          format,
        }),
      );
    },
  },
  {
    def: {
      name: "motion_list",
      description: "Lista personalidades de movimiento, presets y transiciones con sus easings.",
      inputSchema: { type: "object", properties: {} },
    },
    run: async () => {
      const personalities = await readJson(join(root, "presets", "motion", "personalities.json"));
      const presets = await readJson(join(root, "presets", "motion", "presets.json"));
      const transitions = await readJson(join(root, "presets", "motion", "transitions.json"));
      return text({
        personalities: personalities.personalities,
        presets: presets.presets,
        transitions: transitions.transitions,
      });
    },
  },
  {
    def: {
      name: "render_plan",
      description: "Planifica el lote de renders por destino (chequea aspecto, no renderiza).",
      inputSchema: {
        type: "object",
        required: ["project"],
        properties: {
          project: { type: "string" },
          dest: { type: "string" },
          quality: { type: "string" },
        },
      },
    },
    run: async ({ project, dest, quality }) => {
      const { aspect } = await readCompositionSize(project);
      const formats = formatsIn(await readFile(join(project, "index.html"), "utf8"));
      return text({
        aspect,
        formats,
        destinations: DEST_IDS,
        plan: planBatch({ dest: dest ?? "all", aspect, quality, formats }),
      });
    },
  },
  {
    def: {
      name: "film_build",
      description:
        "Película de varias escenas desde un storyboard (escenas = plantillas con marca, transiciones xfade, música opcional). dryRun solo instancia las escenas.",
      inputSchema: {
        type: "object",
        required: ["storyboard", "out"],
        properties: {
          storyboard: { type: "object" },
          out: { type: "string" },
          baseDir: { type: "string" },
          format: { type: "string", enum: ["16:9", "9:16", "1:1", "4:5"] },
          quality: { type: "string" },
          dryRun: { type: "boolean" },
        },
      },
    },
    run: async ({ storyboard, out, baseDir, format, quality, dryRun }) =>
      text(
        await buildFilm({
          storyboard,
          outDir: out,
          baseDir: baseDir ?? process.cwd(),
          format,
          quality,
          dryRun: Boolean(dryRun),
        }),
      ),
  },
  {
    def: {
      name: "film_review",
      description:
        "Revisa una película construida: hyperframes check por escena + hoja de 12 fotogramas (review/pelicula.jpg, léela con visión antes de entregar).",
      inputSchema: { type: "object", required: ["out"], properties: { out: { type: "string" } } },
    },
    run: async ({ out }) => text(await reviewFilm({ outDir: out })),
  },
];

function result(id, data) {
  return JSON.stringify({ jsonrpc: "2.0", id, ...data });
}

async function handle(message) {
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") return null;
  const { id, method, params } = message;
  if (method === "initialize") {
    return result(id, {
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "wissmotion", version: "0.1.0" },
      },
    });
  }
  if (method === "notifications/initialized" || method.startsWith("notifications/")) return null;
  if (method === "tools/list") {
    return result(id, { result: { tools: TOOLS.map((t) => t.def) } });
  }
  if (method === "tools/call") {
    const tool = TOOLS.find((t) => t.def.name === params?.name);
    if (!tool) {
      return result(id, {
        error: { code: -32602, message: `herramienta desconocida: ${params?.name}` },
      });
    }
    try {
      return result(id, { result: await tool.run(params?.arguments ?? {}) });
    } catch (e) {
      return result(id, {
        result: { content: [{ type: "text", text: `error: ${e.message}` }], isError: true },
      });
    }
  }
  return result(id, { error: { code: -32601, message: `método desconocido: ${method}` } });
}

export async function serveMCP(input = process.stdin, output = process.stdout) {
  let buffer = "";
  for await (const chunk of input) {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let response = null;
      try {
        response = await handle(JSON.parse(trimmed));
      } catch {
        response = result(null, { error: { code: -32700, message: "JSON inválido" } });
      }
      if (response) output.write(`${response}\n`);
    }
  }
}

// Solo sirve con stdio al ejecutarlo directo; importarlo (tests) no hace nada.
import { pathToFileURL } from "node:url";
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await serveMCP();
}
