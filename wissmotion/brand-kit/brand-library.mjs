// Biblioteca de marcas: varias marcas guardadas como <slug>.brand.json en un
// directorio (por defecto ~/.wissmotion/brands, override con --dir o
// WISSMOTION_BRANDS_DIR). Todo lo que entra se valida contra el esquema;
// lo inválido nunca se guarda.
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { validateBrand } from "./validate-brand.mjs";

export class BrandLibraryError extends Error {}

export function resolveLibraryDir(override) {
  if (override) return override;
  if (process.env.WISSMOTION_BRANDS_DIR) return process.env.WISSMOTION_BRANDS_DIR;
  return join(homedir(), ".wissmotion", "brands");
}

export function slugify(name) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!slug) throw new BrandLibraryError(`Nombre sin slug válido: ${JSON.stringify(name)}`);
  return slug;
}

function fileFor(dir, slug) {
  return join(dir, `${slug}.brand.json`);
}

async function readBrandFile(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    throw new BrandLibraryError(`No se pudo leer ${file}`);
  }
}

/** Guarda (o reemplaza) una marca validada. Devuelve la ruta del archivo. */
export async function saveBrand(dir, name, brand) {
  const { valid, errors } = await validateBrand(brand);
  if (!valid) {
    throw new BrandLibraryError(
      `Marca inválida: ${errors.map((e) => `${e.instancePath || "/"} ${e.message}`).join("; ")}`,
    );
  }
  const slug = slugify(name);
  await mkdir(dir, { recursive: true });
  const file = fileFor(dir, slug);
  const tmp = join(dir, `.${slug}.${process.pid}.tmp`);
  await writeFile(tmp, `${JSON.stringify(brand, null, 2)}\n`, "utf8");
  await rename(tmp, file);
  return { slug, file };
}

export async function getBrand(dir, name) {
  const slug = slugify(name);
  return readBrandFile(fileFor(dir, slug));
}

export async function deleteBrand(dir, name) {
  const slug = slugify(name);
  try {
    await rm(fileFor(dir, slug));
  } catch {
    throw new BrandLibraryError(`No existe la marca ${JSON.stringify(name)}`);
  }
  return slug;
}

/** Duplica una marca con otro nombre (el contenido puede editarse después). */
export async function duplicateBrand(dir, name, copyName) {
  const brand = await getBrand(dir, name);
  return saveBrand(dir, copyName, brand);
}

/** Lista marcas: solo archivos válidos, con nombre y versión. */
export async function listBrands(dir) {
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const brands = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".brand.json")) continue;
    const brand = await readBrandFile(join(dir, entry));
    const { valid } = await validateBrand(brand);
    if (!valid) continue;
    brands.push({
      slug: entry.slice(0, -".brand.json".length),
      name: typeof brand.name === "string" ? brand.name : entry,
      brandVersion: brand.brandVersion,
    });
  }
  return brands;
}

/** Exporta una marca a una ruta arbitraria (respaldo, compartir). */
export async function exportBrand(dir, name, dest) {
  const brand = await getBrand(dir, name);
  await writeFile(dest, `${JSON.stringify(brand, null, 2)}\n`, "utf8");
  return dest;
}

/** Importa un brand.json externo a la biblioteca (valida antes). */
export async function importBrand(dir, path, name) {
  const brand = await readBrandFile(path);
  return saveBrand(dir, name ?? brand.name, brand);
}

export function tmpLibraryDir() {
  return join(tmpdir(), "wissmotion-brands-");
}
