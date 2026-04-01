import { useState, useEffect, useCallback } from "react";
import type { ServerInfo } from "./types";
import { api } from "./api";
import Sidebar from "./components/Sidebar";
import ServerPanel from "./components/ServerPanel";
import AddServerModal from "./components/AddServerModal";

export default function App() {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editServer, setEditServer] = useState<ServerInfo | null>(null);

  const loadServers = useCallback(async () => {
    try {
      const data = await api.servers.list();
      setServers(data);
    } catch (e) {
      console.error("Failed to load servers:", e);
    }
  }, []);

  useEffect(() => {
    loadServers();
    const id = setInterval(loadServers, 4000);
    return () => clearInterval(id);
  }, [loadServers]);

  const selectedServer = servers.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          MCP Playground
        </div>
        <div className="header-spacer" />
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 11, color: "var(--text-2)" }}
        >
          MCP Docs
        </a>
      </header>

      <div className="layout">
        <Sidebar
          servers={servers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={() => { setEditServer(null); setShowAdd(true); }}
          onEdit={(s) => { setEditServer(s); setShowAdd(true); }}
          onRefresh={loadServers}
        />

        {selectedServer ? (
          <ServerPanel
            key={selectedServer.id}
            server={selectedServer}
            onStatusChange={loadServers}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <h3>No server selected</h3>
            <p>Add an MCP server from the sidebar to start testing tools, resources, and prompts.</p>
            <button className="btn btn-primary" onClick={() => { setEditServer(null); setShowAdd(true); }}>
              Add Server
            </button>
          </div>
        )}
      </div>

      {showAdd && (
        <AddServerModal
          existing={editServer}
          onClose={() => setShowAdd(false)}
          onSave={async (id, name, config) => {
            if (editServer) {
              await api.servers.update(id, name, config);
            } else {
              await api.servers.add(id, name, config);
            }
            await loadServers();
            setSelectedId(id);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
