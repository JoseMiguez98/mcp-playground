import type { ServerInfo } from "../types";

interface Props {
  servers: ServerInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (server: ServerInfo) => void;
  onRefresh: () => void;
}

function TransportBadge({ t }: { t: string }) {
  const label = t === "streamable-http" ? "s-http" : t;
  return <span className="server-transport">{label}</span>;
}

export default function Sidebar({ servers, selectedId, onSelect, onAdd, onEdit, onRefresh }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Servers</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onRefresh} title="Refresh">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="sidebar-list">
        {servers.length === 0 && (
          <div style={{ padding: "12px 4px", color: "var(--text-2)", fontSize: 12, textAlign: "center" }}>
            No servers yet
          </div>
        )}
        {servers.map((s) => (
          <div
            key={s.id}
            className={`server-item ${selectedId === s.id ? "active" : ""}`}
            onClick={() => onSelect(s.id)}
            onDoubleClick={() => onEdit(s)}
            title={s.error ?? s.name}
          >
            <span className={`server-dot ${s.status}`} />
            <span className="server-name">{s.name}</span>
            <TransportBadge t={s.transport} />
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-secondary" style={{ width: "100%" }} onClick={onAdd}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Server
        </button>
      </div>
    </aside>
  );
}
