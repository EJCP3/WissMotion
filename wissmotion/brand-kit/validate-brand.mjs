// Validador CLI del Brand Kit: node validate-brand.mjs <brand.json>
// Sale 0 si la marca cumple brand.schema.json, 1 si no (lista los errores).
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { contrast } from "./extract-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export async function loadBrandSchema() {
  const raw = await readFile(join(here, "brand.schema.json"), "utf8");
  return JSON.parse(raw);
}

export async function validateBrand(brand) {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(await loadBrandSchema());
  const valid = validate(brand);
  return { valid, errors: validate.errors ?? [] };
}

/**
 * Pares de colores de la marca con contraste WCAG < 3:1: nunca texto en
 * ese par; una forma de un color sobre el otro lleva contorno del color `text`.
 */
export function forbiddenPairs(brand, min = 3) {
  const entries = Object.entries(brand.colors);
  const pairs = [];
  for (const [i, [a, ca]] of entries.entries()) {
    for (const [b, cb] of entries.slice(i + 1)) {
      const ratio = contrast(ca, cb);
      if (ratio < min) pairs.push({ a, b, ratio: Math.round(ratio * 100) / 100 });
    }
  }
  return pairs;
}

const target = process.argv[2];
// Solo corre directo (node validate-brand.mjs <marca>); al importarlo desde
// otro script (p. ej. brand-library.mjs) argv[1] es otro archivo y no hace nada.
const isMain = !!process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (target && isMain) {
  const raw = await readFile(target, "utf8");
  const { valid, errors } = await validateBrand(JSON.parse(raw));
  if (valid) {
    console.log(`OK: ${target} cumple brand.schema.json (v1)`);
    const brand = JSON.parse(raw);
    for (const p of forbiddenPairs(brand)) {
      console.log(`  par prohibido (texto): ${p.a} / ${p.b} — ${p.ratio}:1 < 3:1`);
    }
  } else {
    console.error(`FALLA: ${target} no cumple brand.schema.json (v1):`);
    for (const e of errors) console.error(`- ${e.instancePath || "/"} ${e.message}`);
    process.exitCode = 1;
  }
}
