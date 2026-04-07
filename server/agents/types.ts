
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
}

export interface AgentConfig {
  type: string;
  displayName: string;
  icon: string;
  enabled: boolean;
  builtIn: boolean;
  paths: AgentPaths;
}

export interface AgentsRegistry {
  agents: AgentConfig[];
}

export interface InstructionsData {
  raw: string;
  sections: { title: string; content: string[] }[];
  filePath: string;
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  path: string;
  source: 'user' | 'plugin' | 'project';
  content: string;
  projectName?: string;
}

export interface AgentSupports {
  settings: boolean;
  skills: boolean;
  commands: boolean;
  agentDefs: boolean;
  hooks: boolean;
  mcpServers: boolean;
  plugins: boolean;
}

export function resolveHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return p.replace('~', process.env.HOME || '/tmp');
  }
  return p;
}

export function getSupports(paths: AgentPaths): AgentSupports {
  return {
    settings: !!paths.settings,
    skills: !!paths.skills,
    commands: !!paths.commands,
    agentDefs: !!paths.agents,
    hooks: !!paths.hooks,
    mcpServers: !!paths.mcp && paths.mcp.length > 0,
    plugins: !!paths.plugins,
  };
}
