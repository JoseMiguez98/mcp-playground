import { useState, useEffect } from "react";
import type { ServerInfo, MCPTool, MCPResource, MCPPrompt } from "../types";
import { api } from "../api";
import ToolList from "./ToolList";
import ResourceList from "./ResourceList";
import PromptList from "./PromptList";

interface Props {
  server: ServerInfo;
  onStatusChange: () => void;
}

type Tab = "tools" | "resources" | "prompts";

export default function ServerPanel({ server, onStatusChange }: Props) {
  const [tab, setTab] = useState<Tab>("tools");
  const [tools, setTools] = useState<MCPTool[] | null>(null);
  const [resources, setResources] = useState<MCPResource[] | null>(null);
  const [prompts, setPrompts] = useState<MCPPrompt[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isConnected = server.status === "connected";

  useEffect(() => {
    if (!isConnected) {
      setTools(null);
      setResources(null);
      setPrompts(null);
    } else {
      loadAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server.id, isConnected]);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const [t, r, p] = await Promise.allSettled([
        api.tools.list(server.id),
        api.resources.list(server.id),
        api.prompts.list(server.id),
      ]);
      if (t.status === "fulfilled") setTools(t.value);
      if (r.status === "fulfilled") setResources(r.value);
      if (p.status === "fulfilled") setPrompts(p.value);
      if (t.status === "rejected") setErr((t.reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setErr(null);
    try {
      await api.servers.connect(server.id);
      await onStatusChange();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await api.servers.disconnect(server.id);
      await onStatusChange();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const statusLabel = {
    connected: "Connected",
    connecting: "Connecting…",
    disconnected: "Disconnected",
    error: "Error",
  }[server.status];

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">{server.name}</div>
          <div className="panel-subtitle">
            {"command" in server.config
              ? `${server.config.command} ${(server.config.args ?? []).join(" ")}`
              : server.config.url}
          </div>
        </div>

        <div className="panel-header-spacer" />

        <span className={`status-badge ${server.status}`}>{statusLabel}</span>

        {server.status === "connected" ? (
          <button className="btn btn-disconnect btn-sm" onClick={handleDisconnect}>
            Disconnect
          </button>
        ) : (
          <button
            className="btn btn-connect btn-sm"
            onClick={handleConnect}
            disabled={connecting || server.status === "connecting"}
          >
            {connecting ? <span className="spinner" /> : null}
            Connect
          </button>
        )}

        {isConnected && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={loadAll} title="Refresh capabilities" disabled={loading}>
            {loading ? (
              <span className="spinner" style={{ width: 11, height: 11 }} />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            )}
          </button>
        )}
      </div>

      {server.error && (
        <div style={{ padding: "8px 20px 0" }}>
          <div className="error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {server.error}
          </div>
        </div>
      )}

      {err && (
        <div style={{ padding: "8px 20px 0" }}>
          <div className="error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {err}
          </div>
        </div>
      )}

      {!isConnected ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔌</div>
          <h3>Not connected</h3>
          <p>Connect to this server to browse and test its tools, resources, and prompts.</p>
        </div>
      ) : (
        <>
          <div className="panel-tabs">
            {(["tools", "resources", "prompts"] as Tab[]).map((t) => {
              const counts: Record<Tab, number | null> = {
                tools: tools?.length ?? null,
                resources: resources?.length ?? null,
                prompts: prompts?.length ?? null,
              };
              const count = counts[t];
              return (
                <button
                  key={t}
                  className={`panel-tab ${tab === t ? "active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {count !== null && <span className="tab-count">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="panel-body">
            {tab === "tools" && (
              <ToolList tools={tools} serverId={server.id} loading={loading} />
            )}
            {tab === "resources" && (
              <ResourceList resources={resources} serverId={server.id} loading={loading} />
            )}
            {tab === "prompts" && (
              <PromptList prompts={prompts} serverId={server.id} loading={loading} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
