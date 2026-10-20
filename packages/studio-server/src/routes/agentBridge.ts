import type { Hono } from "hono";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * WissMotion: puente entre el MCP (proceso aparte) y el Studio abierto.
 *
 * El MCP deja una llamada (`POST /agent-bridge/call`); la pestaña del Studio
 * la recoge por long-poll (`GET /agent-bridge/next`), la ejecuta con sus
 * herramientas WebMCP reales (selección, textos, animaciones…) y devuelve el
 * resultado (`POST /agent-bridge/result`). Así el usuario ve cada edición en
 * vivo. Todo en memoria: un Studio por servidor, sin persistencia.
 */

export interface BridgeToolDef {
  name: string;
  description: string;
  inputSchema?: object;
}

interface BridgeCall {
  id: string;
  tool: string;
  input: object;
}

interface PendingCall {
  resolve: (result: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** Sin señales de la pestaña en este tiempo = Studio desconectado. */
const CLIENT_STALE_MS = 35_000;
const POLL_WAIT_MS = 25_000;
const CALL_TIMEOUT_MS = 60_000;

export function createAgentBridge(now: () => number = Date.now) {
  let tools: BridgeToolDef[] = [];
  let clientSeenAt = 0;
  let agentSeenAt = 0;
  let lastAgentTool: string | null = null;
  let seq = 0;
  const queue: BridgeCall[] = [];
  const pending = new Map<string, PendingCall>();
  let waiter: ((call: BridgeCall | null) => void) | null = null;

  const connected = () => now() - clientSeenAt < CLIENT_STALE_MS;

  return {
    connect(defs: BridgeToolDef[]) {
      tools = defs;
      clientSeenAt = now();
    },
    status() {
      return {
        studioConnected: connected(),
        tools,
        agentSeenAt: agentSeenAt || null,
        lastAgentTool,
        pendingCalls: pending.size,
      };
    },
    touchAgent() {
      agentSeenAt = now();
    },
    /** Long-poll de la pestaña: la siguiente llamada, o null al agotar la espera. */
    next(waitMs = POLL_WAIT_MS): Promise<BridgeCall | null> {
      clientSeenAt = now();
      const call = queue.shift();
      if (call) return Promise.resolve(call);
      // Una sola pestaña escucha: un poll nuevo libera al anterior.
      waiter?.(null);
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (waiter === done) waiter = null;
          resolve(null);
        }, waitMs);
        const done = (c: BridgeCall | null) => {
          clearTimeout(timer);
          resolve(c);
        };
        waiter = done;
      });
    },
    result(id: string, value: unknown): boolean {
      const p = pending.get(id);
      if (!p) return false;
      clearTimeout(p.timer);
      pending.delete(id);
      p.resolve(value);
      return true;
    },
    call(tool: string, input: object, timeoutMs = CALL_TIMEOUT_MS): Promise<unknown> {
      agentSeenAt = now();
      lastAgentTool = tool;
      seq += 1;
      const call = { id: `c${seq}`, tool, input };
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          pending.delete(call.id);
          const i = queue.indexOf(call);
          if (i >= 0) queue.splice(i, 1);
          resolve({ ok: false, error: "timeout: el Studio no respondió" });
        }, timeoutMs);
        pending.set(call.id, { resolve, timer });
        if (waiter) {
          const w = waiter;
          waiter = null;
          w(call);
        } else {
          queue.push(call);
        }
      });
    },
    connected,
  };
}

/** wissmotion/server/mcp.mjs subiendo desde este archivo (src o dist). */
function findMcpServer(): string | null {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, "wissmotion", "server", "mcp.mjs");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolDef(value: unknown): value is BridgeToolDef {
  return isRecord(value) && typeof value.name === "string" && typeof value.description === "string";
}

export function registerAgentBridgeRoutes(api: Hono, bridge = createAgentBridge()): void {
  api.get("/agent-bridge/status", (c) => c.json(bridge.status()));

  api.get("/agent-bridge/setup", (c) => c.json({ mcpServer: findMcpServer() }));

  api.post("/agent-bridge/connect", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const defs = isRecord(body) && Array.isArray(body.tools) ? body.tools.filter(isToolDef) : [];
    bridge.connect(defs);
    return c.json({ ok: true, tools: defs.length });
  });

  api.get("/agent-bridge/next", async (c) => {
    // Servidor reiniciado: perdió el registro, la pestaña debe reconectar.
    if (bridge.status().tools.length === 0) return c.json({ ok: false }, 409);
    const call = await bridge.next();
    return call ? c.json(call) : c.body(null, 204);
  });

  api.post("/agent-bridge/result", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    if (!isRecord(body) || typeof body.id !== "string") return c.json({ ok: false }, 400);
    return c.json({ ok: bridge.result(body.id, body.result) });
  });

  api.post("/agent-bridge/hello", (c) => {
    bridge.touchAgent();
    return c.json(bridge.status());
  });

  api.post("/agent-bridge/call", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    if (!isRecord(body) || typeof body.tool !== "string") {
      return c.json({ ok: false, error: "falta tool" }, 400);
    }
    if (!bridge.connected()) {
      return c.json({ ok: false, error: "el Studio no está abierto en el navegador" }, 503);
    }
    if (!bridge.status().tools.some((t) => t.name === body.tool)) {
      return c.json({ ok: false, error: `herramienta del Studio desconocida: ${body.tool}` }, 404);
    }
    const input = isRecord(body.input) ? body.input : {};
    return c.json({ ok: true, result: await bridge.call(body.tool, input) });
  });
}
