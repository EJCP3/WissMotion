// Rutas del Home estilo Jitter: `#home` (Borradores) y `#home/templates`.
// Viven fuera de `#project/<id>` para no chocar con el estado de URL del
// editor (projectRouting) ni con la adopción de proyecto de useServerConnection.

export type HomeView = "drafts" | "templates";

const HOME_PREFIX = "#home";

/** Vista del Home que pide el hash, o null si el hash es del editor. */
export function parseHomeRoute(hash: string): HomeView | null {
  if (hash === HOME_PREFIX || hash === `${HOME_PREFIX}/`) return "drafts";
  if (hash === `${HOME_PREFIX}/templates` || hash === `${HOME_PREFIX}/templates/`)
    return "templates";
  return null;
}

/** ¿Debe el arranque quedarse en el Home en vez de autoabrir un proyecto? */
export function isHomeHash(hash: string): boolean {
  return parseHomeRoute(hash) !== null;
}

/** Hash para navegar al Home sin tocar el historial del editor. */
export function buildHomeHash(view: HomeView): string {
  return view === "templates" ? `${HOME_PREFIX}/templates` : HOME_PREFIX;
}
