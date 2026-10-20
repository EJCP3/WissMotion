// Operaciones sobre un proyecto en disco para el MCP (Fase 8.1): leer su
// estado, fijar variables y aplicar una marca. Sin Studio abierto: archivos.
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { brandToVariables, parseDeclaredVariables } from "../templates/instantiate.mjs";
import { brandFontsLink } from "../templates/fonts.mjs";
import { bakeVariables } from "../film/film.mjs";
import { readCompositionSize } from "../render/render-batch.mjs";
import { validateBrand } from "../brand-kit/validate-brand.mjs";

async function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, "utf8"));
}

/** index.html + compositions/*.html (rutas relativas al proyecto). */
export async function projectHtmlFiles(projectDir) {
  const files = ["index.html"];
  const comps = join(projectDir, "compositions");
  if (existsSync(comps)) {
    for (const name of (await readdir(comps)).sort()) {
      if (name.endsWith(".html")) files.push(`compositions/${name}`);
    }
  }
  return files;
}

export async function projectInfo(projectDir) {
  const dir = resolve(projectDir);
  const html = await readFile(join(dir, "index.html"), "utf8");
  const root = /<div[^>]*data-composition-id[^>]*>/.exec(html)?.[0] ?? "";
  const duration = Number(/data-duration="([\d.]+)"/.exec(root)?.[1] ?? NaN);
  let size = null;
  try {
    size = await readCompositionSize(dir);
  } catch {
    size = null;
  }
  return {
    dir,
    ...size,
    duration: Number.isFinite(duration) ? duration : null,
    compositions: await projectHtmlFiles(dir),
    variables: parseDeclaredVariables(html).map(({ id, type, label, default: d }) => ({
      id,
      type,
      label,
      default: d,
    })),
    values: await readJsonIfExists(join(dir, "variables.json")),
    brand: await readJsonIfExists(join(dir, "brand.json")),
  };
}

async function rewrite(dir, rel, fn) {
  const path = join(dir, rel);
  const before = await readFile(path, "utf8");
  const after = fn(before);
  if (after === before) return false;
  await writeFile(path, after, "utf8");
  return true;
}

/**
 * Fija valores de variables: hornea los defaults declarados en cada HTML y
 * fusiona variables.json (se crea si no existe). Devuelve lo que cambió.
 */
export async function setProjectVariables(projectDir, values, { fonts } = {}) {
  const dir = resolve(projectDir);
  const changed = [];
  for (const rel of await projectHtmlFiles(dir)) {
    const ok = await rewrite(dir, rel, (html) => {
      if (!html.includes("data-composition-variables")) return html;
      const baked = bakeVariables(html, values);
      return fonts ? brandFontsLink(baked, values, fonts) : baked;
    });
    if (ok) changed.push(rel);
  }
  const varsPath = join(dir, "variables.json");
  const current = (await readJsonIfExists(varsPath)) ?? {};
  const next = { ...current, ...values };
  if (JSON.stringify(next) !== JSON.stringify(current)) {
    await writeFile(varsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    changed.push("variables.json");
  }
  return changed;
}

/** Aplica una marca validada al proyecto y la guarda en brand.json. */
export async function applyBrand(projectDir, brand) {
  const { valid, errors } = await validateBrand(brand);
  if (!valid) throw new Error(`marca inválida: ${JSON.stringify(errors)}`);
  const dir = resolve(projectDir);
  const values = brandToVariables(brand);
  // Solo las claves brand* que el proyecto declara: no inventa variables.
  const declared = new Set();
  for (const rel of await projectHtmlFiles(dir)) {
    for (const v of parseDeclaredVariables(await readFile(join(dir, rel), "utf8"))) {
      declared.add(v.id);
    }
  }
  const varsFile = (await readJsonIfExists(join(dir, "variables.json"))) ?? {};
  const scoped = Object.fromEntries(
    Object.entries(values).filter(([id]) => declared.has(id) || id in varsFile),
  );
  const changed = await setProjectVariables(dir, scoped, {
    fonts: brand.fonts?.weights ?? [400, 700],
  });
  await writeFile(join(dir, "brand.json"), `${JSON.stringify(brand, null, 2)}\n`, "utf8");
  return { changed: [...changed, "brand.json"], applied: Object.keys(scoped) };
}
