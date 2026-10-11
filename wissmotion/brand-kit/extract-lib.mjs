// Núcleo puro del extractor de marca desde URL (sin IA, sin navegador).
// Hace fetch del HTML + CSS propio, y deriva un brand.json válido.
// - Colores y fuentes salen del CSS (frecuencia de uso).
// - El favicon se elige con el mismo criterio que
//   packages/cli/src/capture/faviconRanker.ts (SVG > PNG grande > ICO,
//   mask-icon despromovido).
// - Las capturas (desktop/móvil) necesitan navegador y las hace
//   `hyperframes capture`; ver extract-from-url.mjs --screenshots.

const GENERIC_FONTS = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "roboto",
  "helvetica",
  "arial",
  "emoji",
  "math",
  "fangsong",
]);

const FALLBACK_COLORS = {
  primary: "#4f46e5",
  secondary: "#0ea5e9",
  accent: "#f59e0b",
  background: "#ffffff",
  surface: "#f5f5f4",
  text: "#1c1917",
};

export class BrandExtractError extends Error {}

export function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function fetchText(url, { timeoutMs = 20000, maxBytes = 2_000_000 } = {}) {
  if (!isHttpUrl(url)) throw new BrandExtractError(`URL no válida: ${url}`);
  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "WissMotion-brand-extract/1 (+https://wissmotion.dev)" },
      redirect: "follow",
    });
  } catch (e) {
    throw new BrandExtractError(`No se pudo descargar ${url}: ${e.message}`);
  }
  if (!res.ok) throw new BrandExtractError(`${url} devolvió HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new BrandExtractError(`${url} excede ${maxBytes} bytes`);
  return { text: buf.toString("utf8"), finalUrl: res.url || url };
}

function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g)) {
    attrs[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, "");
  }
  return attrs;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

export function parseMeta(html, pageUrl) {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim() : "";
  const metas = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = parseAttrs(m[0]);
    const key = (a.property || a.name || "").toLowerCase();
    if (key && a.content !== undefined) metas[key] = decodeEntities(a.content);
  }
  const icons = [];
  const stylesheets = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = parseAttrs(m[0]);
    if (!a.href) continue;
    const rels = (a.rel || "").toLowerCase().split(/\s+/);
    let href;
    try {
      href = new URL(a.href, pageUrl).href;
    } catch {
      continue;
    }
    if (rels.includes("stylesheet")) stylesheets.push(href);
    if (rels.some((r) => r.includes("icon"))) {
      icons.push({ rel: a.rel, href, sizes: a.sizes ?? null, type: a.type ?? null });
    }
  }
  return { title, metas, icons, stylesheets };
}

export function parseGoogleFontFamilies(urls) {
  const families = [];
  for (const href of urls) {
    let u;
    try {
      u = new URL(href);
    } catch {
      continue;
    }
    if (!u.hostname.includes("fonts.googleapis.com")) continue;
    for (const fam of u.searchParams.getAll("family")) {
      const name = fam.split(":")[0].replace(/\+/g, " ").trim();
      if (name && !families.includes(name)) families.push(name);
    }
  }
  return families;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
}

function rgbToHex(r, g, b) {
  const c = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toLowerCase();
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

export function parseCssColors(css) {
  const counts = new Map();
  const add = (hex) => counts.set(hex, (counts.get(hex) ?? 0) + 1);
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/url\([^)]*\)/gi, " ");
  for (const m of clean.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    add(rgbToHex(...hexToRgb(`#${m[1]}`)));
  }
  for (const m of clean.matchAll(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/gi,
  )) {
    const alpha = m[4] === undefined ? 1 : Number(m[4]);
    if (!Number.isFinite(alpha) || alpha < 0.99) continue;
    const [r, g, b] = [m[1], m[2], m[3]].map(Number);
    if ([r, g, b].some((n) => !Number.isFinite(n) || n < 0 || n > 255)) continue;
    add(rgbToHex(r, g, b));
  }
  for (const m of clean.matchAll(
    /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/gi,
  )) {
    const alpha = m[4] === undefined ? 1 : Number(m[4]);
    if (!Number.isFinite(alpha) || alpha < 0.99) continue;
    add(hslToHex(Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100));
  }
  return counts;
}

export function parseCssFonts(css) {
  const counts = new Map();
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const m of clean.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim().replace(/^["']|["']$/g, "");
      if (!name || name.startsWith("var(") || GENERIC_FONTS.has(name.toLowerCase())) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const weights = new Set();
  for (const m of clean.matchAll(/font-weight\s*:\s*(\d{3})\b/gi)) {
    const w = Number(m[1]);
    if (w >= 100 && w <= 900) weights.add(w);
  }
  return { fonts: counts, weights };
}

function sizesScore(sizes) {
  if (!sizes) return 0;
  let max = 0;
  for (const token of sizes.trim().split(/\s+/)) {
    const m = /^(\d+)x(\d+)$/i.exec(token);
    if (m) max = Math.max(max, Number(m[1]), Number(m[2]));
  }
  return max;
}

function isMaskIcon(c) {
  return (c.rel || "").toLowerCase().split(/\s+/).includes("mask-icon");
}

function isSvg(c) {
  return (
    (c.type || "").toLowerCase() === "image/svg+xml" ||
    c.href.toLowerCase().split(/[#?]/)[0].endsWith(".svg")
  );
}

/** Ordena candidatos de mejor a peor. Pura, sin IO. */
export function rankIcons(candidates) {
  const scored = candidates.map((c) => {
    let score = sizesScore(c.sizes);
    if (isMaskIcon(c)) score -= 10_000;
    else if (isSvg(c)) score += 5_000;
    else if ((c.rel || "").toLowerCase().includes("apple-touch"))
      score += sizesScore(c.sizes) === 0 ? 180 : 0;
    if (c.href.toLowerCase().split(/[#?]/)[0].endsWith(".ico") && score === 0) score = 16;
    return { candidate: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.candidate);
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function saturation(hex) {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2 / 255;
  return (max - min) / 255 / (1 - Math.abs(2 * l - 1) || 1);
}

function cleanName(title, siteName) {
  const raw = (siteName || title || "").trim();
  if (!raw) return "";
  const first = raw.split(/\s[|｜–—•·]\s/)[0].trim();
  return (first || raw).slice(0, 80);
}

/**
 * Mapea lo extraído a un brand.json válido. Reglas deterministas:
 * background = color más claro, text = más oscuro, surface = blanco si
 * aparece si no el 2.º más claro; primary/secundaria = cromáticos más
 * frecuentes; accent = el más saturado. Sin colores → paleta neutra.
 */
export function mapToBrand({ meta, colorCounts, fontNames, fontWeights, bestIcon, pageUrl }) {
  const ranked = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
  const byLight = [...colorCounts.keys()].sort((a, b) => luminance(a) - luminance(b));
  // Cromáticos por frecuencia y, en empate, por saturación: un casi-blanco
  // de fondo no le gana al acento aunque aparezca igual de veces.
  const chromatic = ranked
    .filter(([hex]) => saturation(hex) >= 0.12)
    .sort((a, b) => b[1] - a[1] || saturation(b[0]) - saturation(a[0]))
    .map(([hex]) => hex);
  const frequent = ranked.map(([hex]) => hex);

  const lightest = byLight[byLight.length - 1];
  const secondLightest = byLight[byLight.length - 2] ?? lightest;
  const colors =
    ranked.length === 0
      ? { ...FALLBACK_COLORS }
      : {
          primary: chromatic[0] ?? frequent[0],
          secondary: chromatic[1] ?? frequent[1] ?? chromatic[0] ?? frequent[0],
          accent:
            [...colorCounts.keys()].sort((a, b) => saturation(b) - saturation(a))[0] ?? frequent[0],
          background: lightest,
          surface:
            lightest !== "#ffffff" && colorCounts.has("#ffffff") ? "#ffffff" : secondLightest,
          text: byLight[0],
        };

  const heading = fontNames[0] ?? "Inter";
  const body = fontNames[1] ?? heading;
  const weights = [...fontWeights].sort((a, b) => a - b);

  const brand = {
    brandVersion: 1,
    name: cleanName(meta.title, meta.metas["og:site_name"]) || new URL(pageUrl).hostname,
    colors,
    fonts: {
      heading,
      body,
      ...(weights.length > 0 ? { weights } : { weights: [400, 700] }),
    },
    url: new URL(pageUrl).origin,
  };
  const tagline = (meta.metas.description || meta.metas["og:description"] || "")
    .trim()
    .slice(0, 160);
  if (tagline) brand.tagline = tagline;
  if (bestIcon && isHttpUrl(bestIcon.href)) {
    brand.logo = { full: bestIcon.href, icon: bestIcon.href };
  }
  return brand;
}

export async function extractBrand(
  url,
  { timeoutMs = 20000, maxCssFiles = 5, maxCssBytes = 500_000 } = {},
) {
  const { text: html, finalUrl } = await fetchText(url, { timeoutMs });
  if (!isHttpUrl(finalUrl))
    throw new BrandExtractError(`Redirección fuera de HTTP(S): ${finalUrl}`);
  const meta = parseMeta(html, finalUrl);
  const googleFonts = parseGoogleFontFamilies(meta.stylesheets);
  const origin = new URL(finalUrl).origin;

  const colorCounts = new Map();
  const cssFontCounts = new Map();
  const weightSet = new Set();
  let cssFiles = 0;
  for (const href of meta.stylesheets) {
    if (cssFiles >= maxCssFiles) break;
    let cssUrl;
    try {
      cssUrl = new URL(href);
    } catch {
      continue;
    }
    if (cssUrl.origin !== origin || !isHttpUrl(href)) continue;
    try {
      const { text: css } = await fetchText(href, { timeoutMs: 15000, maxBytes: maxCssBytes });
      for (const [hex, n] of parseCssColors(css))
        colorCounts.set(hex, (colorCounts.get(hex) ?? 0) + n);
      const { fonts, weights } = parseCssFonts(css);
      for (const [name, n] of fonts) cssFontCounts.set(name, (cssFontCounts.get(name) ?? 0) + n);
      for (const w of weights) weightSet.add(w);
      cssFiles += 1;
    } catch {
      continue;
    }
  }

  const cssFontsRanked = [...cssFontCounts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  const fontNames = [...googleFonts];
  for (const n of cssFontsRanked) if (!fontNames.includes(n)) fontNames.push(n);
  const bestIcon = rankIcons(meta.icons.filter((c) => isHttpUrl(c.href)))[0] ?? null;
  const brand = mapToBrand({
    meta,
    colorCounts,
    fontNames,
    fontWeights: weightSet,
    bestIcon,
    pageUrl: finalUrl,
  });
  return {
    brand,
    debug: { finalUrl, cssFiles, colorCount: colorCounts.size, fontCount: fontNames.length },
  };
}
