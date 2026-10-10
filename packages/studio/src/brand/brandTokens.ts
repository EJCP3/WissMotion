import type { BrandV1 } from "./brandTypes";

/**
 * brand.json → `:root { --brand-*: … }`. Espejo TypeScript de
 * wissmotion/brand-kit/brand-tokens.mjs (el .mjs es el canónico para CLI;
 * esto evita meter Node al bundle del Studio por una función de 10 líneas).
 */
export function brandToCss(brand: BrandV1): string {
  const c = brand.colors;
  const f = brand.fonts;
  return [
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
  ].join("\n");
}
