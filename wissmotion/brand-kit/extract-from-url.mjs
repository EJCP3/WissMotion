// CLI del extractor: node extract-from-url.mjs <url> --out brand.json [--screenshots dir]
// Sin IA y sin navegador para meta/colores/fuentes/favicon. Las capturas
// desktop opcionales usan el `hyperframes capture` ya compilado
// (packages/cli/dist/cli.js); si falla o no existe, avisa y sigue sin ellas.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BrandExtractError, extractBrand } from "./extract-lib.mjs";
import { resolveLibraryDir, saveBrand } from "./brand-library.mjs";
import { validateBrand } from "./validate-brand.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/** Corre `hyperframes capture` y devuelve screenshots.desktop si hay plate. */
export function captureDesktop(
  url,
  dir,
  cliPath = join(here, "..", "..", "packages", "cli", "dist", "cli.js"),
) {
  if (!existsSync(cliPath)) {
    console.error(`aviso: CLI no compilado en ${cliPath} (corre bun run build); sin capturas`);
    return null;
  }
  mkdirSync(dir, { recursive: true });
  const r = spawnSync(
    process.execPath,
    [cliPath, "capture", url, "-o", resolve(dir), "--max-screenshots", "2", "--skip-vision"],
    { timeout: 240_000, stdio: "ignore" },
  );
  const plate = join(resolve(dir), "screenshots", "full-page.png");
  if (r.status !== 0 || !existsSync(plate)) {
    console.error("aviso: capture falló o no dejó plate; sin capturas");
    return null;
  }
  return plate;
}

function opt(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? undefined : v;
}

async function main() {
  const [url, ...rest] = process.argv.slice(2);
  const out = opt(rest, "--out");
  if (!url || url.startsWith("--") || !out) {
    console.error(
      "Uso: node extract-from-url.mjs <url> --out brand.json [--screenshots dir] [--timeout ms] [--save nombre] [--brands-dir dir]",
    );
    process.exit(2);
  }
  const shots = opt(rest, "--screenshots");
  const timeoutRaw = opt(rest, "--timeout");
  const timeoutMs = timeoutRaw === undefined ? 20000 : Number(timeoutRaw);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    console.error("--timeout debe ser un entero positivo (ms)");
    process.exit(2);
  }
  try {
    const { brand, debug } = await extractBrand(url, { timeoutMs });
    if (shots) {
      const plate = captureDesktop(url, shots);
      if (plate) brand.screenshots = { desktop: plate.split("\\").join("/") };
      else console.error("nota: completa screenshots a mano o reintenta con --screenshots");
    }
    const { valid, errors } = await validateBrand(brand);
    if (!valid) {
      console.error("La marca extraída no valida:");
      for (const e of errors) console.error(`- ${e.instancePath || "/"} ${e.message}`);
      process.exitCode = 1;
    } else {
      await writeFile(out, `${JSON.stringify(brand, null, 2)}\n`, "utf8");
      console.log(
        `OK: ${out} (${debug.cssFiles} CSS, ${debug.colorCount} colores, ${debug.fontCount} fuentes)`,
      );
      const saveName = opt(rest, "--save");
      if (saveName) {
        const dir = resolveLibraryDir(opt(rest, "--brands-dir"));
        const { slug, file } = await saveBrand(dir, saveName, brand);
        console.log(`OK: guardada en la biblioteca como ${slug} (${file})`);
      }
    }
  } catch (e) {
    console.error(e instanceof BrandExtractError ? `error: ${e.message}` : e);
    process.exitCode = 1;
  }
}

// Solo corre el CLI con argumentos reales; importarlo (tests) no hace nada.
if (process.argv[2] && !process.argv[2].startsWith("--")) await main();
