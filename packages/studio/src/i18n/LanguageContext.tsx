import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  dictionaries,
  studioDefaultLang,
  type StudioLang,
  type StudioStringKey,
} from "./dictionaries";

export const STUDIO_LANG_KEY = "wissmotion-studio:lang";

export function parseStoredLang(value: string | null): StudioLang {
  return value === "en" || value === "es" ? value : studioDefaultLang;
}

export function readStoredLang(): StudioLang {
  try {
    return parseStoredLang(localStorage.getItem(STUDIO_LANG_KEY));
  } catch {
    return studioDefaultLang;
  }
}

interface LanguageValue {
  lang: StudioLang;
  setLang: (lang: StudioLang) => void;
  t: (key: StudioStringKey) => string;
}

// Sin provider el producto sigue en español: los tests y los hosts que
// montan piezas sueltas no necesitan envolver nada.
const LanguageContext = createContext<LanguageValue>({
  lang: studioDefaultLang,
  setLang: () => {},
  t: (key) => dictionaries[studioDefaultLang][key],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<StudioLang>(readStoredLang);
  const setLang = useCallback((next: StudioLang) => {
    setLangState(next);
    try {
      localStorage.setItem(STUDIO_LANG_KEY, next);
    } catch {
      // Persistencia opcional: el idioma en memoria sigue valiendo.
    }
  }, []);
  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      // Sin DOM (tests de lógica) no hay nada que sincronizar.
    }
  }, [lang]);
  const t = useCallback(
    (key: StudioStringKey) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key,
    [lang],
  );
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageValue {
  return useContext(LanguageContext);
}
