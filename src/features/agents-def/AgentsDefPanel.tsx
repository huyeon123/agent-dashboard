import { useState } from 'react';
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
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

function parseFrontmatter(raw: string): {
  name: string;
  description: string;
  model: string;
  tools: string[];
  body: string;
} {
  const result = { name: '', description: '', model: '', tools: [] as string[], body: '' };
  if (!raw) return result;

  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) {
    result.body = raw;
    return result;
  }

  const frontmatter = match[1];
  result.body = (match[2] ?? '').trim();

  for (const line of frontmatter.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      const key = kv[1];
      const value = kv[2].trim();
      if (key === 'name') result.name = value;
      else if (key === 'description') result.description = value.replace(/^["']|["']$/g, '');
      else if (key === 'model') result.model = value;
      else if (key === 'tools') {
        // tools might be on following lines as "  - X"
        continue;
      }
    }
    const toolMatch = line.match(/^\s+-\s+(.+)$/);
    if (toolMatch) {
      result.tools.push(toolMatch[1].trim());
    }
  }

  return result;
}

function CreateAgentDefDialog({
  agent,
  defaultScope = 'global',
  onClose,
  onCreated,
  t,
}: {
  agent: string;
  defaultScope?: 'global' | 'project';
  onClose: () => void;
  onCreated: () => void;
  t: (k: string) => string;
}) {
  const addToast = useToast((s) => s.addToast);
  const { projectPath } = useScope();
  const [form, setForm] = useState({
    name: '',
    description: '',
    tools: '',
    content: '',
    scope: defaultScope,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const toolsArr = form.tools
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        tools: toolsArr,
        content: form.content,
        scope: form.scope,
      };
      if (form.scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/agent-defs?agent=${agent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('agentsDef.created'), 'success');
      onCreated();
      onClose();
    } catch (err) {
      addToast(String(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-text-primary font-semibold mb-4">{t('agentsDef.createNew')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('agentsDef.name')}</label>
            <input
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('agentsDef.description')}</label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-20"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('agentsDef.toolsLabel')}</label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-16"
              placeholder="Read, Write, Edit, Bash"
              value={form.tools}
              onChange={(e) => setForm((f) => ({ ...f, tools: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('agentsDef.content')}</label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-32"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('agentsDef.scopeSelect')}</label>
            <select
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as 'global' | 'project' }))}
            >
              <option value="global">{t('common.global')}</option>
              <option value="project">{t('common.project')}</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="flex-1 py-2 border border-border rounded-lg text-sm text-text-secondary hover:border-border-hover transition-colors"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {submitting ? '...' : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAgentDefDialog({
  agent,
  agentDef,
  onClose,
  onUpdated,
  t,
}: {
  agent: string;
  agentDef: AgentDef;
  onClose: () => void;
  onUpdated: () => void;
  t: (k: string) => string;
}) {
  const addToast = useToast((s) => s.addToast);
  const parsed = parseFrontmatter(agentDef.raw ?? '');
  const [form, setForm] = useState({
    name: parsed.name || agentDef.name,
    description: parsed.description || agentDef.description || '',
    tools: (parsed.tools.length > 0 ? parsed.tools : agentDef.tools ?? []).join(', '),
    content: parsed.body,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const toolsArr = form.tools
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/agent-defs?agent=${agent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: agentDef.path,
          name: form.name,
          description: form.description,
          tools: toolsArr,
          content: form.content,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('agentsDef.updated'), 'success');
      onUpdated();
      onClose();
    } catch (err) {
      addToast(String(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-text-primary font-semibold mb-4">{t('agentsDef.editAgent')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('agentsDef.name')}</label>
            <input
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('agentsDef.description')}</label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-20"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('agentsDef.toolsLabel')}</label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-16"
              placeholder="Read, Write, Edit, Bash"
              value={form.tools}
              onChange={(e) => setForm((f) => ({ ...f, tools: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('agentsDef.content')}</label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-32"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="flex-1 py-2 border border-border rounded-lg text-sm text-text-secondary hover:border-border-hover transition-colors"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {submitting ? '...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  currentAgent,
  onChanged,
}: {
  agent: AgentDef;
  currentAgent: string;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const addToast = useToast((s) => s.addToast);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const tools = agent.tools ?? [];
  const scopeClass = SCOPE_BADGE[agent.scope ?? ''] ?? 'text-text-muted bg-bg-tertiary';
  const scopeKey = agent.scope && ['global', 'project', 'plugin', 'local'].includes(agent.scope)
    ? `common.${agent.scope}`
    : null;
  const canModify = agent.scope === 'global' || agent.scope === 'project';

  async function handleDelete() {
    if (!window.confirm(`${t('common.delete')}?`)) return;
    try {
      const res = await fetch(
        `/api/agent-defs?agent=${currentAgent}&path=${encodeURIComponent(agent.path ?? '')}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('agentsDef.deleted'), 'success');
      onChanged();
    } catch (err) {
      addToast(String(err), 'error');
    }
  }

  return (
    <>
      <div className="bg-bg-secondary rounded-xl border border-border flex flex-col">
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-text-primary">{agent.name}</span>
              {agent.scope && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${scopeClass}`}>
                  {scopeKey ? t(scopeKey) : agent.scope}
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

          <div className="flex items-center gap-2 mt-1">
            {agent.raw && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="self-start text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {expanded ? t('agentsDef.hideRaw') : t('agentsDef.showRaw')}
              </button>
            )}
            {canModify && (
              <div className="flex items-center gap-3 ml-auto">
                <button
                  className="text-xs text-text-muted hover:text-text-primary transition-colors"
                  onClick={() => setEditing(true)}
                >
                  {t('common.edit')}
                </button>
                <button
                  className="text-xs text-accent-red hover:text-accent-red/70 transition-colors"
                  onClick={handleDelete}
                >
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        </div>

        {expanded && agent.raw && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <pre className="font-mono text-xs text-text-secondary bg-bg-primary rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words">
              {agent.raw}
            </pre>
          </div>
        )}
      </div>

      {editing && (
        <EditAgentDefDialog
          agent={currentAgent}
          agentDef={agent}
          onClose={() => setEditing(false)}
          onUpdated={onChanged}
          t={t}
        />
      )}
    </>
  );
}

function ScopeGroup({
  scope,
  agents,
  currentAgent,
  onChanged,
}: {
  scope: string;
  agents: AgentDef[];
  currentAgent: string;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const scopeKey = ['global', 'project', 'plugin', 'local'].includes(scope) ? `common.${scope}` : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-text-primary capitalize">{scopeKey ? t(scopeKey) : scope}</span>
        <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">
          {agents.length}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} currentAgent={currentAgent} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
}

function AgentsDefScopeBadge({ scope }: { scope: 'global' | 'project' | 'local' }) {
  const { t } = useI18n();
  const colors = {
    global: 'bg-accent-purple/15 text-accent-purple border-accent-purple/20',
    project: 'bg-accent-green/15 text-accent-green border-accent-green/20',
    local: 'bg-accent-blue/15 text-accent-blue border-accent-blue/20',
  };
  const labels = { global: t('common.global'), project: t('common.project'), local: t('common.local') };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${colors[scope]}`}>
      {labels[scope]}
    </span>
  );
}

function AgentsDefContent({
  apiUrl,
  currentAgent,
  t,
  onChanged,
}: {
  apiUrl: string;
  currentAgent: string;
  t: (k: string) => string;
  onChanged: () => void;
}) {
  const { data, loading, error, reload } = useFetch<AgentDef[] | AgentDefsResponse>(apiUrl);

  const handleChanged = () => {
    reload();
    onChanged();
  };

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
        <ScopeGroup key={scope} scope={scope} agents={grouped[scope]} currentAgent={currentAgent} onChanged={handleChanged} />
      ))}
    </div>
  );
}

export function AgentsDefPanel() {
  const { t } = useI18n();
  const { currentAgent } = useAgentStore();
  const { projectPath, projects } = useScope();
  const projectOnly = useUiStore((s) => s.projectOnly);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const globalApiUrl = `/api/agent-defs?agent=${currentAgent}&_r=${refreshKey}`;
  const projectApiUrl = projectPath
    ? `/api/agent-defs?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}&_r=${refreshKey}`
    : null;

  const handleChanged = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">{t('agentsDef.title')}</h2>
        <button
          className="px-4 py-1.5 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity"
          onClick={() => setShowCreate(true)}
        >
          + {t('agentsDef.createNew')}
        </button>
      </div>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AgentsDefScopeBadge scope="global" />
          </div>
          <AgentsDefContent apiUrl={globalApiUrl} currentAgent={currentAgent} t={t} onChanged={handleChanged} />
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
          <AgentsDefContent apiUrl={projectApiUrl} currentAgent={currentAgent} t={t} onChanged={handleChanged} />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <p className="text-text-muted text-sm">{t('common.noData')}</p>
          </div>
        )}
      </section>

      {showCreate && (
        <CreateAgentDefDialog
          agent={currentAgent}
          defaultScope={projectOnly ? 'project' : 'global'}
          onClose={() => setShowCreate(false)}
          onCreated={handleChanged}
          t={t}
        />
      )}
    </div>
  );
}
