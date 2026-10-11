// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useHomeRoute } from "./useHomeRoute";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const seen: { view: string | null } = { view: "unset" };

function Probe() {
  seen.view = useHomeRoute().view;
  return null;
}

describe("useHomeRoute", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  it("reads the home view from the initial hash", async () => {
    window.location.hash = "#home/templates";
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(<Probe />));

    expect(seen.view).toBe("templates");
    await act(async () => root.unmount());
  });

  it("is null outside the home and follows hash navigation", async () => {
    window.location.hash = "#project/demo";
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<Probe />));
    expect(seen.view).toBeNull();

    await act(async () => {
      window.location.hash = "#home";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(seen.view).toBe("drafts");

    await act(async () => {
      window.location.hash = "#project/demo";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(seen.view).toBeNull();
    await act(async () => root.unmount());
    host.remove();
  });
});
