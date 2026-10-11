// Ruta del Home para el shell: lee `#home*` del hash y navega sin pelear
// con useServerConnection (que ignora esos hashes) ni con useStudioUrlState
// (que solo escribe hashes `#project/...` con replaceState).

import { useCallback, useEffect, useState } from "react";
import { buildProjectHash } from "../utils/projectRouting";
import { buildHomeHash, parseHomeRoute, type HomeView } from "./homeRoutes";

export interface HomeRoute {
  view: HomeView | null;
  go: (view: HomeView) => void;
  open: (projectId: string, compPath?: string) => void;
}

function readHomeView(): HomeView | null {
  if (typeof window === "undefined") return null;
  return parseHomeRoute(window.location.hash);
}

export function useHomeRoute(): HomeRoute {
  const [view, setView] = useState<HomeView | null>(readHomeView);

  useEffect(() => {
    const onHashChange = () => setView(parseHomeRoute(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const go = useCallback((next: HomeView) => {
    window.location.hash = buildHomeHash(next);
  }, []);

  const open = useCallback((projectId: string, compPath?: string) => {
    window.location.hash = compPath
      ? buildProjectHash(projectId, { comp: compPath })
      : buildProjectHash(projectId);
  }, []);

  return { view, go, open };
}
