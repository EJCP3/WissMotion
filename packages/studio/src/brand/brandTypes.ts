// Tipos del Brand Kit v1 en el Studio. Espejo de
// wissmotion/brand-kit/brand.schema.json (el esquema JSON es el contrato;
// esto es su forma TypeScript para el editor). Si el esquema sube a v2,
// estos tipos suben con él.

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
}

export type BrandColorField = keyof BrandColors;

export const COLOR_FIELDS: BrandColorField[] = [
  "primary",
  "secondary",
  "accent",
  "background",
  "surface",
  "text",
];

export interface BrandFonts {
  heading: string;
  body: string;
  weights: number[];
}

export type MotionPersonality =
  | "suave"
  | "enérgico"
  | "premium"
  | "juguetón"
  | "corporativo"
  | "tech";

export const MOTION_PERSONALITIES: MotionPersonality[] = [
  "suave",
  "enérgico",
  "premium",
  "juguetón",
  "corporativo",
  "tech",
];

export interface BrandLogo {
  full?: string;
  icon?: string;
  mono?: string;
  light?: string;
  dark?: string;
}

export interface BrandV1 {
  brandVersion: 1;
  name: string;
  tagline?: string;
  url?: string;
  logo?: BrandLogo;
  colors: BrandColors;
  fonts: BrandFonts;
  tone?: string;
  motionPersonality?: MotionPersonality;
  features?: string[];
  cta?: { label: string; url?: string };
  screenshots?: { desktop?: string; mobile?: string };
  social?: { x?: string; instagram?: string; youtube?: string; linkedin?: string; tiktok?: string };
}

export const DEFAULT_BRAND: BrandV1 = {
  brandVersion: 1,
  name: "",
  colors: {
    primary: "#4f46e5",
    secondary: "#0ea5e9",
    accent: "#f59e0b",
    background: "#ffffff",
    surface: "#f5f5f4",
    text: "#1c1917",
  },
  fonts: { heading: "Inter", body: "Inter", weights: [400, 700] },
};

/** Normaliza #rgb→#rrggbb en minúsculas; null si no es hex válido. */
export function normalizeHex(value: string): string | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim());
  if (!m) return null;
  const h = m[1].toLowerCase();
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return `#${full}`;
}

/**
 * Chequeo estructural liviano (obligatorios + hex + versión). Devuelve rutas
 * a campos inválidos, p. ej. ["name", "colors.primary"]. La validación
 * completa contra el esquema es `node wissmotion/brand-kit/validate-brand.mjs`.
 */
export function validateBrandStructure(value: unknown): string[] {
  const bad: string[] = [];
  if (typeof value !== "object" || value === null) return ["$"];
  const b = value as Record<string, unknown>;
  if (b.brandVersion !== 1) bad.push("brandVersion");
  if (typeof b.name !== "string" || b.name.trim().length === 0) bad.push("name");
  const colors = (b.colors ?? {}) as Record<string, unknown>;
  for (const field of COLOR_FIELDS) {
    if (typeof colors[field] !== "string" || normalizeHex(colors[field]) === null) {
      bad.push(`colors.${field}`);
    }
  }
  const fonts = (b.fonts ?? {}) as Record<string, unknown>;
  if (typeof fonts.heading !== "string" || fonts.heading.trim().length === 0) {
    bad.push("fonts.heading");
  }
  if (typeof fonts.body !== "string" || fonts.body.trim().length === 0) {
    bad.push("fonts.body");
  }
  return bad;
}
