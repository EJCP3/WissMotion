import { normalizeHex } from "./brandTypes";

// Matemática WCAG espejada de packages/cli/src/commands/contrast-bg.ts
// (relativeLuminance, contrastRatio, requiredContrastRatio,
// suggestCompliantForegroundColor). El CLI la duplica igual en
// contrast-audit.browser.js porque el script inyectado no puede importar;
// aquí el motivo es no meter el CLI (node, pesado) al bundle del navegador.
// Si cambia la fórmula upstream, cambia aquí.

export type Rgb = [number, number, number];

/** Luminancia relativa WCAG para un sRGB opaco. */
export function relativeLuminance(color: Rgb): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2]);
}

/** Ratio de contraste WCAG entre dos sRGB opacos. */
export function contrastRatio(first: Rgb, second: Rgb): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

/** Mínimo WCAG AA para texto normal o grande. */
export function requiredContrastRatio(large: boolean): number {
  return large ? 3 : 4.5;
}

export type WcagRating = "aaa" | "aa" | "aa-large" | "fail";

/** Nivel WCAG que alcanza un ratio (texto normal). */
export function wcagRating(ratio: number): WcagRating {
  if (ratio >= 7) return "aaa";
  if (ratio >= 4.5) return "aa";
  if (ratio >= 3) return "aa-large";
  return "fail";
}

/**
 * Tinta compatible más cercana en la línea hacia el polo de mayor contraste
 * (blanco para fondo oscuro, negro para fondo claro).
 */
export function suggestCompliantForegroundColor(
  foreground: Rgb,
  background: Rgb,
  requiredRatio: number,
): Rgb {
  if (contrastRatio(foreground, background) >= requiredRatio) return [...foreground] as Rgb;
  const black: Rgb = [0, 0, 0];
  const white: Rgb = [255, 255, 255];
  const target =
    contrastRatio(white, background) >= contrastRatio(black, background) ? white : black;
  for (let step = 1; step <= 255; step += 1) {
    const amount = step / 255;
    const candidate: Rgb = [
      Math.round(foreground[0] + (target[0] - foreground[0]) * amount),
      Math.round(foreground[1] + (target[1] - foreground[1]) * amount),
      Math.round(foreground[2] + (target[2] - foreground[2]) * amount),
    ];
    if (contrastRatio(candidate, background) >= requiredRatio) return candidate;
  }
  return [...target] as Rgb;
}

export function hexToRgb(hex: string): Rgb | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const h = normalized.slice(1);
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
  ];
}

/**
 * Escala tonal derivada: 2 pasos hacia el blanco, el color, 2 hacia el negro.
 * Para ampliar la marca sin salirse de ella (fondos suaves, bordes, hovers).
 */
export function tonesOf(hex: string): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const white: Rgb = [255, 255, 255];
  const black: Rgb = [0, 0, 0];
  return [
    rgbToHex(mix(rgb, white, 0.66)),
    rgbToHex(mix(rgb, white, 0.33)),
    rgbToHex(rgb),
    rgbToHex(mix(rgb, black, 0.33)),
    rgbToHex(mix(rgb, black, 0.66)),
  ];
}
