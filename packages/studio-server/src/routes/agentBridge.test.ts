import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createAgentBridge, registerAgentBridgeRoutes } from "./agentBridge";

const TOOL = { name: "studio_select", description: "select" };

function setup() {
  const bridge = createAgentBridge();
  const api = new Hono();
  registerAgentBridgeRoutes(api, bridge);
  const post = (path: string, body: unknown) =>
    api.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  return { bridge, api, post };
}

describe("agent bridge", () => {
  it("sin Studio conectado, la llamada responde 503", async () => {
    const { post } = setup();
    const res = await post("/agent-bridge/call", { tool: "studio_select", input: {} });
    expect(res.status).toBe(503);
  });

  it("ida y vuelta: el agente llama, la pestaña ejecuta y responde", async () => {
    const { api, post } = setup();
    await post("/agent-bridge/connect", { tools: [TOOL] });
    const callPromise = post("/agent-bridge/call", { tool: "studio_select", input: { id: "a" } });
    const next = await api.request("/agent-bridge/next");
    const call = (await next.json()) as { id: string; tool: string; input: { id: string } };
    expect(call.tool).toBe("studio_select");
    expect(call.input.id).toBe("a");
    await post("/agent-bridge/result", { id: call.id, result: { ok: true, selected: "a" } });
    const body = (await (await callPromise).json()) as { result: { selected: string } };
    expect(body.result.selected).toBe("a");
  });

  it("una llamada en espera despierta un poll ya abierto", async () => {
    const { bridge } = setup();
    bridge.connect([TOOL]);
    const polled = bridge.next(1000);
    const answered = bridge.call("studio_select", {});
    const call = await polled;
    expect(call?.tool).toBe("studio_select");
    bridge.result(call?.id ?? "", { ok: true });
    await expect(answered).resolves.toEqual({ ok: true });
  });

  it("rechaza herramientas que el Studio no registró", async () => {
    const { post } = setup();
    await post("/agent-bridge/connect", { tools: [TOOL] });
    const res = await post("/agent-bridge/call", { tool: "nope", input: {} });
    expect(res.status).toBe(404);
  });

  it("el estado marca la última actividad del agente", async () => {
    const { api, post } = setup();
    await post("/agent-bridge/hello", {});
    const status = (await (await api.request("/agent-bridge/status")).json()) as {
      agentSeenAt: number | null;
      studioConnected: boolean;
    };
    expect(status.agentSeenAt).not.toBeNull();
    expect(status.studioConnected).toBe(false);
  });
});
