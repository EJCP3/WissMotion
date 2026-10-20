// Servidor MCP de WissMotion (Fase 8.1, transporte stdio).
// Expone el Brand Kit, las plantillas, el kit de movimiento y el render por
// lotes a cualquier agente (Claude Code, OpenCode, Cursor…) sin dependencias:
// JSON-RPC NDJSON sobre stdin/stdout según el protocolo MCP
// (initialize → notifications/initialized → tools/list → tools/call).
// Uso: node mcp.mjs  (los agentes lo lanzan con `npx wissmotion mcp`).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBrand } from "../brand-kit/validate-brand.mjs";
import { extractBrand } from "../brand-kit/extract-lib.mjs";
import { getBrand, listBrands, resolveLibraryDir, saveBrand } from "../brand-kit/brand-library.mjs";
import { instantiate, parseDeclaredVariables } from "../templates/instantiate.mjs";
import {
  formatsIn,
  planBatch,
  readCompositionSize,
  runBatch,
  DEST_IDS,
} from "../render/render-batch.mjs";
import { buildFilm, reviewFilm } from "../film/film.mjs";
import { runVoiceover } from "../audio/voiceover.mjs";
import { applyBrand, projectInfo, setProjectVariables } from "./project-ops.mjs";
import { PROMPTS, RESOURCES } from "./mcp-context.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CLI = join(root, "..", "packages", "cli", "dist", "cli.js");

function runCli(args, timeout = 300_000) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    timeout,
    maxBuffer: 32 * 1024 * 1024,
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// Puente con el Studio abierto (rutas /api/agent-bridge del servidor del Studio).
export const STUDIO_URL = process.env.WISSMOTION_STUDIO_URL ?? "http://127.0.0.1:5190";

async function studioFetch(path, body) {
  const res = await fetch(`${STUDIO_URL}/api/agent-bridge${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function resolveBrand(brand, brandsDir) {
  return typeof brand === "string" ? getBrand(resolveLibraryDir(brandsDir), brand) : brand;
}

export async function listTemplates() {
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
  return out;
}

export async function motionKit() {
  const personalities = await readJson(join(root, "presets", "motion", "personalities.json"));
  const presets = await readJson(join(root, "presets", "motion", "presets.json"));
  const transitions = await readJson(join(root, "presets", "motion", "transitions.json"));
  return {
    personalities: personalities.personalities,
    presets: presets.presets,
    transitions: transitions.transitions,
  };
}

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
    run: async () => text(await listTemplates()),
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
          duration: {
            type: "number",
            description: "Segundos (6, 15, 30, 60…): re-escala el timing",
          },
          brandsDir: { type: "string" },
        },
      },
    },
    run: async ({ template, brand, vars, out, format, duration, brandsDir }) => {
      const brandObj = (await resolveBrand(brand, brandsDir)) ?? {};
      return text(
        await instantiate({
          templateId: template,
          brand: brandObj,
          contentVars: vars ?? {},
          outDir: out,
          format,
          duration,
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
    run: async () => text(await motionKit()),
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
  {
    def: {
      name: "project_info",
      description:
        "Estado de un proyecto: tamaño, aspecto, duración, composiciones, variables declaradas, variables.json y brand.json.",
      inputSchema: {
        type: "object",
        required: ["project"],
        properties: { project: { type: "string" } },
      },
    },
    run: async ({ project }) => text(await projectInfo(project)),
  },
  {
    def: {
      name: "project_set_variables",
      description:
        "Fija valores de variables (textos, colores, imágenes): hornea los defaults en cada HTML y fusiona variables.json.",
      inputSchema: {
        type: "object",
        required: ["project", "values"],
        properties: { project: { type: "string" }, values: { type: "object" } },
      },
    },
    run: async ({ project, values }) =>
      text({ changed: await setProjectVariables(project, values) }),
  },
  {
    def: {
      name: "brand_apply",
      description:
        "Aplica una marca (objeto o nombre de biblioteca) a un proyecto existente: variables brand*, fuentes y brand.json.",
      inputSchema: {
        type: "object",
        required: ["project", "brand"],
        properties: {
          project: { type: "string" },
          brand: { type: ["object", "string"] },
          brandsDir: { type: "string" },
        },
      },
    },
    run: async ({ project, brand, brandsDir }) =>
      text(await applyBrand(project, await resolveBrand(brand, brandsDir))),
  },
  {
    def: {
      name: "lint_check",
      description:
        "hyperframes lint del proyecto (errores de estructura). 0 errores antes de entregar.",
      inputSchema: {
        type: "object",
        required: ["project"],
        properties: { project: { type: "string" } },
      },
    },
    run: async ({ project }) => {
      const r = runCli(["lint", resolve(project), "--json"], 120_000);
      try {
        return text(JSON.parse(r.stdout.slice(r.stdout.indexOf("{"))));
      } catch {
        return text({ status: r.status, output: (r.stdout + r.stderr).slice(0, 4000) });
      }
    },
  },
  {
    def: {
      name: "frame_snapshot",
      description:
        "Captura fotogramas del video y los devuelve como imágenes para revisarlos con visión. at = segundos.",
      inputSchema: {
        type: "object",
        required: ["project"],
        properties: {
          project: { type: "string" },
          at: { type: "array", items: { type: "number" } },
          frames: { type: "number" },
        },
      },
    },
    run: async ({ project, at, frames }) => {
      const dir = resolve(project);
      const outDir = join(dir, "snapshots", "mcp");
      await mkdir(outDir, { recursive: true });
      const args = ["snapshot", dir, "-o", outDir, "--describe", "false"];
      if (at?.length) args.push("--at", at.join(","), "--no-end");
      else args.push("--frames", String(Math.min(frames ?? 4, 8)));
      const r = runCli(args);
      const pngs = existsSync(outDir)
        ? (await readdir(outDir))
            .filter((f) => f.endsWith(".png"))
            .sort()
            .slice(0, 8)
        : [];
      if (pngs.length === 0) {
        return text(`error: sin fotogramas\n${(r.stdout + r.stderr).slice(0, 2000)}`);
      }
      const content = [{ type: "text", text: `Fotogramas en ${outDir}: ${pngs.join(", ")}` }];
      for (const f of pngs) {
        const data = (await readFile(join(outDir, f))).toString("base64");
        content.push({ type: "image", data, mimeType: "image/png" });
      }
      return { content };
    },
  },
  {
    def: {
      name: "render_batch",
      description:
        "Renderiza el proyecto para los destinos (reels, tiktok, youtube… o all). Tarda: usa dryRun para ver el plan primero.",
      inputSchema: {
        type: "object",
        required: ["project"],
        properties: {
          project: { type: "string" },
          dest: { type: "string" },
          quality: { type: "string" },
          scale: { type: "string", enum: ["1080p", "4k"] },
          fps: { type: "number", enum: [24, 30, 60] },
          dryRun: { type: "boolean" },
        },
      },
    },
    run: async ({ project, dest, quality, scale, fps, dryRun }) =>
      text(
        await runBatch({ projectDir: project, dest, quality, scale, fps, dryRun: Boolean(dryRun) }),
      ),
  },
  {
    def: {
      name: "voiceover_generate",
      description:
        "Voz en off local (Kokoro vía hyperframes tts): un WAV por segmento del guion en outDir.",
      inputSchema: {
        type: "object",
        required: ["script", "outDir"],
        properties: {
          script: {
            type: "array",
            items: {
              type: "object",
              required: ["text"],
              properties: { id: { type: "string" }, text: { type: "string" } },
            },
          },
          outDir: { type: "string" },
          voice: { type: "string" },
          lang: { type: "string" },
          dryRun: { type: "boolean" },
        },
      },
    },
    run: async ({ script, outDir, voice, lang, dryRun }) =>
      text(await runVoiceover({ script, outDir, voice, lang, dryRun: Boolean(dryRun) })),
  },
  {
    def: {
      name: "studio_status",
      description:
        "¿Está el Studio abierto en el navegador? Devuelve sus herramientas en vivo (studio_*: seleccionar, cambiar textos, animar, mover…) para usarlas con studio_call.",
      inputSchema: { type: "object", properties: {} },
    },
    run: async () => {
      try {
        const { data } = await studioFetch("/hello", {});
        return text({
          studioUrl: STUDIO_URL,
          studioConnected: Boolean(data?.studioConnected),
          tools: (data?.tools ?? []).map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
          hint: data?.studioConnected
            ? "Usa studio_call con { tool, input }: el usuario ve cada cambio en vivo."
            : "Abre el Studio (bun run studio) en el navegador; mientras tanto usa las herramientas de archivos (project_*).",
        });
      } catch (e) {
        return text({
          studioUrl: STUDIO_URL,
          studioConnected: false,
          error: `servidor del Studio no responde (${e.message}). Arráncalo con bun run studio o fija WISSMOTION_STUDIO_URL.`,
        });
      }
    },
  },
  {
    def: {
      name: "studio_call",
      description:
        "Ejecuta una herramienta del Studio abierto (ver studio_status) sobre el proyecto que el usuario tiene delante; la edición se ve en vivo y se puede deshacer.",
      inputSchema: {
        type: "object",
        required: ["tool"],
        properties: { tool: { type: "string" }, input: { type: "object" } },
      },
    },
    run: async ({ tool, input }) => {
      const { status, data } = await studioFetch("/call", { tool, input: input ?? {} });
      if (status !== 200) throw new Error(data?.error ?? `Studio respondió ${status}`);
      return text(data.result);
    },
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
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: "wissmotion", version: "0.1.0" },
      },
    });
  }
  if (method === "notifications/initialized" || method.startsWith("notifications/")) return null;
  if (method === "tools/list") {
    return result(id, { result: { tools: TOOLS.map((t) => t.def) } });
  }
  if (method === "resources/list") {
    return result(id, { result: { resources: RESOURCES.map(({ read: _read, ...r }) => r) } });
  }
  if (method === "resources/read") {
    const res = RESOURCES.find((r) => r.uri === params?.uri);
    if (!res)
      return result(id, {
        error: { code: -32602, message: `recurso desconocido: ${params?.uri}` },
      });
    const payload = await res.read({ listTemplates, motionKit });
    const body = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    return result(id, {
      result: { contents: [{ uri: res.uri, mimeType: res.mimeType, text: body }] },
    });
  }
  if (method === "prompts/list") {
    return result(id, { result: { prompts: PROMPTS.map(({ build: _build, ...p }) => p) } });
  }
  if (method === "prompts/get") {
    const prompt = PROMPTS.find((p) => p.name === params?.name);
    if (!prompt)
      return result(id, {
        error: { code: -32602, message: `prompt desconocido: ${params?.name}` },
      });
    const textBody = prompt.build(params?.arguments ?? {});
    return result(id, {
      result: {
        description: prompt.description,
        messages: [{ role: "user", content: { type: "text", text: textBody } }],
      },
    });
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
