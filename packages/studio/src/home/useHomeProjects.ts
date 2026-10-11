import { useCallback, useEffect, useState } from "react";
import { listHomeProjects, type HomeProject } from "./homeApi";

export type HomeProjectsStatus = "loading" | "waiting" | "error" | "ready";

/**
 * Proyectos para el Home, con el mismo pulso del connection hook:
 * error de red → espera y reintenta; error HTTP → estado error con retry manual.
 */
export function useHomeProjects() {
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [status, setStatus] = useState<HomeProjectsStatus>("loading");
  const [reloadToken, setReloadToken] = useState(0);
  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    // Explícitamente `number` (retorno DOM de window.setTimeout): con
    // @types/node presente, ReturnType infiere NodeJS.Timeout y choca.
    let timer: number | null = null;
    async function load() {
      try {
        const list = await listHomeProjects();
        if (cancelled) return;
        setProjects(list);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        const http = error instanceof Error && error.message.startsWith("projects ");
        if (http) {
          setStatus("error");
          return;
        }
        setStatus("waiting");
        timer = window.setTimeout(() => {
          if (!cancelled) void load();
        }, 2000);
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [reloadToken]);

  return { projects, status, retry };
}
