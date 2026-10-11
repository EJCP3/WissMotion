import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Hono } from "hono";

interface ExtractModule {
  extractBrand: (
    url: string,
    opts?: { timeoutMs?: number },
  ) => Promise<{
    brand: unknown;
    debug: unknown;
  }>;
}

// El extractor vive en wissmotion/brand-kit (fuera del paquete npm), así que
// no se importa estático: se busca subiendo desde el cwd (repo en dev/test)
// o desde WISSMOTION_ROOT. Instalado sin wissmotion/ responde 501.
// (import.meta.url no sirve: bajo vitest/SSR no siempre es file://.)
function locateExtractor(): string | null {
  const roots: string[] = [];
  if (process.env.WISSMOTION_ROOT) roots.push(process.env.WISSMOTION_ROOT);
  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    roots.push(dir);
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  for (const root of roots) {
    const file = join(root, "wissmotion", "brand-kit", "extract-lib.mjs");
    if (existsSync(file)) return pathToFileURL(file).href;
  }
  return null;
}

async function loadExtractor(from?: string): Promise<ExtractModule | null> {
  const href = from ?? locateExtractor();
  if (!href) return null;
  try {
    return (await import(href)) as ExtractModule;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function registerBrandExtractRoutes(api: Hono, opts?: { extractorUrl?: string }): void {
  // fallow-ignore-next-line complexity
  api.post("/brand/extract", async (c) => {
    const body = await c.req.json().catch(() => null);
    const url = isRecord(body) && typeof body.url === "string" ? body.url.trim() : "";
    if (!url) return c.json({ error: "url requerida" }, 400);
    const mod = await loadExtractor(opts?.extractorUrl);
    if (!mod) {
      return c.json({ error: "extractor de marca no disponible en esta instalación" }, 501);
    }
    try {
      const { brand, debug } = await mod.extractBrand(url, { timeoutMs: 25000 });
      return c.json({ brand, debug });
    } catch (error) {
      const message = error instanceof Error ? error.message : "extracción fallida";
      return c.json({ error: message }, 502);
    }
  });
}
