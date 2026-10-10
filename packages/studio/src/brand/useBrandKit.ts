import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_BRAND,
  normalizeHex,
  validateBrandStructure,
  type BrandColorField,
  type BrandV1,
} from "./brandTypes";
import { brandToCss } from "./brandTokens";

const STORAGE_PREFIX = "wissmotion-studio:brand:";
const FONT_LINK_ID = "wm-brand-fonts";
export const MAX_LOGO_BYTES = 800_000;

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function familyParam(name: string): string {
  return encodeURIComponent(name.trim()).replace(/%20/g, "+");
}

function fontsHref(heading: string, body: string): string {
  const families = heading === body ? [heading] : [heading, body];
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${familyParam(f)}`).join("&")}&display=swap`;
}

function loadStored(projectId: string): BrandV1 {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return { ...DEFAULT_BRAND };
    const parsed: unknown = JSON.parse(raw);
    if (validateBrandStructure(parsed).length > 0) return { ...DEFAULT_BRAND };
    return parsed as BrandV1;
  } catch {
    return { ...DEFAULT_BRAND };
  }
}

export interface BrandKit {
  brand: BrandV1;
  errors: string[];
  patch: (partial: Partial<BrandV1>) => void;
  setColor: (field: BrandColorField, hex: string) => boolean;
  reset: () => void;
  exportJson: () => void;
  importJson: (file: File) => Promise<string[]>;
  copyTokens: () => Promise<boolean>;
}

/**
 * Estado de la marca del proyecto: edita en memoria, persiste en
 * localStorage por proyecto, exporta/importa brand.json. La persistencia en
 * el archivo del proyecto llega con el paquete .wissmotion (Fase 9).
 */
export function useBrandKit(projectId: string): BrandKit {
  const [brand, setBrand] = useState<BrandV1>(() => loadStored(projectId));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(projectId), JSON.stringify(brand));
    } catch {
      // Cuota llena o almacenamiento bloqueado: la edición en memoria sigue.
    }
  }, [brand, projectId]);

  // La vista previa del panel viste las fuentes de la marca.
  useEffect(() => {
    try {
      let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = FONT_LINK_ID;
        link.rel = "stylesheet";
        document.head.append(link);
      }
      link.href = fontsHref(brand.fonts.heading, brand.fonts.body);
    } catch {
      // Sin DOM no hay fuentes que cargar.
    }
  }, [brand.fonts.heading, brand.fonts.body]);

  const patch = useCallback((partial: Partial<BrandV1>) => {
    setBrand((prev) => ({ ...prev, ...partial }));
  }, []);

  const setColor = useCallback((field: BrandColorField, hex: string) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return false;
    setBrand((prev) => ({ ...prev, colors: { ...prev.colors, [field]: normalized } }));
    return true;
  }, []);

  const reset = useCallback(() => setBrand({ ...DEFAULT_BRAND }), []);

  const exportJson = useCallback(() => {
    const blob = new Blob([`${JSON.stringify(brand, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brand.name.trim() || "marca"}.brand.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [brand]);

  const importJson = useCallback(async (file: File): Promise<string[]> => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return ["$"];
    }
    const errors = validateBrandStructure(parsed);
    if (errors.length === 0) setBrand(parsed as BrandV1);
    return errors;
  }, []);

  const copyTokens = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(brandToCss(brand));
      return true;
    } catch {
      return false;
    }
  }, [brand]);

  const errors = useMemo(() => validateBrandStructure(brand), [brand]);
  return { brand, errors, patch, setColor, reset, exportJson, importJson, copyTokens };
}
