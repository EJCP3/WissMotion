// Paquete .wissmotion (Fase 9): zip exportable con composición + marca +
// assets para compartir o respaldar. Sin dependencias nativas (fflate).
//   node package.mjs --export ./mi-promo --out ./mi-promo.wissmotion
//   node package.mjs --import ./mi-promo.wissmotion --out ./restaurado
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { validateBrand } from "../brand-kit/validate-brand.mjs";

const FORMAT = "wissmotion-package";
const VERSION = 1;
const MAX_FILE_BYTES = 50_000_000;

export class PackageError extends Error {}

const SKIP_DIRS = new Set(["renders", "snapshots", "node_modules", ".git", ".hg"]);

async function collect(dir, base = dir, out = {}) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await collect(full, base, out);
    } else if (entry.isFile()) {
      const data = await readFile(full);
      if (data.length > MAX_FILE_BYTES) {
        throw new PackageError(`${full} excede 50 MB`);
      }
      out[relative(base, full).split(sep).join("/")] = data;
    }
  }
  return out;
}

export async function exportProject(projectDir, outFile) {
  const root = resolve(projectDir);
  const files = await collect(root);
  if (!files["index.html"]) throw new PackageError("el proyecto no tiene index.html");
  if (files["brand.json"]) {
    const { valid, errors } = await validateBrand(
      JSON.parse(Buffer.from(files["brand.json"]).toString("utf8")),
    );
    if (!valid) {
      throw new PackageError(`brand.json inválido: ${errors.map((e) => e.message).join("; ")}`);
    }
  }
  files["wissmotion.json"] = strToU8(
    `${JSON.stringify({ format: FORMAT, version: VERSION, createdAt: new Date().toISOString() }, null, 2)}\n`,
  );
  await mkdir(dirname(resolve(outFile)), { recursive: true });
  await writeFile(outFile, zipSync(files, { level: 6 }));
  return { file: resolve(outFile), entries: Object.keys(files).length };
}

export async function importPackage(zipFile, destDir) {
  let entries;
  try {
    entries = unzipSync(await readFile(zipFile));
  } catch {
    throw new PackageError(`${zipFile} no es un zip válido`);
  }
  const manifestRaw = entries["wissmotion.json"];
  if (!manifestRaw) throw new PackageError("no es un paquete .wissmotion (falta wissmotion.json)");
  const manifest = JSON.parse(strFromU8(manifestRaw));
  if (manifest.format !== FORMAT || manifest.version !== VERSION) {
    throw new PackageError(`paquete incompatible: ${manifest.format} v${manifest.version}`);
  }
  if (!entries["index.html"]) throw new PackageError("el paquete no trae index.html");
  const dest = resolve(destDir);
  await mkdir(dest, { recursive: true });
  for (const [name, data] of Object.entries(entries)) {
    if (name.includes("..")) throw new PackageError(`ruta insegura en el zip: ${name}`);
    const target = join(dest, ...name.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
  }
  return { dir: dest, entries: Object.keys(entries).length };
}

function opt(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

// Solo corre con --export/--import (importarlo desde tests no hace nada).
if (process.argv.includes("--export") || process.argv.includes("--import")) {
  const args = process.argv.slice(2);
  const out = opt(args, "--out");
  try {
    if (!out) throw new PackageError("falta --out");
    if (process.argv.includes("--export")) {
      const project = opt(args, "--export");
      if (!project) throw new PackageError("falta proyecto en --export");
      const { file, entries } = await exportProject(project, out);
      console.log(`OK: ${file} (${entries} archivos)`);
    } else {
      const zip = opt(args, "--import");
      if (!zip) throw new PackageError("falta zip en --import");
      const { dir, entries } = await importPackage(zip, out);
      console.log(`OK: ${dir} (${entries} archivos)`);
    }
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
