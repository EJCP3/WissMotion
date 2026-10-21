// Tipo de video → criterio de calidad. La plantilla trae uno por defecto
// (criterios.json); el usuario lo cambia o elige "libre" (sin criterio).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const catalog = JSON.parse(readFileSync(join(here, "criterios.json"), "utf8"));
export const criterioIds = Object.keys(catalog.criterios);

/** Criterio efectivo para una plantilla: el pedido o el de la plantilla. */
export function resolveCriterio(templateId, requested) {
  if (requested !== undefined) {
    if (!catalog.criterios[requested]) {
      throw new Error(`criterio ${requested} desconocido (hay: ${criterioIds.join(", ")})`);
    }
    return requested;
  }
  const match = criterioIds.find((id) => catalog.criterios[id].templates.includes(templateId));
  return match ?? catalog.default;
}

/** Ruta del .md desde la raíz del repo, o null para "libre". */
export function criterioFile(id) {
  const file = catalog.criterios[id].file;
  return file ? `wissmotion/criterios/${file}` : null;
}
