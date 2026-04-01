import { useState } from "react";
import type { MCPResource } from "../types";
import { api } from "../api";
import JsonViewer from "./JsonViewer";

interface Props {
  resources: MCPResource[] | null;
  serverId: string;
  loading: boolean;
}

function ResourceCard({ resource, serverId }: { resource: MCPResource; serverId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const read = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.resources.read(serverId, resource.uri);
      setContent(data);
      setOpen(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resource-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="resource-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className="resource-info">
          <div className="resource-name">{resource.name}</div>
          <div className="resource-uri">{resource.uri}</div>
          {resource.description && <div className="resource-desc">{resource.description}</div>}
        </div>
        {resource.mimeType && <span className="resource-mime">{resource.mimeType}</span>}
        <button
          className="btn btn-secondary btn-sm"
          onClick={open ? () => setOpen(false) : read}
          disabled={loading}
          style={{ flexShrink: 0 }}
        >
          {loading ? <span className="spinner" /> : open ? "Hide" : "Read"}
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

      {open && content !== null && (
        <div className="result-area" style={{ marginTop: 10 }}>
          <div className="result-bar success">
            <span className="result-badge-ok">Content</span>
            <span className="result-bar-spacer" />
          </div>
          <div className="result-content">
            <JsonViewer data={content} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResourceList({ resources, serverId, loading }: Props) {
  if (loading && !resources) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)", padding: "20px 0" }}>
        <span className="spinner" />
        Loading resources…
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="empty-state" style={{ height: "auto", padding: "40px 0" }}>
        <div className="empty-state-icon" style={{ fontSize: 28 }}>📄</div>
        <h3>No resources</h3>
        <p>This server doesn't expose any resources.</p>
      </div>
    );
  }

  return (
    <div>
      {resources.map((r) => (
        <ResourceCard key={r.uri} resource={r} serverId={serverId} />
      ))}
    </div>
  );
}
