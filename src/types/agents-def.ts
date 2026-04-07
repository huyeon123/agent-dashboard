export type AgentScope = 'global' | 'project' | 'plugin';

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  model: string;
  tools: string[];
  path: string;
  scope: AgentScope;
  scopeLabel: string;
  raw: string;
}
