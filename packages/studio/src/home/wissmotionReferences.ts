// Biblioteca de referencias en el Home: las fichas de
// wissmotion/references/references.json con su hoja de fotogramas y un brief
// listo para pegar en el Asistente o en un agente (sin reenviar el video).
// Hojas como imports estáticos, igual que los pósters de plantillas (tsup no
// entiende import.meta.glob); el test de paridad avisa si falta una.

import data from "../../../../wissmotion/references/references.json";
import activityChart from "../../../../wissmotion/references/sheets/activity-chart.jpg";
import antesDespuesBoceto from "../../../../wissmotion/references/sheets/antes-despues-boceto.jpg";
import appMetricas from "../../../../wissmotion/references/sheets/app-metricas.jpg";
import degradadoProcedural from "../../../../wissmotion/references/sheets/degradado-procedural.jpg";
import editorialLetra from "../../../../wissmotion/references/sheets/editorial-letra.jpg";
import flightTracker from "../../../../wissmotion/references/sheets/flight-tracker.jpg";
import identidadBento from "../../../../wissmotion/references/sheets/identidad-bento.jpg";
import launchSkillry from "../../../../wissmotion/references/sheets/launch-skillry.jpg";
import launchSkillsBlur from "../../../../wissmotion/references/sheets/launch-skills-blur.jpg";
import launchSkillsTabla from "../../../../wissmotion/references/sheets/launch-skills-tabla.jpg";
import listaCinetica from "../../../../wissmotion/references/sheets/lista-cinetica.jpg";
import mascaraNegativa from "../../../../wissmotion/references/sheets/mascara-negativa.jpg";
import morphLetras from "../../../../wissmotion/references/sheets/morph-letras.jpg";
import motionLetras from "../../../../wissmotion/references/sheets/motion-letras.jpg";
import muroMockups from "../../../../wissmotion/references/sheets/muro-mockups.jpg";
import orbitCarrusel from "../../../../wissmotion/references/sheets/orbit-carrusel.jpg";
import ruletaColores from "../../../../wissmotion/references/sheets/ruleta-colores.jpg";
import tourWeb from "../../../../wissmotion/references/sheets/tour-web.jpg";
import trackingTitular from "../../../../wissmotion/references/sheets/tracking-titular.jpg";
import widgetSueno from "../../../../wissmotion/references/sheets/widget-sueno.jpg";
import zoomMarcos from "../../../../wissmotion/references/sheets/zoom-marcos.jpg";

export type ReferenceStatus = "lista" | "parcial" | "falta";

export interface WissmotionReference {
  id: string;
  title: string;
  files: string[];
  origin: string;
  aspect: string[];
  duration: number;
  description: string;
  techniques: string[];
  recreate: { templates: string[]; presets: string[]; transitions: string[] };
  status: ReferenceStatus;
  missing: string[];
  sheet: string;
}

export const REFERENCE_SHEETS: Record<string, string> = {
  "activity-chart": activityChart,
  "antes-despues-boceto": antesDespuesBoceto,
  "app-metricas": appMetricas,
  "degradado-procedural": degradadoProcedural,
  "editorial-letra": editorialLetra,
  "flight-tracker": flightTracker,
  "identidad-bento": identidadBento,
  "launch-skillry": launchSkillry,
  "launch-skills-blur": launchSkillsBlur,
  "launch-skills-tabla": launchSkillsTabla,
  "lista-cinetica": listaCinetica,
  "mascara-negativa": mascaraNegativa,
  "morph-letras": morphLetras,
  "motion-letras": motionLetras,
  "muro-mockups": muroMockups,
  "orbit-carrusel": orbitCarrusel,
  "ruleta-colores": ruletaColores,
  "tour-web": tourWeb,
  "tracking-titular": trackingTitular,
  "widget-sueno": widgetSueno,
  "zoom-marcos": zoomMarcos,
};

export const WISSMOTION_REFERENCES: WissmotionReference[] = (
  data.references as Array<Omit<WissmotionReference, "status" | "sheet"> & { status: string }>
).map((ref) => ({
  ...ref,
  status: ref.status as ReferenceStatus,
  sheet: REFERENCE_SHEETS[ref.id] ?? "",
}));

/** Brief en texto plano para pegar en el Asistente o en un agente externo. */
export function buildReferenceBrief(ref: WissmotionReference): string {
  const { templates, presets, transitions } = ref.recreate;
  const recreate = [
    templates.length > 0 ? `plantilla ${templates.join(", ")}` : "",
    presets.length > 0 ? `presets ${presets.join(", ")}` : "",
    transitions.length > 0 ? `transiciones ${transitions.join(", ")}` : "",
  ].filter(Boolean);
  return [
    `Quiero un video como la referencia «${ref.title}» (${ref.aspect.join(" / ")}, ${ref.duration} s).`,
    ref.description,
    `Técnicas: ${ref.techniques.join("; ")}.`,
    recreate.length > 0 ? `Recréalo con WissMotion: ${recreate.join("; ")}.` : "",
    ref.missing.length > 0
      ? `Aún no existe en WissMotion (resuélvelo a mano): ${ref.missing.join("; ")}.`
      : "",
    `Ficha completa: wissmotion/references/references.json → "${ref.id}" (hoja: wissmotion/references/sheets/${ref.id}.jpg).`,
  ]
    .filter(Boolean)
    .join("\n");
}
