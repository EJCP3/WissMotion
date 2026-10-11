// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function stubHomeFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/projects") {
        return {
          ok: true,
          json: async () => ({ projects: [{ id: "demo", title: "Demo" }] }),
        } as Response;
      }
      if (url === "/api/projects/demo") {
        return {
          ok: true,
          json: async () => ({ id: "demo", title: "Demo", compositions: [] }),
        } as Response;
      }
      if (url === "/api/registry/blocks") {
        return { ok: true, json: async () => [] } as Response;
      }
      return { ok: false, status: 404 } as Response;
    }),
  );
}

async function renderHome(
  view: "drafts" | "templates",
): Promise<{ host: HTMLElement; root: ReturnType<typeof createRoot> }> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<HomePage view={view} onNavigate={() => {}} onOpenProject={() => {}} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { host, root };
}

describe("HomePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("renders the drafts view with the project grid", async () => {
    stubHomeFetch();
    const { host, root } = await renderHome("drafts");

    expect(host.textContent).toContain("Borradores");
    expect(host.textContent).toContain("Crear archivo nuevo");
    expect(host.textContent).toContain("Demo");
    await act(async () => root.unmount());
    host.remove();
  });

  it("renders the templates view with its sidebar categories", async () => {
    stubHomeFetch();
    const { host, root } = await renderHome("templates");

    expect(host.textContent).toContain("Plantillas");
    expect(host.textContent).toContain("Todas las plantillas");
    await act(async () => root.unmount());
    host.remove();
  });
});
