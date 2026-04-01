import { mkdirSync } from "fs";
import { join } from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool, Resource, Prompt } from "@modelcontextprotocol/sdk/types.js";
import { type ServerConfig, isStdioConfig } from "./config.js";

export type ServerStatus = "connected" | "disconnected" | "connecting" | "error";

export type LogEntryType = "send" | "recv" | "stderr" | "info" | "error";

export interface LogEntry {
  type: LogEntryType;
  data: string;
  ts: number;
}

export interface ServerInfo {
  id: string;
  name: string;
  config: ServerConfig;
  status: ServerStatus;
  transport: string;
  error?: string;
}

const LOG_BUFFER_SIZE = 500;

interface ServerState extends ServerInfo {
  client?: Client;
  logs: LogEntry[];
  subscribers: Set<(entry: LogEntry) => void>;
}

class MCPManager {
  private states = new Map<string, ServerState>();

  addServer(id: string, name: string, config: ServerConfig): ServerInfo {
    const transport = isStdioConfig(config) ? "stdio" : config.transport;
    const state: ServerState = {
      id, name, config, status: "disconnected", transport,
      logs: [], subscribers: new Set(),
    };
    this.states.set(id, state);
    return this.toInfo(state);
  }

  updateServer(id: string, name: string, config: ServerConfig): ServerInfo {
    const existing = this.states.get(id);
    if (existing?.client) {
      existing.client.close().catch(() => {});
    }
    const transport = isStdioConfig(config) ? "stdio" : config.transport;
    const state: ServerState = {
      id, name, config, status: "disconnected", transport,
      logs: existing?.logs ?? [], subscribers: existing?.subscribers ?? new Set(),
    };
    this.states.set(id, state);
    return this.toInfo(state);
  }

  async removeServer(id: string): Promise<void> {
    const state = this.states.get(id);
    if (state?.client) {
      await state.client.close().catch(() => {});
    }
    this.states.delete(id);
  }

  getServerInfo(id: string): ServerInfo | undefined {
    const state = this.states.get(id);
    return state ? this.toInfo(state) : undefined;
  }

  getAllServerInfo(): ServerInfo[] {
    return Array.from(this.states.values()).map(this.toInfo);
  }

  getLogs(id: string): LogEntry[] {
    return this.states.get(id)?.logs ?? [];
  }

  clearLogs(id: string): void {
    const state = this.states.get(id);
    if (state) state.logs = [];
  }

  /** Returns an unsubscribe function. */
  subscribe(id: string, cb: (entry: LogEntry) => void): () => void {
    const state = this.states.get(id);
    if (!state) return () => {};
    state.subscribers.add(cb);
    return () => state.subscribers.delete(cb);
  }

  async connect(id: string): Promise<void> {
    const state = this.states.get(id);
    if (!state) throw new Error(`Server '${id}' not found`);

    if (state.client) {
      await state.client.close().catch(() => {});
      state.client = undefined;
    }

    state.status = "connecting";
    state.error = undefined;

    try {
      const client = new Client(
        { name: "mcp-playground", version: "1.0.0" },
        { capabilities: {} }
      );

      const config = state.config;
      let transport;

      if (isStdioConfig(config)) {
        const serverCwd = join(process.cwd(), ".mcp-data", id);
        mkdirSync(serverCwd, { recursive: true });
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args ?? [],
          env: { ...(process.env as Record<string, string>), ...config.env },
          stderr: "pipe",
          cwd: serverCwd,
        });
      } else if (config.transport === "sse") {
        const headers = config.headers ?? {};
        transport = new SSEClientTransport(new URL(config.url), { requestInit: { headers } });
      } else {
        transport = new StreamableHTTPClientTransport(new URL(config.url));
      }

      // Intercept send() to log outgoing messages
      const origSend = transport.send.bind(transport);
      transport.send = async (msg: unknown) => {
        this.addLog(id, { type: "send", data: JSON.stringify(msg, null, 2), ts: Date.now() });
        return origSend(msg as never);
      };

      // Intercept onmessage assignment to log incoming messages
      let _onmessage: ((msg: unknown) => void) | undefined;
      const self = this;
      Object.defineProperty(transport, "onmessage", {
        get() { return _onmessage; },
        set(handler: ((msg: unknown) => void) | undefined) {
          _onmessage = handler
            ? (msg) => {
                self.addLog(id, { type: "recv", data: JSON.stringify(msg, null, 2), ts: Date.now() });
                handler(msg);
              }
            : undefined;
        },
        configurable: true,
      });

      this.addLog(id, { type: "info", data: `Connecting to ${isStdioConfig(config) ? `${config.command} ${(config.args ?? []).join(" ")}` : config.url} …`, ts: Date.now() });

      await client.connect(transport);

      // Capture stderr from stdio subprocess (accessed after start())
      if (isStdioConfig(config)) {
        const proc = (transport as unknown as { _process?: { stderr?: NodeJS.ReadableStream } })._process;
        if (proc?.stderr) {
          proc.stderr.on("data", (chunk: Buffer) => {
            const lines = chunk.toString().trimEnd();
            if (lines) this.addLog(id, { type: "stderr", data: lines, ts: Date.now() });
          });
        }
      }

      state.client = client;
      state.status = "connected";
      this.addLog(id, { type: "info", data: "Connected.", ts: Date.now() });
    } catch (err) {
      state.status = "error";
      state.error = err instanceof Error ? err.message : String(err);
      this.addLog(id, { type: "error", data: state.error, ts: Date.now() });
      throw err;
    }
  }

  async disconnect(id: string): Promise<void> {
    const state = this.states.get(id);
    if (!state) throw new Error(`Server '${id}' not found`);
    if (state.client) {
      await state.client.close().catch(() => {});
      state.client = undefined;
    }
    state.status = "disconnected";
    state.error = undefined;
    this.addLog(id, { type: "info", data: "Disconnected.", ts: Date.now() });
  }

  async listTools(id: string): Promise<Tool[]> {
    const result = await this.requireClient(id).listTools();
    return result.tools;
  }

  async callTool(id: string, toolName: string, args: Record<string, unknown>) {
    return await this.requireClient(id).callTool({ name: toolName, arguments: args });
  }

  async listResources(id: string): Promise<Resource[]> {
    const result = await this.requireClient(id).listResources();
    return result.resources;
  }

  async readResource(id: string, uri: string) {
    return await this.requireClient(id).readResource({ uri });
  }

  async listPrompts(id: string): Promise<Prompt[]> {
    const result = await this.requireClient(id).listPrompts();
    return result.prompts;
  }

  async getPrompt(id: string, name: string, args: Record<string, string>) {
    return await this.requireClient(id).getPrompt({ name, arguments: args });
  }

  private addLog(id: string, entry: LogEntry): void {
    const state = this.states.get(id);
    if (!state) return;
    state.logs.push(entry);
    if (state.logs.length > LOG_BUFFER_SIZE) state.logs.shift();
    for (const cb of state.subscribers) cb(entry);
  }

  private requireClient(id: string): Client {
    const state = this.states.get(id);
    if (!state) throw new Error(`Server '${id}' not found`);
    if (!state.client || state.status !== "connected") {
      throw new Error(`Server '${id}' is not connected`);
    }
    return state.client;
  }

  private toInfo = (state: ServerState): ServerInfo => {
    const { client: _, logs: __, subscribers: ___, ...info } = state;
    return info;
  };
}

export const mcpManager = new MCPManager();
