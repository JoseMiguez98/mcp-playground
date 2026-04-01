import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface StdioServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface HttpServerConfig {
  url: string;
  transport: "sse" | "streamable-http";
  headers?: Record<string, string>;
}

export type ServerConfig = StdioServerConfig | HttpServerConfig;

export interface PlaygroundConfig {
  mcpServers: Record<string, ServerConfig>;
}

const CONFIG_PATH = join(process.cwd(), "mcp-servers.json");

export function loadConfig(): PlaygroundConfig {
  if (!existsSync(CONFIG_PATH)) {
    const defaultConfig: PlaygroundConfig = { mcpServers: {} };
    writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  try {
    const content = readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return { mcpServers: {} };
  }
}

export function saveConfig(config: PlaygroundConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function isStdioConfig(config: ServerConfig): config is StdioServerConfig {
  return "command" in config;
}
