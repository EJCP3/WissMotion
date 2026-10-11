import { validateBrandStructure, type BrandV1 } from "./brandTypes";

export interface SavedBrand {
  name: string;
  brand: BrandV1;
  updatedAt: string;
}

const LIBRARY_KEY = "wissmotion-studio:brands";

/** Biblioteca de marcas del Studio (localStorage): varias guardadas, aplicar, duplicar, borrar. */
export function listSavedBrands(): SavedBrand[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: SavedBrand[] = [];
    for (const entry of parsed) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as SavedBrand).name === "string" &&
        validateBrandStructure((entry as SavedBrand).brand).length === 0
      ) {
        out.push(entry as SavedBrand);
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function persist(brands: SavedBrand[]): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(brands));
  } catch {
    // Biblioteca opcional: la marca del proyecto sigue guardada aparte.
  }
}

/** Guarda (o reemplaza) la marca actual con un nombre. */
export function saveNamedBrand(name: string, brand: BrandV1): SavedBrand[] {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("sin nombre");
  if (validateBrandStructure(brand).length > 0) throw new Error("marca inválida");
  const brands = listSavedBrands().filter((b) => b.name !== trimmed);
  brands.push({ name: trimmed, brand, updatedAt: new Date().toISOString() });
  persist(brands);
  return listSavedBrands();
}

export function deleteSavedBrand(name: string): SavedBrand[] {
  persist(listSavedBrands().filter((b) => b.name !== name));
  return listSavedBrands();
}

export function duplicateSavedBrand(name: string, copyName: string): SavedBrand[] {
  const found = listSavedBrands().find((b) => b.name === name);
  if (!found) throw new Error("no existe");
  return saveNamedBrand(copyName, found.brand);
}
