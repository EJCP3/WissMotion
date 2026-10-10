// @vitest-environment happy-dom
// Imports the header logo and button size classes the way a host app does: by package name.
import { createRoot } from "react-dom/client";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { HyperframesLogo, WissMotionLogo, buttonSizes } from "@hyperframes/studio";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("header package exports", () => {
  it("mounts the legacy Hyperframes logo mark (kept export)", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    const root = createRoot(el);
    await act(async () => root.render(<HyperframesLogo />));
    expect(el.querySelector("svg")).not.toBeNull();
    await act(async () => root.unmount());
  });

  it("mounts the WissMotion logo mark", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    const root = createRoot(el);
    await act(async () => root.render(<WissMotionLogo />));
    expect(el.querySelector("svg")).not.toBeNull();
    expect(el.querySelector('[aria-label="WissMotion"]')).not.toBeNull();
    await act(async () => root.unmount());
  });

  it("exposes the button size classes a host reuses for matching chrome", () => {
    expect(buttonSizes.md).toEqual(expect.any(String));
  });
});
