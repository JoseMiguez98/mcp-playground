import { useState, useEffect, useRef, useCallback } from "react";
import type { LogEntry } from "../types";

interface Props {
  serverId: string;
}

const TYPE_LABEL: Record<string, string> = {
  send:   "↑ send  ",
  recv:   "↓ recv  ",
  stderr: "! stderr",
  info:   "· info  ",
  error:  "✕ error ",
};

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString("en", {
    hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function LogPanel({ serverId }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Auto-scroll to bottom when entries change (only if user hasn't scrolled up)
  useEffect(() => {
    if (autoScrollRef.current && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [entries]);

  const handleScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }, []);

  // Connect to SSE stream for this server
  useEffect(() => {
    setEntries([]);
    autoScrollRef.current = true;

    const es = new EventSource(`/api/servers/${serverId}/logs/stream`);

    es.onmessage = (e) => {
      const entry = JSON.parse(e.data) as LogEntry;
      setEntries((prev) => prev.length >= 500 ? [...prev.slice(-499), entry] : [...prev, entry]);
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, [serverId]);

  const handleClear = async () => {
    await fetch(`/api/servers/${serverId}/logs`, { method: "DELETE" });
    setEntries([]);
  };

  return (
    <div className="log-panel">
      <div className="log-toolbar">
        <span className="log-legend">
          <span className="log-type-send">↑ send</span>
          <span className="log-type-recv">↓ recv</span>
          <span className="log-type-stderr">! stderr</span>
          <span className="log-type-info">· info</span>
        </span>
        <span className="log-count">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        <button className="btn btn-ghost btn-sm" onClick={handleClear} title="Clear logs">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
          Clear
        </button>
      </div>

      <div className="log-body" ref={bodyRef} onScroll={handleScroll}>
        {entries.length === 0 ? (
          <div className="log-empty">
            <p>No messages yet.</p>
            <p>Connect to the server to start seeing JSON-RPC traffic.</p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className={`log-entry log-entry-${entry.type}`}>
              <span className="log-time">{fmt(entry.ts)}</span>
              <span className={`log-type log-type-${entry.type}`}>{TYPE_LABEL[entry.type] ?? entry.type}</span>
              <pre className="log-data">{entry.data}</pre>
            </div>
          ))
        )}
        <div className="log-anchor" />
      </div>
    </div>
  );
}
