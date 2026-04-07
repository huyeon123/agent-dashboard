export interface AgentPaths {
  globalHome: string;
  projectDir: string;
  globalInstruction: string;
  projectInstruction: string;
  settings?: string;
  settingsFormat?: 'json' | 'toml' | 'jsonc';
  settingsOverride?: string;
  skills?: string;
  commands?: string;
  agents?: string;
  plugins?: string;
  hooks?: string;
  mcp?: string[];
  rulesDir?: {
    global?: string;
    project?: string;
  };
}

export interface AgentConfig {
  type: string;
  displayName: string;
  icon: string;
  desktopApps?: string[];
  sessionStrategy?: 'pid-json' | 'codex-jsonl';
  enabled: boolean;
  builtIn: boolean;
  paths: AgentPaths;
}

export interface AgentsRegistry {
  agents: AgentConfig[];
}

export interface AgentSupports {
  settings: boolean;
  rules: boolean;
  skills: boolean;
  commands: boolean;
  agentDefs: boolean;
  hooks: boolean;
  mcpServers: boolean;
  plugins: boolean;
}

export function getAgentSupports(paths: AgentPaths): AgentSupports {
  return {
    settings: !!paths.settings,
    rules: !!paths.rulesDir?.global || !!paths.rulesDir?.project,
    skills: !!paths.skills,
    commands: !!paths.commands,
    agentDefs: !!paths.agents,
    hooks: !!paths.hooks,
    mcpServers: !!paths.mcp && paths.mcp.length > 0,
    plugins: !!paths.plugins,
  };
}
