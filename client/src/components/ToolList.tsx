import { useState } from "react";
import type { MCPTool } from "../types";
import { api } from "../api";
import SchemaForm from "./SchemaForm";
import JsonViewer from "./JsonViewer";

interface Props {
  tools: MCPTool[] | null;
  serverId: string;
  loading: boolean;
}

interface ToolRunnerState {
  values: Record<string, unknown>;
  running: boolean;
  result: unknown;
  error: string | null;
  elapsed: number | null;
}

function ToolCard({ tool, serverId }: { tool: MCPTool; serverId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ToolRunnerState>({
    values: {},
    running: false,
    result: null,
    error: null,
    elapsed: null,
  });

  const run = async () => {
    setState((s) => ({ ...s, running: true, error: null, result: null, elapsed: null }));
    const t0 = Date.now();
    try {
      // Clean up empty values
      const args: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(state.values)) {
        if (v !== undefined && v !== "") args[k] = v;
      }
      const res = await api.tools.call(serverId, tool.name, args);
      setState((s) => ({
        ...s,
        running: false,
        result: res,
        elapsed: Date.now() - t0,
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        running: false,
        error: (e as Error).message,
        elapsed: Date.now() - t0,
      }));
    }
  };

  const isError = (state.result as { isError?: boolean })?.isError;

  return (
    <div className={`tool-card ${open ? "expanded" : ""}`}>
      <div className="tool-card-header" onClick={() => setOpen((o) => !o)}>
        <div className="tool-card-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <div className="tool-card-info">
          <div className="tool-name">{tool.name}</div>
          {tool.description && <div className="tool-desc">{tool.description}</div>}
        </div>
        <svg
          className={`tool-card-chevron ${open ? "open" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {open && (
        <div className="tool-card-body">
          <SchemaForm
            schema={tool.inputSchema}
            values={state.values}
            onChange={(v) => setState((s) => ({ ...s, values: v }))}
          />

          <div className="run-controls">
            <div className="run-controls-spacer" />
            {state.elapsed !== null && (
              <span style={{ fontSize: 11, color: "var(--text-2)" }}>{state.elapsed}ms</span>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={run}
              disabled={state.running}
            >
              {state.running ? <span className="spinner" /> : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
              Run
            </button>
          </div>

          {state.error && (
            <div className="result-area">
              <div className="result-bar error">
                <span className="result-badge-err">Error</span>
                <span className="result-bar-spacer" />
              </div>
              <div className="result-content">
                <span className="result-text-item" style={{ color: "var(--red)" }}>{state.error}</span>
              </div>
            </div>
          )}

          {state.result !== null && !state.error && (
            <ToolResult result={state.result} isError={!!isError} />
          )}
        </div>
      )}
    </div>
  );
}

function ToolResult({ result, isError }: { result: unknown; isError: boolean }) {
  const r = result as { content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }> };
  const content = r?.content ?? [];

  return (
    <div className="result-area">
      <div className={`result-bar ${isError ? "error" : "success"}`}>
        {isError ? (
          <span className="result-badge-err">Tool Error</span>
        ) : (
          <span className="result-badge-ok">Success</span>
        )}
        <span className="result-bar-spacer" />
      </div>
      <div className="result-content">
        {content.length === 0 ? (
          <JsonViewer data={result} />
        ) : (
          content.map((item, i) => {
            if (item.type === "text") {
              return (
                <pre key={i} className="result-text-item">
                  {item.text}
                </pre>
              );
            }
            if (item.type === "image") {
              return (
                <img
                  key={i}
                  className="result-image"
                  src={`data:${item.mimeType};base64,${item.data}`}
                  alt="tool result"
                />
              );
            }
            return <JsonViewer key={i} data={item} />;
          })
        )}
      </div>
    </div>
  );
}

export default function ToolList({ tools, serverId, loading }: Props) {
  if (loading && !tools) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)", padding: "20px 0" }}>
        <span className="spinner" />
        Loading tools…
      </div>
    );
  }

  if (!tools || tools.length === 0) {
    return (
      <div className="empty-state" style={{ height: "auto", padding: "40px 0" }}>
        <div className="empty-state-icon" style={{ fontSize: 28 }}>🔧</div>
        <h3>No tools</h3>
        <p>This server doesn't expose any tools.</p>
      </div>
    );
  }

  return (
    <div>
      {tools.map((tool) => (
        <ToolCard key={tool.name} tool={tool} serverId={serverId} />
      ))}
    </div>
  );
}
