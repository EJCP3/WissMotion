import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Hono } from "hono";
import type { StudioApiAdapter } from "../types.js";
import { isInHiddenOrVendorDir, isPrivateProjectPath, walkDir } from "../helpers/safePath.js";
import { isCompositionSource } from "../helpers/hfIdPersist.js";
import { resolveProjectSignature } from "../helpers/projectSignature.js";

async function filterCompositionFiles(projectDir: string, files: string[]): Promise<string[]> {
  const htmlFiles = files.filter((f) => f.endsWith(".html") && !isInHiddenOrVendorDir(f));
  const checks = await Promise.all(
    htmlFiles.map(async (f) => {
      try {
        const content = await readFile(join(projectDir, f), "utf-8");
        return isCompositionSource(content);
      } catch {
        return false;
      }
    }),
  );
  return htmlFiles.filter((_, i) => checks[i]);
}

export function registerProjectRoutes(api: Hono, adapter: StudioApiAdapter): void {
  // List all projects
  api.get("/projects", async (c) => {
    const projects = await adapter.listProjects();
    return c.json({ projects });
  });

  // Create a project (WissMotion: "Nuevo video" opens as its own draft)
  api.post("/projects", async (c) => {
    if (!adapter.createProject) return c.json({ error: "not available" }, 501);
    const body = (await c.req.json().catch(() => null)) as {
      name?: unknown;
      html?: unknown;
    } | null;
    const name = typeof body?.name === "string" ? body.name : "";
    const html = typeof body?.html === "string" ? body.html : "";
    if (!html.includes("data-composition-id")) {
      return c.json({ error: "html must contain a root composition" }, 400);
    }
    const project = await adapter.createProject(name, html);
    return c.json({ id: project.id, title: project.title }, 201);
  });

  // Resolve session to project (multi-project mode)
  api.get("/resolve-session/:sessionId", async (c) => {
    if (!adapter.resolveSession) {
      return c.json({ error: "not available" }, 404);
    }
    const { sessionId } = c.req.param();
    const result = await adapter.resolveSession(sessionId);
    if (!result) return c.json({ error: "Session not found" }, 404);
    return c.json(result);
  });

  // Current content signature for a project: a cheap poll target for clients that refresh when files change on disk.
  api.get("/projects/:id/signature", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    return c.json({ signature: resolveProjectSignature(adapter, project.dir) });
  });

  // Project file tree
  api.get("/projects/:id", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const files = walkDir(project.dir).filter((file) => !isPrivateProjectPath(file));
    const compositions = await filterCompositionFiles(project.dir, files);
    return c.json({ id: project.id, dir: project.dir, title: project.title, files, compositions });
  });
}
