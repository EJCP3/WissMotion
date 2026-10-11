// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WissmotionSection } from "./WissmotionSection";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mounted: { root: Root; host: HTMLElement } | null = null;
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  if (!mounted) return;
  const { root, host } = mounted;
  mounted = null;
  act(() => root.unmount());
  host.remove();
});

async function mountSection(search = "") {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mounted = { root, host };
  const opened: Array<{ projectId: string; compPath?: string }> = [];
  await act(async () =>
    root.render(
      <WissmotionSection
        projects={[{ id: "p1" }]}
        status="ready"
        search={search}
        visible
        onOpenProject={(projectId, compPath) => opened.push({ projectId, compPath })}
      />,
    ),
  );
  return { host, opened };
}

describe("WissmotionSection", () => {
  it("muestra las 12 plantillas y filtra por búsqueda", async () => {
    const { host } = await mountSection();
    expect(host.querySelectorAll('[data-testid="wissmotion-grid"] button')).toHaveLength(12);
    const { host: filtered } = await mountSection("logo");
    expect(filtered.querySelectorAll('[data-testid="wissmotion-grid"] button')).toHaveLength(1);
    expect(filtered.textContent).toContain("Intro de logo");
  });

  it("oculta la sección cuando hay categoría de bloques activa", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    mounted = { root, host };
    await act(async () =>
      root.render(
        <WissmotionSection
          projects={[{ id: "p1" }]}
          status="ready"
          search=""
          visible={false}
          onOpenProject={() => {}}
        />,
      ),
    );
    expect(host.querySelector('[data-testid="wissmotion-grid"]')).toBeNull();
  });

  it("instalar escribe la plantilla y abre el editor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok", { status: 200 })),
    );
    const { host, opened } = await mountSection("historia");
    const card = host.querySelector('[data-testid="wissmotion-grid"] button') as HTMLButtonElement;
    await act(async () => card.click());
    expect(opened).toEqual([{ projectId: "p1", compPath: "compositions/historia.html" }]);
  });
});
