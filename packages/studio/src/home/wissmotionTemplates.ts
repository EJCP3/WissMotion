// Catálogo WissMotion para la galería del Home: las 12 plantillas con su
// HTML (?raw), manifiesto, póster y variables parseadas. Todo se incrusta en
// el bundle en build (offline); en dev, vite.config `server.fs.allow` deja
// leer wissmotion/templates.
// El parseo de variables espeja parseDeclaredVariables de
// wissmotion/templates/instantiate.mjs (15 líneas duplicadas para no meter
// Ajv al bundle por una sola función).

import promoAppHtml from "../../../../wissmotion/templates/promo-app/index.html?raw";
import promoAppManifest from "../../../../wissmotion/templates/promo-app/template.json";
import promoAppPoster from "../../../../wissmotion/templates/promo-app/preview.png";
import promoWebHtml from "../../../../wissmotion/templates/promo-web/index.html?raw";
import promoWebManifest from "../../../../wissmotion/templates/promo-web/template.json";
import promoWebPoster from "../../../../wissmotion/templates/promo-web/preview.png";
import logoStingHtml from "../../../../wissmotion/templates/logo-sting/index.html?raw";
import logoStingManifest from "../../../../wissmotion/templates/logo-sting/template.json";
import logoStingPoster from "../../../../wissmotion/templates/logo-sting/preview.png";
import featureHighlightHtml from "../../../../wissmotion/templates/feature-highlight/index.html?raw";
import featureHighlightManifest from "../../../../wissmotion/templates/feature-highlight/template.json";
import featureHighlightPoster from "../../../../wissmotion/templates/feature-highlight/preview.png";
import statsHtml from "../../../../wissmotion/templates/stats/index.html?raw";
import statsManifest from "../../../../wissmotion/templates/stats/template.json";
import statsPoster from "../../../../wissmotion/templates/stats/preview.png";
import testimoniosHtml from "../../../../wissmotion/templates/testimonios/index.html?raw";
import testimoniosManifest from "../../../../wissmotion/templates/testimonios/template.json";
import testimoniosPoster from "../../../../wissmotion/templates/testimonios/preview.png";
import ofertaHtml from "../../../../wissmotion/templates/oferta/index.html?raw";
import ofertaManifest from "../../../../wissmotion/templates/oferta/template.json";
import ofertaPoster from "../../../../wissmotion/templates/oferta/preview.png";
import preciosHtml from "../../../../wissmotion/templates/precios/index.html?raw";
import preciosManifest from "../../../../wissmotion/templates/precios/template.json";
import preciosPoster from "../../../../wissmotion/templates/precios/preview.png";
import eventoHtml from "../../../../wissmotion/templates/evento/index.html?raw";
import eventoManifest from "../../../../wissmotion/templates/evento/template.json";
import eventoPoster from "../../../../wissmotion/templates/evento/preview.png";
import lanzamientoHtml from "../../../../wissmotion/templates/lanzamiento/index.html?raw";
import lanzamientoManifest from "../../../../wissmotion/templates/lanzamiento/template.json";
import lanzamientoPoster from "../../../../wissmotion/templates/lanzamiento/preview.png";
import antesDespuesHtml from "../../../../wissmotion/templates/antes-despues/index.html?raw";
import antesDespuesManifest from "../../../../wissmotion/templates/antes-despues/template.json";
import antesDespuesPoster from "../../../../wissmotion/templates/antes-despues/preview.png";
import historiaHtml from "../../../../wissmotion/templates/historia/index.html?raw";
import historiaManifest from "../../../../wissmotion/templates/historia/template.json";
import historiaPoster from "../../../../wissmotion/templates/historia/preview.png";

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
  html: string,
  manifest: { id: string; name: string; description: string; format: string; duration: number },
  poster: string,
): WissmotionTemplate {
  return { ...manifest, html, poster, variables: parseTemplateVariables(html) };
}

export const WISSMOTION_TEMPLATES: WissmotionTemplate[] = [
  entry(promoAppHtml, promoAppManifest, promoAppPoster),
  entry(promoWebHtml, promoWebManifest, promoWebPoster),
  entry(logoStingHtml, logoStingManifest, logoStingPoster),
  entry(featureHighlightHtml, featureHighlightManifest, featureHighlightPoster),
  entry(statsHtml, statsManifest, statsPoster),
  entry(testimoniosHtml, testimoniosManifest, testimoniosPoster),
  entry(ofertaHtml, ofertaManifest, ofertaPoster),
  entry(preciosHtml, preciosManifest, preciosPoster),
  entry(eventoHtml, eventoManifest, eventoPoster),
  entry(lanzamientoHtml, lanzamientoManifest, lanzamientoPoster),
  entry(antesDespuesHtml, antesDespuesManifest, antesDespuesPoster),
  entry(historiaHtml, historiaManifest, historiaPoster),
];
