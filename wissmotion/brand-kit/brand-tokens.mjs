// Generador de tokens CSS desde brand.json:
//   :root { --brand-primary: …; --brand-font-heading: … }
// Es la forma en que una composición aplica la marca sin colores fijos.
import { readFile, writeFile } from "node:fs/promises";

export function brandToCss(brand) {
  const c = brand.colors;
  const f = brand.fonts;
  const lines = [
    ":root {",
    `  --brand-primary: ${c.primary};`,
    `  --brand-secondary: ${c.secondary};`,
    `  --brand-accent: ${c.accent};`,
    `  --brand-background: ${c.background};`,
    `  --brand-surface: ${c.surface};`,
    `  --brand-text: ${c.text};`,
    `  --brand-font-heading: "${f.heading}", sans-serif;`,
    `  --brand-font-body: "${f.body}", sans-serif;`,
    "}",
    "",
  ];
  return lines.join("\n");
}

const [input, output] = process.argv.slice(2);
if (input && output) {
  const brand = JSON.parse(await readFile(input, "utf8"));
  await writeFile(output, brandToCss(brand), "utf8");
  console.log(`OK: tokens escritos en ${output}`);
}
