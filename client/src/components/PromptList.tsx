import { useState } from "react";
import type { MCPPrompt } from "../types";
import { api } from "../api";
import JsonViewer from "./JsonViewer";

interface Props {
  prompts: MCPPrompt[] | null;
  serverId: string;
  loading: boolean;
}

function PromptCard({ prompt, serverId }: { prompt: MCPPrompt; serverId: string }) {
  const [open, setOpen] = useState(false);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const hasArgs = (prompt.arguments?.length ?? 0) > 0;

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.prompts.get(serverId, prompt.name, args);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={`prompt-card ${open ? "expanded" : ""}`}>
      <div className="prompt-card-header" onClick={() => setOpen((o) => !o)}>
        <div className="prompt-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="tool-card-info">
          <div className="tool-name">{prompt.name}</div>
          {prompt.description && <div className="tool-desc">{prompt.description}</div>}
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
          {hasArgs ? (
            <>
              <div className="form-section-title">Arguments</div>
              {prompt.arguments!.map((arg) => (
                <div key={arg.name} className="field-group">
                  <div className="field-label">
                    {arg.name}
                    {arg.required && <span className="field-required">*</span>}
                    <span className="field-type">string</span>
                  </div>
                  {arg.description && <div className="field-desc">{arg.description}</div>}
                  <input
                    type="text"
                    className="field-input"
                    value={args[arg.name] ?? ""}
                    onChange={(e) =>
                      setArgs((a) => ({ ...a, [arg.name]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </>
          ) : (
            <p className="no-params">No arguments — this prompt takes no input.</p>
          )}

          <div className="run-controls">
            <div className="run-controls-spacer" />
            <button className="btn btn-primary btn-sm" onClick={run} disabled={running}>
              {running ? <span className="spinner" /> : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
              Get Prompt
            </button>
          </div>

          {error && (
            <div className="error-banner" style={{ marginTop: 10 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {result !== null && (
            <div className="result-area">
              <div className="result-bar success">
                <span className="result-badge-ok">Messages</span>
                <span className="result-bar-spacer" />
              </div>
              <div className="result-content">
                <JsonViewer data={result} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PromptList({ prompts, serverId, loading }: Props) {
  if (loading && !prompts) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)", padding: "20px 0" }}>
        <span className="spinner" />
        Loading prompts…
      </div>
    );
  }

  if (!prompts || prompts.length === 0) {
    return (
      <div className="empty-state" style={{ height: "auto", padding: "40px 0" }}>
        <div className="empty-state-icon" style={{ fontSize: 28 }}>💬</div>
        <h3>No prompts</h3>
        <p>This server doesn't expose any prompts.</p>
      </div>
    );
  }

  return (
    <div>
      {prompts.map((p) => (
        <PromptCard key={p.name} prompt={p} serverId={serverId} />
      ))}
    </div>
  );
}
