// Espejo de wissmotion/templates/formats.mjs (applyFormat) para el Studio:
// instala una plantilla multiformato ya en 9:16, 1:1 o 4:5. El test de
// paridad compara ambos; si cambia el original, cambia este.

export const FORMAT_SIZES: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
};

export function applyFormat(html: string, format: string): string {
  const size = FORMAT_SIZES[format];
  if (!size) throw new Error(`formato desconocido: ${format}`);
  const root = /<div\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/.exec(html);
  if (!root) throw new Error("sin composición raíz (data-composition-id)");
  let tag = root[0]
    .replace(/\sdata-width="\d+"/, ` data-width="${size.width}"`)
    .replace(/\sdata-height="\d+"/, ` data-height="${size.height}"`)
    .replace(/\sdata-format="[^"]*"/, "")
    .replace(/\sstyle="[^"]*"/, "");
  tag = tag.replace(
    /^<div\b/,
    `<div data-format="${format}" style="width: ${size.width}px; height: ${size.height}px"`,
  );
  return html.slice(0, root.index) + tag + html.slice(root.index + root[0].length);
}

// Espejo de wissmotion/templates/fonts.mjs: <link data-wm-fonts> de Google
// Fonts con las fuentes de marca (el render no ve var(--brandHeading)).
const GENERIC_FONTS = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "system-ui",
  "cursive",
  "fantasy",
]);
export const DEFAULT_WEIGHTS = [400, 500, 600, 700, 800];

export function fontsHref(families: unknown[], weights: number[] = DEFAULT_WEIGHTS): string | null {
  const names = [
    ...new Set(
      families.map((f) => String(f ?? "").trim()).filter((f) => f && !GENERIC_FONTS.has(f)),
    ),
  ];
  if (names.length === 0) return null;
  const w = [...new Set(weights)].sort((a, b) => a - b).join(";");
  const params = names.map((n) => `family=${n.replace(/ /g, "+")}:wght@${w}`);
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=block`;
}

export function withFontLink(html: string, href: string | null): string {
  if (!href) return html;
  const tag = `<link data-wm-fonts rel="stylesheet" href="${href.replace(/&/g, "&amp;")}" />`;
  if (/<link\s+data-wm-fonts[^>]*>/.test(html)) {
    return html.replace(/<link\s+data-wm-fonts[^>]*>/, tag);
  }
  if (html.includes("<title>")) return html.replace("<title>", `${tag}\n    <title>`);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

export function brandFontsLink(
  html: string,
  values: Record<string, unknown>,
  weights?: number[],
): string {
  const w = weights?.length ? [...weights, 700] : DEFAULT_WEIGHTS;
  return withFontLink(html, fontsHref([values.brandHeading, values.brandBody], w));
}
