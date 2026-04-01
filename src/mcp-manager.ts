import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool, Resource, Prompt } from "@modelcontextprotocol/sdk/types.js";
import { type ServerConfig, isStdioConfig } from "./config.js";

export type ServerStatus = "connected" | "disconnected" | "connecting" | "error";

export interface ServerInfo {
  id: string;
  name: string;
  config: ServerConfig;
  status: ServerStatus;
  transport: string;
  error?: string;
}

interface ServerState extends ServerInfo {
  client?: Client;
}

class MCPManager {
  private states = new Map<string, ServerState>();

  addServer(id: string, name: string, config: ServerConfig): ServerInfo {
    const transport = isStdioConfig(config) ? "stdio" : config.transport;
    const state: ServerState = { id, name, config, status: "disconnected", transport };
    this.states.set(id, state);
    return this.toInfo(state);
  }

  updateServer(id: string, name: string, config: ServerConfig): ServerInfo {
    const existing = this.states.get(id);
    if (existing?.client) {
      existing.client.close().catch(() => {});
    }
    const transport = isStdioConfig(config) ? "stdio" : config.transport;
    const state: ServerState = { id, name, config, status: "disconnected", transport };
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
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args ?? [],
          env: { ...(process.env as Record<string, string>), ...config.env },
        });
      } else if (config.transport === "sse") {
        const headers = config.headers ?? {};
        transport = new SSEClientTransport(new URL(config.url), { requestInit: { headers } });
      } else {
        transport = new StreamableHTTPClientTransport(new URL(config.url));
      }

      await client.connect(transport);
      state.client = client;
      state.status = "connected";
    } catch (err) {
      state.status = "error";
      state.error = err instanceof Error ? err.message : String(err);
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

  private requireClient(id: string): Client {
    const state = this.states.get(id);
    if (!state) throw new Error(`Server '${id}' not found`);
    if (!state.client || state.status !== "connected") {
      throw new Error(`Server '${id}' is not connected`);
    }
    return state.client;
  }

  private toInfo = (state: ServerState): ServerInfo => {
    const { client: _, ...info } = state;
    return info;
  };
}

export const mcpManager = new MCPManager();
