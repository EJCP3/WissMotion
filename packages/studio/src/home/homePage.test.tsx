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

  it("separates WissMotion and HyperFrames templates into two tabs", async () => {
    stubHomeFetch();
    const { host, root } = await renderHome("templates");
    const tab = (label: string) =>
      [...host.querySelectorAll("aside button")].find((b) => b.textContent === label) as
        | HTMLButtonElement
        | undefined;

    expect(host.textContent).toContain("Plantillas");
    expect(tab("WissMotion")?.getAttribute("aria-current")).toBe("true");
    expect(host.querySelector('[data-testid="wissmotion-grid"]')).not.toBeNull();
    expect(host.textContent).not.toContain("Todas las plantillas");

    await act(async () => tab("HyperFrames")?.click());
    expect(host.querySelector('[data-testid="wissmotion-grid"]')).toBeNull();
    expect(host.textContent).toContain("Todas las plantillas");
    expect(host.textContent).toContain("Captions");
    await act(async () => root.unmount());
    host.remove();
  });

  it("shows the references tab and opens a reference with its brief", async () => {
    stubHomeFetch();
    const { host, root } = await renderHome("templates");
    const tab = [...host.querySelectorAll("aside button")].find(
      (b) => b.textContent === "Referencias",
    ) as HTMLButtonElement;

    await act(async () => tab.click());
    const cards = host.querySelectorAll('[data-testid="references-grid"] > button');
    expect(cards.length).toBe(21);

    await act(async () => (cards[0] as HTMLButtonElement).click());
    const detail = host.querySelector('[data-testid="reference-detail"]');
    expect(detail?.textContent).toContain("Copiar brief");
    expect(detail?.textContent).toContain("Se recrea con");
    await act(async () => root.unmount());
    host.remove();
  });
});
