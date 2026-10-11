// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GsapPresetPicker } from "./GsapPresetPicker";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mounted: { root: ReturnType<typeof createRoot>; host: HTMLElement } | null = null;
afterEach(() => {
  if (!mounted) return;
  const { root, host } = mounted;
  mounted = null;
  act(() => root.unmount());
  host.remove();
});

describe("GsapPresetPicker", () => {
  it("lista los presets y aplica el elegido", async () => {
    const applied: string[] = [];
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    mounted = { root, host };
    await act(async () =>
      root.render(<GsapPresetPicker onApplyPreset={(id) => applied.push(id)} />),
    );
    const select = host.querySelector("select")!;
    expect(select.options.length).toBeGreaterThanOrEqual(9);
    expect([...select.options].some((o) => o.value === "mask-reveal")).toBe(true);
    await act(async () => {
      select.value = "blur-in";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(applied).toEqual(["blur-in"]);
    expect(select.value).toBe("blur-in");
  });
});
