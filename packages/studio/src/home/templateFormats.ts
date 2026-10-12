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
