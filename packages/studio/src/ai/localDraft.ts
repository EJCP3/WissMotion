// Borrador local determinista (Fase 7 sin tokens): brief → guion →
// storyboard con plantillas y presets reales. Es la degradación elegante:
// sin proveedor configurado, el chat propone esto en vez de fallar, y el
// usuario lo aprueba/edita antes de instanciar.

export interface Brief {
  producto: string;
  publico?: string;
  duracion?: string;
  tono?: string;
}

export interface ScriptBeat {
  escena: number;
  titulo: string;
  texto: string;
  segundos: number;
}

export interface StoryboardScene {
  escena: number;
  plantilla: string;
  motion: string;
  vars: Record<string, string>;
}

const TEMPLATES_BY_GOAL: Array<{ match: RegExp; template: string; motion: string }> = [
  // Las específicas primero: "webinar" contiene "web", "historia" es vertical, etc.
  { match: /webinar|evento|curso|en vivo|live/i, template: "evento", motion: "enérgico" },
  { match: /app|móvil|movil|ios|android/i, template: "promo-app", motion: "enérgico" },
  { match: /web|saas|plataforma|dashboard/i, template: "promo-web", motion: "corporativo" },
  { match: /logo|marca|intro/i, template: "logo-sting", motion: "premium" },
  { match: /precio|plan/i, template: "precios", motion: "corporativo" },
  { match: /testimonio|reseña|opini/i, template: "testimonios", motion: "suave" },
  { match: /oferta|descuento|promo/i, template: "oferta", motion: "enérgico" },
  { match: /dato|métrica|metrica|stats|número|numero/i, template: "stats", motion: "tech" },
  { match: /lanzamiento|nuevo|v2|versión|version/i, template: "lanzamiento", motion: "enérgico" },
  { match: /antes|despu/i, template: "antes-despues", motion: "suave" },
  { match: /redes|historia|story|vertical|reel|tiktok/i, template: "historia", motion: "juguetón" },
];

export function pickTemplate(brief: Brief): { template: string; motion: string } {
  const haystack = `${brief.producto} ${brief.publico ?? ""}`;
  for (const entry of TEMPLATES_BY_GOAL) {
    if (entry.match.test(haystack)) return { template: entry.template, motion: entry.motion };
  }
  return { template: "feature-highlight", motion: "corporativo" };
}

export function draftScript(brief: Brief): ScriptBeat[] {
  const producto = brief.producto.trim() || "tu producto";
  const publico = brief.publico?.trim() || "tu público";
  return [
    { escena: 1, titulo: "Gancho", texto: `${producto}, por fin sin fricción.`, segundos: 2 },
    {
      escena: 2,
      titulo: "Beneficio",
      texto: `Hecho para ${publico}: rápido, claro y a tu marca.`,
      segundos: 3,
    },
    { escena: 3, titulo: "CTA", texto: `Empieza hoy con ${producto}.`, segundos: 2 },
  ];
}

export function draftStoryboard(brief: Brief): { beats: ScriptBeat[]; scenes: StoryboardScene[] } {
  const beats = draftScript(brief);
  const picked = pickTemplate(brief);
  const scenes: StoryboardScene[] = [
    {
      escena: 1,
      plantilla: "logo-sting",
      motion: "premium",
      vars: { brandName: brief.producto.trim() || "Mi Marca" },
    },
    { escena: 2, plantilla: picked.template, motion: picked.motion, vars: {} },
    { escena: 3, plantilla: "oferta", motion: picked.motion, vars: {} },
  ];
  return { beats, scenes };
}

/** Resumen legible del borrador para el chat. */
export function formatDraft(brief: Brief): string {
  const { beats, scenes } = draftStoryboard(brief);
  const lines = beats.map(
    (b, i) =>
      `${b.escena}. ${b.titulo} (${b.segundos}s): ${b.texto} → ${scenes[i].plantilla} [${scenes[i].motion}]`,
  );
  return lines.join("\n");
}
