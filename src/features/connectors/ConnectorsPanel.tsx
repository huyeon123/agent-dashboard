import { useState } from 'react';
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';
import { useUiStore } from '../../store/ui-store';

interface McpServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

interface ConnectorsResponse {
  mcpServers: McpServer[];
}

function ScopeBadge({ scope }: { scope: 'global' | 'project' | 'local' }) {
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

function CreateMcpDialog({
  agent,
  onClose,
  onCreated,
  t,
}: {
  agent: string;
  onClose: () => void;
  onCreated: () => void;
  t: (k: string) => string;
}) {
  const addToast = useToast((s) => s.addToast);
  const { projectPath } = useScope();
  const [form, setForm] = useState({
    name: '',
    command: '',
    args: '',
    scope: 'global' as 'global' | 'project',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const argsArr = form.args.split('\n').map((s) => s.trim()).filter(Boolean);
      const body: Record<string, unknown> = {
        name: form.name,
        command: form.command,
        args: argsArr,
        scope: form.scope,
      };
      if (form.scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/connectors?agent=${agent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('connectors.created'), 'success');
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
      <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-md mx-4 p-6">
        <h3 className="text-text-primary font-semibold mb-4">{t('connectors.createNew')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('connectors.serverName')}</label>
            <input
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('connectors.commandLabel')}</label>
            <input
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              placeholder="npx"
              value={form.command}
              onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('connectors.argsLabel')}</label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-24"
              placeholder={"-y\n@modelcontextprotocol/server-github"}
              value={form.args}
              onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('connectors.scopeLabel')}</label>
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

function EditMcpDialog({
  agent,
  server,
  scope,
  projectPath,
  onClose,
  onUpdated,
  t,
}: {
  agent: string;
  server: McpServer;
  scope: 'global' | 'project';
  projectPath?: string;
  onClose: () => void;
  onUpdated: () => void;
  t: (k: string) => string;
}) {
  const addToast = useToast((s) => s.addToast);
  const [form, setForm] = useState({
    command: server.command,
    args: (server.args ?? []).join('\n'),
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const argsArr = form.args.split('\n').map((s) => s.trim()).filter(Boolean);
      const body: Record<string, unknown> = {
        name: server.name,
        command: form.command,
        args: argsArr,
        scope,
      };
      if (scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/connectors?agent=${agent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('connectors.updated'), 'success');
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
      <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-md mx-4 p-6">
        <h3 className="text-text-primary font-semibold mb-4">{t('connectors.editServer')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('connectors.serverName')}</label>
            <input
              disabled
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-muted focus:outline-none"
              value={server.name}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('connectors.commandLabel')}</label>
            <input
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.command}
              onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('connectors.argsLabel')}</label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-24"
              value={form.args}
              onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
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

function ServerCard({
  server,
  agent,
  scope,
  projectPath,
  onChanged,
}: {
  server: McpServer;
  agent: string;
  scope: 'global' | 'project';
  projectPath?: string;
  onChanged: () => void;
}) {
  const { t, tf } = useI18n();
  const addToast = useToast((s) => s.addToast);
  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const args = server.args ?? [];
  const isDisabled = server.disabled === true;

  async function handleDelete() {
    if (!window.confirm(`${t('common.delete')}?`)) return;
    try {
      let url = `/api/connectors?agent=${agent}&name=${encodeURIComponent(server.name)}&scope=${scope}`;
      if (scope === 'project' && projectPath) {
        url += `&path=${encodeURIComponent(projectPath)}`;
      }
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('connectors.deleted'), 'success');
      onChanged();
    } catch (err) {
      addToast(String(err), 'error');
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      const body: Record<string, unknown> = {
        name: server.name,
        disabled: !isDisabled,
        scope,
      };
      if (scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/connectors/toggle?agent=${agent}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChanged();
    } catch (err) {
      addToast(String(err), 'error');
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <div className={`bg-bg-secondary rounded-xl border border-border p-4 flex flex-col gap-2 ${isDisabled ? 'opacity-50' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-text-primary truncate">{server.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            {args.length > 0 && (
              <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">
                {tf('connectors.args', { count: args.length })}
              </span>
            )}
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors disabled:opacity-50 ${
                isDisabled
                  ? 'bg-bg-tertiary text-text-muted border-border hover:border-border-hover'
                  : 'bg-accent-green/20 text-accent-green border-accent-green/30 hover:opacity-80'
              }`}
            >
              {toggling ? '...' : isDisabled ? t('connectors.toggleDisabled') : t('connectors.toggleEnabled')}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-accent-blue font-mono">
          <span className="text-text-muted">$</span>
          <span className="truncate">{server.command}</span>
        </div>
        {args.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {args.map((arg, i) => (
              <span
                key={i}
                className="text-xs font-mono text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded"
              >
                {arg}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-1">
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
      </div>

      {editing && (
        <EditMcpDialog
          agent={agent}
          server={server}
          scope={scope}
          projectPath={projectPath}
          onClose={() => setEditing(false)}
          onUpdated={onChanged}
          t={t}
        />
      )}
    </>
  );
}

function ConnectorsSection({
  apiUrl,
  agent,
  scope,
  projectPath,
  t,
  onChanged,
}: {
  apiUrl: string;
  agent: string;
  scope: 'global' | 'project';
  projectPath?: string;
  t: (k: string) => string;
  onChanged: () => void;
}) {
  const { data, loading, error, reload } = useFetch<ConnectorsResponse>(apiUrl);
  const servers = data?.mcpServers ?? [];
  const { tf } = useI18n();

  const handleChanged = () => {
    reload();
    onChanged();
  };

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

  if (servers.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-8 flex flex-col items-center gap-2 text-center">
        <p className="text-text-muted text-sm">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        {tf('connectors.configuredServers', { count: servers.length })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {servers.map((server) => (
          <ServerCard
            key={server.name}
            server={server}
            agent={agent}
            scope={scope}
            projectPath={projectPath}
            onChanged={handleChanged}
          />
        ))}
      </div>
    </div>
  );
}

export function ConnectorsPanel() {
  const { t } = useI18n();
  const { currentAgent } = useAgentStore();
  const { projectPath, projects } = useScope();
  const projectOnly = useUiStore((s) => s.projectOnly);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const globalApiUrl = `/api/connectors?agent=${currentAgent}&_r=${refreshKey}`;
  const projectApiUrl = projectPath
    ? `/api/connectors?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}&_r=${refreshKey}`
    : null;

  const handleChanged = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">{t('tabs.connectors')}</h2>
        <button
          className="px-4 py-1.5 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity"
          onClick={() => setShowCreate(true)}
        >
          + {t('connectors.createNew')}
        </button>
      </div>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ScopeBadge scope="global" />
          </div>
          <ConnectorsSection
            apiUrl={globalApiUrl}
            agent={currentAgent}
            scope="global"
            t={t}
            onChanged={handleChanged}
          />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ScopeBadge scope="project" />
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-text-muted text-sm">{t('common.registerProjects')}</p>
          </div>
        ) : projectApiUrl ? (
          <ConnectorsSection
            apiUrl={projectApiUrl}
            agent={currentAgent}
            scope="project"
            projectPath={projectPath ?? undefined}
            t={t}
            onChanged={handleChanged}
          />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <p className="text-text-muted text-sm">{t('common.noData')}</p>
          </div>
        )}
      </section>

      {showCreate && (
        <CreateMcpDialog
          agent={currentAgent}
          onClose={() => setShowCreate(false)}
          onCreated={handleChanged}
          t={t}
        />
      )}
    </div>
  );
}
