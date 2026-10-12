// Catálogo WissMotion para la galería del Home: las plantillas con su
// HTML (generado), manifiesto, póster y variables parseadas. El HTML viaja
// en wissmotionTemplates.generated.ts (ver wissmotion/sync-templates.mjs)
// porque tsup no entiende ?raw; los PNG sí pasan como assets. En dev,
// vite.config `server.fs.allow` deja leer wissmotion/templates.

import { TEMPLATE_HTML } from "./wissmotionTemplates.generated";
import promoAppManifest from "../../../../wissmotion/templates/promo-app/template.json";
import promoAppPoster from "../../../../wissmotion/templates/promo-app/preview.png";
import promoWebManifest from "../../../../wissmotion/templates/promo-web/template.json";
import promoWebPoster from "../../../../wissmotion/templates/promo-web/preview.png";
import logoStingManifest from "../../../../wissmotion/templates/logo-sting/template.json";
import logoStingPoster from "../../../../wissmotion/templates/logo-sting/preview.png";
import featureHighlightManifest from "../../../../wissmotion/templates/feature-highlight/template.json";
import featureHighlightPoster from "../../../../wissmotion/templates/feature-highlight/preview.png";
import statsManifest from "../../../../wissmotion/templates/stats/template.json";
import statsPoster from "../../../../wissmotion/templates/stats/preview.png";
import testimoniosManifest from "../../../../wissmotion/templates/testimonios/template.json";
import testimoniosPoster from "../../../../wissmotion/templates/testimonios/preview.png";
import ofertaManifest from "../../../../wissmotion/templates/oferta/template.json";
import ofertaPoster from "../../../../wissmotion/templates/oferta/preview.png";
import preciosManifest from "../../../../wissmotion/templates/precios/template.json";
import preciosPoster from "../../../../wissmotion/templates/precios/preview.png";
import eventoManifest from "../../../../wissmotion/templates/evento/template.json";
import eventoPoster from "../../../../wissmotion/templates/evento/preview.png";
import lanzamientoManifest from "../../../../wissmotion/templates/lanzamiento/template.json";
import lanzamientoPoster from "../../../../wissmotion/templates/lanzamiento/preview.png";
import antesDespuesManifest from "../../../../wissmotion/templates/antes-despues/template.json";
import antesDespuesPoster from "../../../../wissmotion/templates/antes-despues/preview.png";
import historiaManifest from "../../../../wissmotion/templates/historia/template.json";
import historiaPoster from "../../../../wissmotion/templates/historia/preview.png";
import listaCineticaManifest from "../../../../wissmotion/templates/lista-cinetica/template.json";
import listaCineticaPoster from "../../../../wissmotion/templates/lista-cinetica/preview.png";
import palabraManifest from "../../../../wissmotion/templates/palabra/template.json";
import palabraPoster from "../../../../wissmotion/templates/palabra/preview.png";
import tablaUiManifest from "../../../../wissmotion/templates/tabla-ui/template.json";
import tablaUiPoster from "../../../../wissmotion/templates/tabla-ui/preview.png";
import fichasLogoManifest from "../../../../wissmotion/templates/fichas-logo/template.json";
import fichasLogoPoster from "../../../../wissmotion/templates/fichas-logo/preview.png";

export interface WissmotionTemplateVariable {
  id: string;
  type: string;
  label: string;
  default: unknown;
}

export interface WissmotionTemplate {
  id: string;
  name: string;
  description: string;
  format: string;
  duration: number;
  /** Formatos con layout propio (wissmotion/templates/formats.mjs). */
  formats: string[];
  html: string;
  poster: string;
  variables: WissmotionTemplateVariable[];
}

const VARIABLE_TYPES = new Set(["string", "number", "color", "boolean", "enum"]);

/** Espejo local de parseDeclaredVariables (ver cabecera). */
export function parseTemplateVariables(html: string): WissmotionTemplateVariable[] {
  const m = /<html[^>]*data-composition-variables='(\[[\s\S]*?\])'/.exec(html);
  if (!m) return [];
  const declared = JSON.parse(m[1]) as Array<{
    id?: unknown;
    type?: unknown;
    label?: unknown;
    default?: unknown;
  }>;
  if (!Array.isArray(declared)) throw new Error("data-composition-variables no es un array");
  const seen = new Set<string>();
  return declared.map((v) => {
    if (typeof v.id !== "string" || !v.id || seen.has(v.id)) {
      throw new Error("variable duplicada o sin id");
    }
    seen.add(v.id);
    if (typeof v.type !== "string" || !VARIABLE_TYPES.has(v.type)) {
      throw new Error(`variable ${v.id}: tipo desconocido`);
    }
    if (v.default === undefined) throw new Error(`variable ${v.id}: sin default`);
    return {
      id: v.id,
      type: v.type,
      label: typeof v.label === "string" ? v.label : v.id,
      default: v.default,
    };
  });
}

function entry(
  id: string,
  manifest: {
    name: string;
    description: string;
    format: string;
    duration: number;
    formats?: string[];
  },
  poster: string,
): WissmotionTemplate {
  const html = TEMPLATE_HTML[id];
  if (typeof html !== "string") throw new Error(`plantilla sin HTML generado: ${id}`);
  const formats = manifest.formats ?? [manifest.format];
  return { id, ...manifest, formats, html, poster, variables: parseTemplateVariables(html) };
}

export const WISSMOTION_TEMPLATES: WissmotionTemplate[] = [
  entry("promo-app", promoAppManifest, promoAppPoster),
  entry("promo-web", promoWebManifest, promoWebPoster),
  entry("logo-sting", logoStingManifest, logoStingPoster),
  entry("feature-highlight", featureHighlightManifest, featureHighlightPoster),
  entry("stats", statsManifest, statsPoster),
  entry("testimonios", testimoniosManifest, testimoniosPoster),
  entry("oferta", ofertaManifest, ofertaPoster),
  entry("precios", preciosManifest, preciosPoster),
  entry("evento", eventoManifest, eventoPoster),
  entry("lanzamiento", lanzamientoManifest, lanzamientoPoster),
  entry("antes-despues", antesDespuesManifest, antesDespuesPoster),
  entry("historia", historiaManifest, historiaPoster),
  entry("lista-cinetica", listaCineticaManifest, listaCineticaPoster),
  entry("palabra", palabraManifest, palabraPoster),
  entry("tabla-ui", tablaUiManifest, tablaUiPoster),
  entry("fichas-logo", fichasLogoManifest, fichasLogoPoster),
];
