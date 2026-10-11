// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DomEditSelection } from "../components/editor/domEditingTypes";
import { useGsapAnimationOps } from "./useGsapAnimationOps";
import type { MotionPreset } from "../motion/wissmotionPresets";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type HookApi = ReturnType<typeof useGsapAnimationOps>;

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

const selection = { id: "box", selector: "#box" } as DomEditSelection;

const MASK_REVEAL: MotionPreset = {
  id: "mask-reveal",
  kind: "entrada",
  description: "reveal",
  method: "fromTo",
  duration: 0.9,
  ease: "power3.out",
  properties: { clipPath: "inset(0 0% 0 0)" },
  fromProperties: { clipPath: "inset(0 100% 0 0)" },
};

function renderOps(commitMutation: (...args: unknown[]) => Promise<void> = vi.fn(async () => undefined)): {
  api: HookApi;
  commitMutation: (...args: unknown[]) => Promise<void>;
} {
  const captured: { api: HookApi | null } = { api: null };
  function Probe() {
    captured.api = useGsapAnimationOps({
      projectIdRef: { current: "project" },
      activeCompPath: "index.html",
      commitMutation,
      commitMutationSafely: vi.fn(async () => undefined),
      showToast: vi.fn(),
      sdkSession: null,
      sdkDeps: null,
    });
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));
  cleanup = () => act(() => root.unmount());
  if (!captured.api) throw new Error("hook did not initialize");
  return { api: captured.api, commitMutation };
}

describe("useGsapAnimationOps preset", () => {
  it("inserta el preset completo en una sola mutación add", async () => {
    const commitMutation = vi.fn(async () => undefined);
    const { api } = renderOps(commitMutation);
    await api.addGsapAnimation(selection, "fromTo", 0.5, MASK_REVEAL);
    expect(commitMutation).toHaveBeenCalledTimes(1);
    expect(commitMutation).toHaveBeenCalledWith(
      selection,
      expect.objectContaining({
        type: "add",
        targetSelector: "#box",
        method: "fromTo",
        duration: 0.9,
        ease: "power3.out",
        properties: { clipPath: "inset(0 0% 0 0)" },
        fromProperties: { clipPath: "inset(0 100% 0 0)" },
      }),
      expect.objectContaining({ label: "Apply mask-reveal preset", softReload: true }),
    );
  });

  it("sin preset conserva los defaults del alta manual", async () => {
    const commitMutation = vi.fn(async () => undefined);
    const { api } = renderOps(commitMutation);
    await api.addGsapAnimation(selection, "from");
    expect(commitMutation).toHaveBeenCalledWith(
      selection,
      expect.objectContaining({
        type: "add",
        method: "from",
        properties: { opacity: 0 },
      }),
      expect.objectContaining({ label: "Add GSAP from animation" }),
    );
  });
});
