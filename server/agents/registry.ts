import fs from 'fs';
import path from 'path';
import type { AgentConfig, AgentsRegistry } from './types';
import { AgentAdapter } from './adapter';

const DATA_DIR = path.join(process.cwd(), 'data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');

let cachedRegistry: AgentsRegistry | null = null;

export function loadRegistry(): AgentsRegistry {
  try {
    const raw = fs.readFileSync(AGENTS_FILE, 'utf-8');
    cachedRegistry = JSON.parse(raw) as AgentsRegistry;
    return cachedRegistry;
  } catch {
    return { agents: [] };
  }
}

export function saveRegistry(registry: AgentsRegistry): void {
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(registry, null, 2), 'utf-8');
  cachedRegistry = registry;
}

export function getAdapter(agentType: string): AgentAdapter | null {
  const registry = loadRegistry();
  const config = registry.agents.find((a) => a.type === agentType && a.enabled);
  if (!config) return null;
  return new AgentAdapter(config);
}

export function getAllAdapters(): AgentAdapter[] {
  const registry = loadRegistry();
  return registry.agents
    .filter((a) => a.enabled)
    .map((a) => new AgentAdapter(a));
}

export function getEnabledAgentConfigs(): AgentConfig[] {
  const registry = loadRegistry();
  return registry.agents.filter((a) => a.enabled);
}
