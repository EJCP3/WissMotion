// Instancia una plantilla con marca + contenido, sin escribir código:
//   node instantiate.mjs --template promo-app --brand ../brand-kit/brand.example.json \
//     --vars vars.json --out ./mi-promo
// Copia index.html, fusiona variables (marca + contenido) a variables.json y
// deja el comando de render listo en README.md. El render usa
// `--variables-file` (y `--strict-variables` en CI).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBrand } from "../brand-kit/validate-brand.mjs";
import { applyFormat, supportedFormats } from "./formats.mjs";
import { brandFontsLink } from "./fonts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const TYPES = new Set(["string", "number", "color", "boolean", "enum"]);

// brand.json → ids de variable estándar que las plantillas declaran.
const BRAND_MAP = [
  ["brandPrimary", "colors", "primary"],
  ["brandSecondary", "colors", "secondary"],
  ["brandAccent", "colors", "accent"],
  ["brandBackground", "colors", "background"],
  ["brandSurface", "colors", "surface"],
  ["brandText", "colors", "text"],
  ["brandHeading", "fonts", "heading"],
  ["brandBody", "fonts", "body"],
  ["brandLogo", "logo", "full"],
  ["brandName", null, "name"],
  ["brandTagline", null, "tagline"],
];

export function parseDeclaredVariables(html) {
  const m = /<html[^>]*data-composition-variables='(\[[\s\S]*?\])'/.exec(html);
  if (!m) return [];
  const declared = JSON.parse(m[1]);
  if (!Array.isArray(declared)) throw new Error("data-composition-variables no es un array");
  const seen = new Set();
  for (const v of declared) {
    if (!v.id || seen.has(v.id))
      throw new Error(`variable duplicada o sin id: ${JSON.stringify(v)}`);
    seen.add(v.id);
    if (!TYPES.has(v.type))
      throw new Error(`variable ${v.id}: tipo ${JSON.stringify(v.type)} desconocido`);
    if (v.default === undefined) throw new Error(`variable ${v.id}: sin default`);
    if (v.type === "enum" && !Array.isArray(v.options)) {
      throw new Error(`variable ${v.id}: enum sin options`);
    }
  }
  return declared;
}

export function brandToVariables(brand) {
  const out = {};
  for (const [id, group, key] of BRAND_MAP) {
    const value = group ? brand[group]?.[key] : brand[key];
    if (value !== undefined) out[id] = value;
  }
  return out;
}

export async function instantiate({
  templateId,
  brand,
  contentVars,
  outDir,
  format,
  templatesDir = here,
}) {
  const dir = join(templatesDir, templateId);
  const [html, manifestRaw] = await Promise.all([
    readFile(join(dir, "index.html"), "utf8"),
    readFile(join(dir, "template.json"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestRaw);
  if (manifest.id !== templateId)
    throw new Error(`template.json id ${manifest.id} ≠ ${templateId}`);
  const formats = supportedFormats(manifest);
  if (format && !formats.includes(format)) {
    throw new Error(`${templateId} no tiene layout ${format} (soporta: ${formats.join(", ")})`);
  }
  const declared = parseDeclaredVariables(html);
  const declaredIds = new Set(declared.map((v) => v.id));

  const { valid, errors } = await validateBrand(brand);
  if (!valid) {
    throw new Error(`brand.json inválido: ${errors.map((e) => e.message).join("; ")}`);
  }
  const overrides = { ...contentVars };
  for (const [id, value] of Object.entries(brandToVariables(brand))) {
    if (declaredIds.has(id) && overrides[id] === undefined) overrides[id] = value;
  }
  const unknown = Object.keys(contentVars).filter((k) => !declaredIds.has(k));
  if (unknown.length > 0) throw new Error(`variables no declaradas: ${unknown.join(", ")}`);

  await mkdir(outDir, { recursive: true });
  // Formato pedido + <link> de Google Fonts con las fuentes efectivas (sin él,
  // el render no incrusta la fuente de marca y cae a Times; ver fonts.mjs).
  const effective = Object.fromEntries(declared.map((v) => [v.id, overrides[v.id] ?? v.default]));
  const formatted = format && format !== manifest.format ? applyFormat(html, format) : html;
  await writeFile(
    join(outDir, "index.html"),
    brandFontsLink(formatted, effective, brand.fonts?.weights),
    "utf8",
  );
  await writeFile(
    join(outDir, "variables.json"),
    `${JSON.stringify(overrides, null, 2)}\n`,
    "utf8",
  );
  await writeFile(join(outDir, "brand.json"), `${JSON.stringify(brand, null, 2)}\n`, "utf8");
  await writeFile(
    join(outDir, "README.md"),
    `# ${manifest.name} (instancia de ${templateId})\n\nVariables en \`variables.json\` (editables en el panel Variables del Studio).\n\n\`\`\`bash\nnode packages/cli/dist/cli.js render . --variables-file variables.json\n\`\`\`\n`,
    "utf8",
  );
  return { manifest, variables: overrides };
}

function opt(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), "utf8"));
}

// Solo corre con --template (importarlo desde tests no hace nada).
if (process.argv.includes("--template")) {
  const templateId = opt(process.argv.slice(2), "--template");
  const out = opt(process.argv.slice(2), "--out");
  if (!templateId || !out) {
    console.error(
      "Uso: node instantiate.mjs --template <id> --brand brand.json [--vars vars.json] [--format 9:16] --out dir",
    );
    process.exit(2);
  }
  try {
    const brandPath = opt(process.argv.slice(2), "--brand");
    const varsPath = opt(process.argv.slice(2), "--vars");
    const brand = brandPath ? await readJson(brandPath) : {};
    const contentVars = varsPath ? await readJson(varsPath) : {};
    const { manifest, variables } = await instantiate({
      templateId,
      brand,
      contentVars,
      outDir: resolve(out),
      format: opt(process.argv.slice(2), "--format"),
    });
    console.log(`OK: ${manifest.name} en ${out} (${Object.keys(variables).length} variables)`);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
