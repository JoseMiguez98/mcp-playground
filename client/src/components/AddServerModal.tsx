import { useState, useEffect } from "react";
import type { ServerInfo, ServerConfig } from "../types";
import { isStdioConfig } from "../types";

type Transport = "stdio" | "sse" | "streamable-http";

interface EnvEntry { key: string; value: string }

interface Props {
  existing: ServerInfo | null;
  onClose: () => void;
  onSave: (id: string, name: string, config: ServerConfig) => Promise<void>;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
}

export default function AddServerModal({ existing, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [transport, setTransport] = useState<Transport>("stdio");

  // stdio
  const [command, setCommand] = useState("");
  const [argsStr, setArgsStr] = useState("");
  const [env, setEnv] = useState<EnvEntry[]>([]);

  // http
  const [url, setUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate from existing
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setId(existing.id);
    setIdTouched(true);
    setTransport(existing.transport as Transport);
    if (isStdioConfig(existing.config)) {
      setCommand(existing.config.command);
      setArgsStr((existing.config.args ?? []).join(" "));
      setEnv(
        Object.entries(existing.config.env ?? {}).map(([key, value]) => ({ key, value }))
      );
    } else {
      setUrl(existing.config.url);
    }
  }, [existing]);

  useEffect(() => {
    if (!idTouched && name) setId(slugify(name));
  }, [name, idTouched]);

  const addEnvRow = () => setEnv((e) => [...e, { key: "", value: "" }]);
  const removeEnvRow = (i: number) => setEnv((e) => e.filter((_, idx) => idx !== i));
  const updateEnv = (i: number, field: "key" | "value", val: string) =>
    setEnv((e) => e.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) return setError("Server name is required.");
    if (!id.trim()) return setError("Server ID is required.");

    let config: ServerConfig;

    if (transport === "stdio") {
      if (!command.trim()) return setError("Command is required for stdio transport.");
      const envObj: Record<string, string> = {};
      for (const { key, value } of env) {
        if (key.trim()) envObj[key.trim()] = value;
      }
      config = {
        command: command.trim(),
        args: argsStr.trim()
          ? argsStr.trim().split(/\s+/)
          : [],
        ...(Object.keys(envObj).length ? { env: envObj } : {}),
      };
    } else {
      if (!url.trim()) return setError("URL is required.");
      try { new URL(url.trim()); } catch { return setError("Invalid URL."); }
      config = { url: url.trim(), transport };
    }

    setSaving(true);
    try {
      await onSave(id.trim(), name.trim(), config);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{existing ? "Edit Server" : "Add Server"}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-banner" style={{ marginBottom: 16 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                placeholder="My MCP Server"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">ID <span>(used in config)</span></label>
              <input
                className="form-input"
                placeholder="my-mcp-server"
                value={id}
                onChange={(e) => { setId(e.target.value); setIdTouched(true); }}
                style={{ fontFamily: "var(--mono)" }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Transport</label>
            <div className="transport-tabs">
              {(["stdio", "sse", "streamable-http"] as Transport[]).map((t) => (
                <button
                  key={t}
                  className={`transport-tab ${transport === t ? "active" : ""}`}
                  onClick={() => setTransport(t)}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          {transport === "stdio" ? (
            <>
              <div className="form-group">
                <label className="form-label">Command</label>
                <input
                  className="form-input"
                  placeholder="node"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  style={{ fontFamily: "var(--mono)" }}
                />
                <div className="form-hint">The executable to run (e.g. node, python, npx)</div>
              </div>

              <div className="form-group">
                <label className="form-label">Arguments <span>(space-separated)</span></label>
                <input
                  className="form-input"
                  placeholder="server.js --port 8080"
                  value={argsStr}
                  onChange={(e) => setArgsStr(e.target.value)}
                  style={{ fontFamily: "var(--mono)" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Environment Variables</label>
                {env.map((row, i) => (
                  <div key={i} className="env-row">
                    <input
                      className="form-input"
                      placeholder="KEY"
                      value={row.key}
                      onChange={(e) => updateEnv(i, "key", e.target.value)}
                      style={{ fontFamily: "var(--mono)", fontSize: 12 }}
                    />
                    <input
                      className="form-input"
                      placeholder="value"
                      value={row.value}
                      onChange={(e) => updateEnv(i, "value", e.target.value)}
                      style={{ fontFamily: "var(--mono)", fontSize: 12 }}
                    />
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeEnvRow(i)}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button className="env-add-btn" onClick={addEnvRow} type="button">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add variable
                </button>
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">
                {transport === "sse" ? "SSE Endpoint URL" : "HTTP Endpoint URL"}
              </label>
              <input
                className="form-input"
                placeholder={transport === "sse" ? "http://localhost:8080/sse" : "http://localhost:8080/mcp"}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={{ fontFamily: "var(--mono)" }}
              />
              <div className="form-hint">
                {transport === "sse"
                  ? "The SSE endpoint your MCP server listens on"
                  : "The Streamable HTTP endpoint your MCP server listens on"}
              </div>
            </div>
          )}

          <div className="divider" />

          <details style={{ cursor: "pointer" }}>
            <summary style={{ fontSize: 12, color: "var(--text-2)", userSelect: "none" }}>
              Preview config (mcp-servers.json)
            </summary>
            <pre style={{
              marginTop: 10,
              padding: 12,
              background: "var(--bg-canvas)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              fontSize: 11,
              fontFamily: "var(--mono)",
              color: "var(--text-1)",
              overflowX: "auto",
              lineHeight: 1.7,
            }}>
              {JSON.stringify(
                {
                  [id || "server-id"]:
                    transport === "stdio"
                      ? {
                          command: command || "node",
                          ...(argsStr.trim() ? { args: argsStr.trim().split(/\s+/) } : {}),
                        }
                      : { url: url || "http://localhost:8080/...", transport },
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : null}
            {existing ? "Save Changes" : "Add Server"}
          </button>
        </div>
      </div>
    </div>
  );
}
