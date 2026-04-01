import type {
  ServerInfo,
  ServerConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
  ToolResult,
} from "./types";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as T;
}

const post = (path: string, body?: unknown) =>
  req(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const api = {
  servers: {
    list: () => req<ServerInfo[]>("/servers"),
    add: (id: string, name: string, config: ServerConfig) =>
      req<ServerInfo>("/servers", { method: "POST", body: JSON.stringify({ id, name, config }) }),
    update: (id: string, name: string, config: ServerConfig) =>
      req<ServerInfo>(`/servers/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, config }),
      }),
    remove: (id: string) => req(`/servers/${id}`, { method: "DELETE" }),
    connect: (id: string) => post(`/servers/${id}/connect`),
    disconnect: (id: string) => post(`/servers/${id}/disconnect`),
  },
  tools: {
    list: (id: string) => req<MCPTool[]>(`/servers/${id}/tools`),
    call: (id: string, tool: string, args: Record<string, unknown>) =>
      post(`/servers/${id}/tools/${encodeURIComponent(tool)}/call`, args) as Promise<ToolResult>,
  },
  resources: {
    list: (id: string) => req<MCPResource[]>(`/servers/${id}/resources`),
    read: (id: string, uri: string) =>
      post(`/servers/${id}/resources/read`, { uri }),
  },
  prompts: {
    list: (id: string) => req<MCPPrompt[]>(`/servers/${id}/prompts`),
    get: (id: string, prompt: string, args: Record<string, string>) =>
      post(`/servers/${id}/prompts/${encodeURIComponent(prompt)}/get`, args),
  },
};
