import { useState } from 'react';
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';
import { useUiStore } from '../../store/ui-store';

interface AgentDef {
  id: string;
  name: string;
  description?: string;
  model?: string;
  tools?: string[];
  path?: string;
  scope?: 'global' | 'project' | 'plugin' | string;
  raw?: string;
}

interface AgentDefsResponse {
  unsupported?: boolean;
  data?: AgentDef[];
}

const MODEL_BADGE: Record<string, string> = {
  opus: 'text-accent-purple bg-accent-purple/10',
  sonnet: 'text-accent-blue bg-accent-blue/10',
  haiku: 'text-accent-green bg-accent-green/10',
};

const SCOPE_BADGE: Record<string, string> = {
  global: 'text-accent-yellow bg-accent-yellow/10',
  project: 'text-accent-blue bg-accent-blue/10',
  plugin: 'text-accent-purple bg-accent-purple/10',
};

function modelBadgeClass(model?: string): string {
  if (!model) return 'text-text-muted bg-bg-tertiary';
  const key = Object.keys(MODEL_BADGE).find((k) => model.toLowerCase().includes(k));
  return key ? MODEL_BADGE[key] : 'text-text-muted bg-bg-tertiary';
}

function modelLabel(model?: string): string {
  if (!model) return 'unknown';
  const parts = model.split('-');
  return parts.slice(0, 2).join('-');
}

function AgentCard({ agent }: { agent: AgentDef }) {
  const [expanded, setExpanded] = useState(false);
  const tools = agent.tools ?? [];
  const scopeClass = SCOPE_BADGE[agent.scope ?? ''] ?? 'text-text-muted bg-bg-tertiary';

  return (
    <div className="bg-bg-secondary rounded-xl border border-border flex flex-col">
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text-primary">{agent.name}</span>
            {agent.scope && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${scopeClass}`}>
                {agent.scope}
              </span>
            )}
          </div>
          {agent.model && (
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full shrink-0 ${modelBadgeClass(agent.model)}`}>
              {modelLabel(agent.model)}
            </span>
          )}
        </div>

        {agent.description && (
          <p className="text-sm text-text-secondary leading-relaxed">{agent.description}</p>
        )}

        {tools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tools.map((tool) => (
              <span
                key={tool}
                className="text-xs font-mono text-text-muted bg-bg-tertiary px-2 py-0.5 rounded"
              >
                {tool}
              </span>
            ))}
          </div>
        )}

        {agent.raw && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="self-start text-xs text-text-muted hover:text-text-primary transition-colors mt-1 flex items-center gap-1"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {expanded ? 'Hide raw' : 'Show raw'}
          </button>
        )}
      </div>

      {expanded && agent.raw && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <pre className="font-mono text-xs text-text-secondary bg-bg-primary rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words">
            {agent.raw}
          </pre>
        </div>
      )}
    </div>
  );
}

function ScopeGroup({ scope, agents }: { scope: string; agents: AgentDef[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-text-primary capitalize">{scope}</span>
        <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">
          {agents.length}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function AgentsDefScopeBadge({ scope }: { scope: 'global' | 'project' | 'local' }) {
  const colors = {
    global: 'bg-accent-purple/15 text-accent-purple border-accent-purple/20',
    project: 'bg-accent-green/15 text-accent-green border-accent-green/20',
    local: 'bg-accent-blue/15 text-accent-blue border-accent-blue/20',
  };
  const labels = { global: 'Global', project: 'Project', local: 'Local' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${colors[scope]}`}>
      {labels[scope]}
    </span>
  );
}

function AgentsDefContent({
  apiUrl,
  t,
}: {
  apiUrl: string;
  t: (k: string) => string;
}) {
  const { data, loading, error } = useFetch<AgentDef[] | AgentDefsResponse>(apiUrl);

  const isUnsupported = !Array.isArray(data) && data?.unsupported === true;
  const agents: AgentDef[] = Array.isArray(data) ? data : (data?.data ?? []);

  const grouped = agents.reduce<Record<string, AgentDef[]>>((acc, agent) => {
    const key = agent.scope ?? 'global';
    if (!acc[key]) acc[key] = [];
    acc[key].push(agent);
    return acc;
  }, {});

  const scopeOrder = ['global', 'project', 'plugin'];
  const sortedScopes = Object.keys(grouped).sort(
    (a, b) => scopeOrder.indexOf(a) - scopeOrder.indexOf(b)
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted">
        <div className="w-4 h-4 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-accent-red/30 p-4 text-accent-red text-sm">
        {t('common.error')}: {error}
      </div>
    );
  }

  if (isUnsupported) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-8 flex flex-col items-center gap-2 text-center">
        <p className="text-text-muted text-sm">{t('common.unsupported')}</p>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-8 flex flex-col items-center gap-2 text-center">
        <p className="text-text-muted text-sm">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {sortedScopes.map((scope) => (
        <ScopeGroup key={scope} scope={scope} agents={grouped[scope]} />
      ))}
    </div>
  );
}

export function AgentsDefPanel() {
  const { t } = useI18n();
  const { currentAgent } = useAgentStore();
  const { projectPath, projects } = useScope();
  const projectOnly = useUiStore((s) => s.projectOnly);

  const globalApiUrl = `/api/agent-defs?agent=${currentAgent}`;
  const projectApiUrl = projectPath
    ? `/api/agent-defs?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">{t('agentsDef.title')}</h2>
      </div>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AgentsDefScopeBadge scope="global" />
          </div>
          <AgentsDefContent apiUrl={globalApiUrl} t={t} />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AgentsDefScopeBadge scope="project" />
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-text-muted text-sm">{t('common.registerProjects')}</p>
          </div>
        ) : projectApiUrl ? (
          <AgentsDefContent apiUrl={projectApiUrl} t={t} />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <p className="text-text-muted text-sm">{t('common.noData')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
