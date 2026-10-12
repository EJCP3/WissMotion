// Fuentes de marca en el render. Las plantillas usan var(--brandHeading) /
// var(--brandBody), que se resuelven en tiempo de ejecución: el inyector de
// fuentes deterministas del render no las ve y el texto cae a Times. Un
// <link data-wm-fonts> de Google Fonts sí lo procesa (lo incrusta sin red en
// render), así que cada plantilla trae uno (Inter) y al instanciar se
// reescribe con las fuentes de la marca.

const GENERIC = new Set(["serif", "sans-serif", "monospace", "system-ui", "cursive", "fantasy"]);
export const DEFAULT_WEIGHTS = [400, 500, 600, 700, 800];

/** URL css2 de Google Fonts para `families` (sin genéricas ni repetidas). */
export function fontsHref(families, weights = DEFAULT_WEIGHTS) {
  const names = [
    ...new Set(families.map((f) => String(f ?? "").trim()).filter((f) => f && !GENERIC.has(f))),
  ];
  if (names.length === 0) return null;
  const w = [...new Set(weights)].sort((a, b) => a - b).join(";");
  const params = names.map((n) => `family=${n.replace(/ /g, "+")}:wght@${w}`);
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=block`;
}

/** Pone (o reemplaza) el <link data-wm-fonts> en el <head>. */
export function withFontLink(html, href) {
  if (!href) return html;
  const tag = `<link data-wm-fonts rel="stylesheet" href="${href.replace(/&/g, "&amp;")}" />`;
  if (/<link\s+data-wm-fonts[^>]*>/.test(html)) {
    return html.replace(/<link\s+data-wm-fonts[^>]*>/, tag);
  }
  if (html.includes("<title>")) return html.replace("<title>", `${tag}\n    <title>`);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

/**
 * Link con las fuentes efectivas: valores (marca/contenido) sobre los
 * defaults declarados. Los pesos de la marca se respetan y se añade 700
 * (titulares) para no depender de negrita sintética.
 */
export function brandFontsLink(html, values, weights) {
  const families = [values.brandHeading, values.brandBody];
  const w = weights?.length ? [...weights, 700] : DEFAULT_WEIGHTS;
  return withFontLink(html, fontsHref(families, w));
}
