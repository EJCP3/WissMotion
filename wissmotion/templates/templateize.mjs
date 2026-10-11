// Guarda un proyecto como plantilla (Fase 3): copia index.html + variables
// declaradas a templates/<id>/ con template.json y póster.
//   node templateize.mjs --project ./mi-promo --id mi-plantilla --name "Mi plantilla" [--description "..."]
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDeclaredVariables } from "./instantiate.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export class TemplateizeError extends Error {}

export function slugifyTemplateId(id) {
  const slug = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!slug) throw new TemplateizeError(`id sin slug válido: ${JSON.stringify(id)}`);
  return slug;
}

export async function templateize({ projectDir, id, name, description = "", templatesDir = here }) {
  const slug = slugifyTemplateId(id);
  const html = await readFile(join(projectDir, "index.html"), "utf8").catch(() => {
    throw new TemplateizeError(`${projectDir} no tiene index.html`);
  });
  const declared = parseDeclaredVariables(html);
  if (declared.length === 0) {
    throw new TemplateizeError(
      "el proyecto no declara variables (data-composition-variables): nada que parametrizar",
    );
  }
  const width = /data-width="(\d+)"/.exec(html)?.[1];
  const height = /data-height="(\d+)"/.exec(html)?.[1];
  const dir = join(templatesDir, slug);
  if (existsSync(dir)) throw new TemplateizeError(`la plantilla ${slug} ya existe`);
  await mkdir(dir, { recursive: true });
  await copyFile(join(projectDir, "index.html"), join(dir, "index.html"));
  const manifest = {
    id: slug,
    name: name || slug,
    description,
    format:
      width && height
        ? Number(width) > Number(height)
          ? "16:9"
          : Number(width) < Number(height)
            ? "9:16"
            : "1:1"
        : "16:9",
    width: width ? Number(width) : 1280,
    height: height ? Number(height) : 720,
    duration: 0,
  };
  await writeFile(join(dir, "template.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { dir, manifest, variables: declared.length };
}

function opt(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

// Solo corre con --project (importarlo desde tests no hace nada).
if (process.argv.includes("--project")) {
  const args = process.argv.slice(2);
  try {
    const project = opt(args, "--project");
    const id = opt(args, "--id");
    if (!project || !id)
      throw new TemplateizeError(
        "uso: --project dir --id slug [--name nombre] [--description texto]",
      );
    const { dir, manifest, variables } = await templateize({
      projectDir: resolve(project),
      id,
      name: opt(args, "--name"),
      description: opt(args, "--description") ?? "",
    });
    console.log(
      `OK: plantilla ${manifest.id} en ${dir} (${variables} variables; genera el póster con snapshot)`,
    );
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
