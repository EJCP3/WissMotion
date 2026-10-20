import { useEffect, useState } from "react";
import { Button, cn } from "../ui";
import { useLanguage } from "../i18n/LanguageContext";
import { studioApiFetch } from "../utils/studioApiFetch";
import { copyTextToClipboard } from "../utils/clipboard";

/**
 * WissMotion: "Conectar agente". Comandos listos para copiar por agente y el
 * estado del puente MCP ↔ Studio (`/api/agent-bridge/status`), sondeado
 * mientras la sección está abierta.
 */

interface BridgeStatus {
  studioConnected: boolean;
  tools: { name: string }[];
  agentSeenAt: number | null;
  lastAgentTool: string | null;
}

const POLL_MS = 5_000;
/** Un agente que habló hace menos de esto cuenta como conectado. */
const AGENT_RECENT_MS = 120_000;

export function agentSnippets(server: string): { id: string; label: string; text: string }[] {
  const json = (block: object) => JSON.stringify(block, null, 2);
  const stdio = { command: "node", args: [server] };
  const pluginDir = server.replace(/[\\/]server[\\/]mcp\.mjs$/, "");
  return [
    {
      id: "claude-code",
      label: "Claude Code",
      text: [
        `claude plugin marketplace add "${pluginDir}"`,
        "claude plugin install wissmotion@wissmotion",
      ].join("\n"),
    },
    {
      id: "claude-desktop",
      label: "Claude Desktop / Cursor / Gemini CLI",
      text: json({ mcpServers: { wissmotion: stdio } }),
    },
    {
      id: "opencode",
      label: "OpenCode (opencode.json)",
      text: json({ mcp: { wissmotion: { type: "local", command: ["node", server] } } }),
    },
    {
      id: "vscode",
      label: "VS Code (.vscode/mcp.json)",
      text: json({ servers: { wissmotion: stdio } }),
    },
    {
      id: "codex",
      label: "Codex CLI (config.toml)",
      text: `[mcp_servers.wissmotion]\ncommand = "node"\nargs = [${JSON.stringify(server)}]`,
    },
  ];
}

function useBridge(open: boolean) {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [server, setServer] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await studioApiFetch("/api/agent-bridge/status");
        if (alive && res.ok) setStatus((await res.json()) as BridgeStatus);
      } catch {
        if (alive) setStatus(null);
      }
    };
    void studioApiFetch("/api/agent-bridge/setup")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { mcpServer?: string | null } | null) => alive && setServer(d?.mcpServer ?? null))
      .catch(() => null);
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [open]);
  return { status, server };
}

function Dot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2 w-2 rounded-full", on ? "bg-accent" : "bg-text-5")}
    />
  );
}

export function ConnectAgentSection() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { status, server } = useBridge(open);
  const agentRecent = status?.agentSeenAt
    ? Date.now() - status.agentSeenAt < AGENT_RECENT_MS
    : false;
  const path = server ?? "<ruta>/wissmotion/server/mcp.mjs";

  const copy = async (id: string, value: string) => {
    if (await copyTextToClipboard(value)) {
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    }
  };

  return (
    <details
      className="border-b border-border-strong px-3 py-2"
      data-testid="connect-agent"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer text-step-11 font-semibold uppercase tracking-wide text-text-3">
        {t("agent.connect")}
      </summary>
      <div className="mt-2 grid gap-2 text-step-12 text-text-2">
        <p className="flex items-center gap-2" role="status">
          <Dot on={Boolean(status?.studioConnected)} />
          {status?.studioConnected
            ? t("agent.bridgeOn").replace("{n}", String(status.tools.length))
            : t("agent.bridgeOff")}
        </p>
        <p className="flex items-center gap-2">
          <Dot on={agentRecent} />
          {agentRecent
            ? t("agent.agentOn").replace("{tool}", status?.lastAgentTool ?? "studio_status")
            : t("agent.agentOff")}
        </p>
        <p className="text-text-3">{t("agent.help")}</p>
        {agentSnippets(path).map((s) => (
          <div key={s.id} className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-text-1">{s.label}</span>
              <Button variant="ghost" onClick={() => void copy(s.id, s.text)}>
                {copied === s.id ? t("agent.copied") : t("agent.copy")}
              </Button>
            </div>
            <pre className="overflow-x-auto whitespace-pre rounded-md bg-input p-2 text-step-12 text-text-1">
              {s.text}
            </pre>
          </div>
        ))}
      </div>
    </details>
  );
}
