// Sincroniza wissmotion/templates/*.html al bundle del Studio:
// genera packages/studio/src/home/wissmotionTemplates.generated.ts con el
// HTML como strings (tsup/esbuild, que compila el paquete para npm, no tiene
// loader ?raw de Vite; los PNG sí pasan como assets).
// Uso: node wissmotion/sync-templates.mjs [--check]  (--check falla si el
// generado está desactualizado; lo usa el test de frescura).
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(here, "templates");
const outFile = join(
  here,
  "..",
  "packages",
  "studio",
  "src",
  "home",
  "wissmotionTemplates.generated.ts",
);

export async function buildGeneratedSource() {
  const ids = (await readdir(templatesDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const entries = [];
  for (const id of ids) {
    const html = await readFile(join(templatesDir, id, "index.html"), "utf8");
    entries.push(`  ${JSON.stringify(id)}: ${JSON.stringify(html)},`);
  }
  return [
    "// GENERATED — no editar a mano. Generado por wissmotion/sync-templates.mjs.",
    "// tsup (build npm del Studio) no entiende ?raw de Vite; el HTML viaja aquí",
    "// como strings y los PNG siguen como assets.",
    `export const TEMPLATE_HTML: Record<string, string> = {`,
    ...entries,
    `};`,
    "",
  ].join("\n");
}

const isMain = !!process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const check = process.argv.includes("--check");
  const source = await buildGeneratedSource();
  if (check) {
    const current = await readFile(outFile, "utf8").catch(() => "");
    if (current !== source) {
      console.error(
        "wissmotionTemplates.generated.ts desactualizado: corre node wissmotion/sync-templates.mjs",
      );
      process.exitCode = 1;
    } else {
      console.log("OK: generado al día");
    }
  } else {
    await writeFile(outFile, source, "utf8");
    console.log(`OK: ${outFile}`);
  }
}
