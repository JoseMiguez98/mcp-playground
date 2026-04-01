export interface StdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface HttpConfig {
  url: string;
  transport: "sse" | "streamable-http";
  headers?: Record<string, string>;
}

export type ServerConfig = StdioConfig | HttpConfig;

export function isStdioConfig(c: ServerConfig): c is StdioConfig {
  return "command" in c;
}

export type ServerStatus = "connected" | "disconnected" | "connecting" | "error";
export type TransportType = "stdio" | "sse" | "streamable-http";

export interface ServerInfo {
  id: string;
  name: string;
  status: ServerStatus;
  transport: TransportType;
  config: ServerConfig;
  error?: string;
}

export interface JSONSchemaProperty {
  type?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  anyOf?: JSONSchemaProperty[];
  oneOf?: JSONSchemaProperty[];
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, JSONSchemaProperty>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

export interface EmbeddedResource {
  type: "resource";
  resource: { uri: string; text?: string; blob?: string; mimeType?: string };
}

export type ToolContent = TextContent | ImageContent | EmbeddedResource;

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}
