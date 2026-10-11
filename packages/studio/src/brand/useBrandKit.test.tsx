// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useBrandKit } from "./useBrandKit";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mounted: { root: Root; host: HTMLElement } | null = null;
afterEach(() => {
  localStorage.clear();
  if (!mounted) return;
  const { root, host } = mounted;
  mounted = null;
  act(() => root.unmount());
  host.remove();
});

function Probe({
  projectId,
  onKit,
}: {
  projectId: string;
  onKit: (kit: ReturnType<typeof useBrandKit>) => void;
}) {
  const kit = useBrandKit(projectId);
  onKit(kit);
  return null;
}

async function mountKit(projectId: string) {
  let kit!: ReturnType<typeof useBrandKit>;
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mounted = { root, host };
  await act(async () => root.render(<Probe projectId={projectId} onKit={(k) => (kit = k)} />));
  const rerender = async () =>
    act(async () => root.render(<Probe projectId={projectId} onKit={(k) => (kit = k)} />));
  return { get: () => kit, rerender };
}

describe("useBrandKit", () => {
  it("aísla la marca por proyecto y persiste en localStorage", async () => {
    const a = await mountKit("proj-a");
    act(() => a.get().patch({ name: "Acme" }));
    expect(JSON.parse(localStorage.getItem("wissmotion-studio:brand:proj-a")!).name).toBe("Acme");
    expect(localStorage.getItem("wissmotion-studio:brand:proj-b")).toBeNull();
  });

  it("setColor normaliza y rechaza hex inválido", async () => {
    const a = await mountKit("proj-a");
    let ok = false;
    act(() => {
      ok = a.get().setColor("primary", "#fff");
    });
    expect(ok).toBe(true);
    await a.rerender();
    expect(a.get().brand.colors.primary).toBe("#ffffff");
    act(() => {
      ok = a.get().setColor("primary", "morado");
    });
    expect(ok).toBe(false);
    await a.rerender();
    expect(a.get().brand.colors.primary).toBe("#ffffff");
  });

  it("importJson acepta una marca válida y rechaza sin aplicarla", async () => {
    const a = await mountKit("proj-a");
    const good = new File(
      [JSON.stringify({ ...a.get().brand, name: "Importada" })],
      "marca.brand.json",
      { type: "application/json" },
    );
    let problems: string[] = ["?"];
    await act(async () => {
      problems = await a.get().importJson(good);
    });
    expect(problems).toEqual([]);
    await a.rerender();
    expect(a.get().brand.name).toBe("Importada");

    const bad = new File(["{no-json"], "x.json", { type: "application/json" });
    await act(async () => {
      problems = await a.get().importJson(bad);
    });
    expect(problems).toEqual(["$"]);
    await a.rerender();
    expect(a.get().brand.name).toBe("Importada");
  });

  it("reset vuelve a la marca neutra", async () => {
    const a = await mountKit("proj-a");
    act(() => a.get().patch({ name: "Acme" }));
    act(() => a.get().reset());
    await a.rerender();
    expect(a.get().brand.name).toBe("");
  });

  it("replace sustituye la marca y writeStoredBrand persiste validando", async () => {
    const a = await mountKit("proj-a");
    const { readStoredBrand, writeStoredBrand } = await import("./useBrandKit");
    expect(readStoredBrand("proj-a")).toBeNull();
    expect(writeStoredBrand("proj-a", { nope: true })).toBe(false);
    const full = { ...a.get().brand, name: "Acme" };
    expect(writeStoredBrand("proj-a", full)).toBe(true);
    expect(readStoredBrand("proj-a")?.name).toBe("Acme");
    act(() => a.get().replace({ ...full, tagline: "Hola" }));
    await a.rerender();
    expect(a.get().brand.tagline).toBe("Hola");
  });
});
