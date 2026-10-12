// Multiformato: una plantilla declara en template.json los formatos que
// soporta ("formats") y en su CSS la composición de cada uno bajo
// #stage[data-format="9:16"] … (el 16:9 por defecto queda intacto).
// applyFormat fija el tamaño del lienzo y la marca data-format en la
// composición raíz; el resto (posiciones, tamaños de letra) lo pone el CSS.

export const FORMAT_SIZES = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
};

/** Archivo derivado junto al index.html (se regenera en cada render; no editar). */
export function formatFileName(format) {
  return `.format-${format.replace(":", "x")}.html`;
}

/** ¿El HTML trae layout para `format`? (su CSS usa [data-format="…"]). */
export function htmlSupportsFormat(html, format) {
  return html.includes(`[data-format="${format}"]`);
}

/** Formatos que soporta la plantilla (el suyo propio va siempre). */
export function supportedFormats(manifest) {
  return [...new Set([manifest.format, ...(manifest.formats ?? [])])];
}

/** Devuelve el HTML con la composición raíz en `format`. */
export function applyFormat(html, format) {
  const size = FORMAT_SIZES[format];
  if (!size) throw new Error(`formato desconocido: ${format}`);
  const root = /<div\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/.exec(html);
  if (!root) throw new Error("sin composición raíz (data-composition-id)");
  let tag = root[0]
    .replace(/\sdata-width="\d+"/, ` data-width="${size.width}"`)
    .replace(/\sdata-height="\d+"/, ` data-height="${size.height}"`)
    .replace(/\sdata-format="[^"]*"/, "")
    .replace(/\sstyle="[^"]*"/, "");
  // El tamaño va inline (gana al CSS del 16:9) y data-format activa el layout.
  tag = tag.replace(
    /^<div\b/,
    `<div data-format="${format}" style="width: ${size.width}px; height: ${size.height}px"`,
  );
  return html.slice(0, root.index) + tag + html.slice(root.index + root[0].length);
}
