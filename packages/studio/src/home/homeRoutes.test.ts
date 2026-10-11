import { describe, expect, it } from "vitest";
import { buildHomeHash, isHomeHash, parseHomeRoute } from "./homeRoutes";

describe("home routes", () => {
  it("parses the drafts view from the bare home hash", () => {
    expect(parseHomeRoute("#home")).toBe("drafts");
    expect(parseHomeRoute("#home/")).toBe("drafts");
  });

  it("parses the templates view", () => {
    expect(parseHomeRoute("#home/templates")).toBe("templates");
    expect(parseHomeRoute("#home/templates/")).toBe("templates");
  });

  it("leaves editor hashes alone", () => {
    expect(parseHomeRoute("")).toBeNull();
    expect(parseHomeRoute("#project/demo")).toBeNull();
    expect(parseHomeRoute("#project/demo?comp=index.html")).toBeNull();
    expect(parseHomeRoute("#home/other")).toBeNull();
  });

  it("detects home hashes for the connection bootstrap", () => {
    expect(isHomeHash("#home")).toBe(true);
    expect(isHomeHash("#home/templates")).toBe(true);
    expect(isHomeHash("#project/demo")).toBe(false);
    expect(isHomeHash("")).toBe(false);
  });

  it("round-trips both views", () => {
    expect(parseHomeRoute(buildHomeHash("drafts"))).toBe("drafts");
    expect(parseHomeRoute(buildHomeHash("templates"))).toBe("templates");
  });
});
