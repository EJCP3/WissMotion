import presetsData from "../../../../wissmotion/presets/motion/presets.json";

export type MotionPresetMethod = "to" | "from" | "fromTo";

export interface MotionPreset {
  id: string;
  kind: string;
  description: string;
  method: MotionPresetMethod;
  duration: number;
  ease: string;
  properties: Record<string, number | string>;
  fromProperties?: Record<string, number | string>;
}

interface PresetEntry {
  kind: string;
  description?: string;
  ease: string;
  duration: number;
  stagger?: number;
  gsap?: { from?: Record<string, unknown>; to?: Record<string, unknown> };
}

type PlainVars = Record<string, number | string>;

function isPlainVars(value: unknown): value is PlainVars {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every((v) => typeof v === "number" || typeof v === "string");
}

// Solo tweens planos de un elemento: sin repeats/yoyos (config de tween, no
// vars), sin keyframes y sin callbacks. Escenas, typewriter, counter-up,
// number-roll, pulse, glow y shake viven en el catálogo pero no en el picker.
const ELEMENT_PRESETS = new Set([
  "mask-reveal",
  "stagger-words",
  "blur-in",
  "spring-pop",
  "slide-stack",
  "scale-fade",
  "wipe",
  "fade-slide-out",
  "blur-out",
  "stagger-chars",
  "tracking-in",
  "flip-3d",
  "negative-mask",
  "morph-box",
]);

function toSpec(id: string, entry: PresetEntry): MotionPreset | null {
  if (!ELEMENT_PRESETS.has(id)) return null;
  const { from, to } = entry.gsap ?? {};
  const base = {
    id,
    kind: entry.kind,
    description: entry.description ?? id,
    duration: entry.duration,
    ease: entry.ease,
  };
  if (from && to && isPlainVars(from) && isPlainVars(to)) {
    return { ...base, method: "fromTo", properties: to, fromProperties: from };
  }
  if (to && isPlainVars(to)) {
    return { ...base, method: "to", properties: to };
  }
  if (from && isPlainVars(from)) {
    return { ...base, method: "from", properties: from };
  }
  throw new Error(`preset no aplicable a un elemento: ${id}`);
}

/** Presets aplicables al elemento seleccionado (tweens planos). */
export function loadMotionPresets(): MotionPreset[] {
  const table = (presetsData as { presets: Record<string, PresetEntry> }).presets;
  const out: MotionPreset[] = [];
  for (const [id, entry] of Object.entries(table)) {
    if (!ELEMENT_PRESETS.has(id)) continue;
    const spec = toSpec(id, entry);
    if (spec) out.push(spec);
  }
  return out;
}

/** El cuerpo `add` completo para la mutación (mismo contrato que el alta manual). */
export function presetAddSpec(preset: MotionPreset): {
  method: MotionPresetMethod;
  duration: number;
  ease: string;
  properties: Record<string, number | string>;
  fromProperties?: Record<string, number | string>;
} {
  return {
    method: preset.method,
    duration: preset.duration,
    ease: preset.ease,
    properties: preset.properties,
    ...(preset.fromProperties ? { fromProperties: preset.fromProperties } : {}),
  };
}
