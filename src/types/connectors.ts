export interface McpServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  toolCount?: number;
}

export interface Connector {
  name: string;
  type: 'platform' | 'mcp';
  tools: string[];
  status: 'connected' | 'disconnected' | 'unknown';
}
