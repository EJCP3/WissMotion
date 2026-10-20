/**
 * WissMotion: la pestaña del Studio atiende al MCP externo por el puente del
 * servidor (`/api/agent-bridge/*`). Publica sus herramientas WebMCP, recoge
 * llamadas por long-poll y las ejecuta con el mismo `execute` que usaría un
 * agente en el navegador, así cada edición se ve en vivo y entra al historial.
 * Funciona sin WebMCP nativo ni polyfill.
 */

import { studioApiFetch } from "../utils/studioApiFetch";
import type { ModelContextTool } from "./types";

const BASE = "/api/agent-bridge";
const RETRY_MS = 3_000;

interface BridgeCall {
  id: string;
  tool: string;
  input: object;
}

function isBridgeCall(value: unknown): value is BridgeCall {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.tool === "string";
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });
}

async function postJson(path: string, body: unknown, signal: AbortSignal) {
  return studioApiFetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export async function runBridgeCall(
  tools: readonly ModelContextTool[],
  call: BridgeCall,
  signal: AbortSignal,
): Promise<unknown> {
  const tool = tools.find((t) => t.name === call.tool);
  if (!tool) return { ok: false, error: `herramienta desconocida: ${call.tool}` };
  try {
    // Ida y vuelta por JSON: lo que no se serializa no viaja al agente.
    return JSON.parse(JSON.stringify((await tool.execute(call.input ?? {}, { signal })) ?? null));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function startAgentBridge(
  tools: readonly ModelContextTool[],
  signal: AbortSignal,
): Promise<void> {
  const defs = tools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
  while (!signal.aborted) {
    try {
      const hello = await postJson("/connect", { tools: defs }, signal);
      if (!hello.ok) throw new Error(`connect ${hello.status}`);
      while (!signal.aborted) {
        const res = await studioApiFetch(`${BASE}/next`, { signal });
        if (res.status === 204) continue;
        if (!res.ok) throw new Error(`next ${res.status}`);
        const call: unknown = await res.json();
        if (!isBridgeCall(call)) continue;
        const result = await runBridgeCall(tools, call, signal);
        await postJson("/result", { id: call.id, result }, signal);
      }
    } catch {
      // Servidor sin puente (build antiguo) o reinicio: reintento tranquilo.
      await sleep(RETRY_MS, signal);
    }
  }
}
