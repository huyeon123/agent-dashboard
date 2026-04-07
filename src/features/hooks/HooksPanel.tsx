import { useState } from 'react';
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';
import { useUiStore } from '../../store/ui-store';

interface Hook {
  event: string;
  matcher?: string;
  type: 'command' | 'http' | 'prompt' | 'agent';
  command?: string;
  timeout?: number;
  index?: number;
  scope?: 'global' | 'project';
}

interface HooksResponse {
  hooks: Hook[];
  disableAllHooks: boolean;
  unsupported?: boolean;
}

const HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'SessionStart',
  'Stop',
  'Notification',
  'UserPromptSubmit',
  'PreCompact',
  'PostCompact',
  'PermissionRequest',
];

const HOOK_TYPES = ['command', 'http', 'prompt', 'agent'] as const;

const TYPE_COLORS: Record<string, string> = {
  command: 'text-accent-blue bg-accent-blue/10',
  http: 'text-accent-green bg-accent-green/10',
  prompt: 'text-accent-yellow bg-accent-yellow/10',
  agent: 'text-accent-purple bg-accent-purple/10',
};

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

function CreateHookDialog({
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
    event: 'PreToolUse',
    matcher: '',
    type: 'command' as 'command' | 'http' | 'prompt' | 'agent',
    commandValue: '',
    timeout: '',
    scope: 'global' as 'global' | 'project',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const hook: Record<string, unknown> = {
        type: form.type,
        command: form.commandValue,
      };
      if (form.timeout) {
        hook.timeout = parseInt(form.timeout, 10);
      }
      const body: Record<string, unknown> = {
        event: form.event,
        matcher: form.matcher,
        hook,
        scope: form.scope,
      };
      if (form.scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/hooks?agent=${agent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('hooks.created'), 'success');
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
        <h3 className="text-text-primary font-semibold mb-4">{t('hooks.createNew')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('hooks.eventLabel')}</label>
            <select
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.event}
              onChange={(e) => setForm((f) => ({ ...f, event: e.target.value }))}
            >
              {HOOK_EVENTS.map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('hooks.matcherLabel')}</label>
            <input
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              placeholder="Bash, Write|Edit, *"
              value={form.matcher}
              onChange={(e) => setForm((f) => ({ ...f, matcher: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('hooks.typeLabel')}</label>
            <select
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
            >
              {HOOK_TYPES.map((ht) => (
                <option key={ht} value={ht}>{ht}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('hooks.commandLabel')}</label>
            <input
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.commandValue}
              onChange={(e) => setForm((f) => ({ ...f, commandValue: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('hooks.timeoutLabel')}</label>
            <input
              type="number"
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.timeout}
              onChange={(e) => setForm((f) => ({ ...f, timeout: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('rules.scope')}</label>
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

function EditHookDialog({
  hook,
  agent,
  scope,
  projectPath,
  onClose,
  onUpdated,
  t,
}: {
  hook: Hook;
  agent: string;
  scope: 'global' | 'project';
  projectPath?: string;
  onClose: () => void;
  onUpdated: () => void;
  t: (k: string) => string;
}) {
  const addToast = useToast((s) => s.addToast);
  const [form, setForm] = useState({
    type: hook.type,
    commandValue: hook.command ?? '',
    timeout: hook.timeout !== undefined ? String(hook.timeout) : '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updatedHook: Record<string, unknown> = {
        type: form.type,
        command: form.commandValue,
      };
      if (form.timeout) {
        updatedHook.timeout = parseInt(form.timeout, 10);
      }
      const body: Record<string, unknown> = {
        event: hook.event,
        matcher: hook.matcher ?? '',
        hookIndex: hook.index ?? 0,
        hook: updatedHook,
        scope,
      };
      if (scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/hooks?agent=${agent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('hooks.updated'), 'success');
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
        <h3 className="text-text-primary font-semibold mb-4">{t('hooks.editHook')}</h3>
        <div className="mb-3 p-2 bg-bg-tertiary rounded-lg text-xs text-text-muted space-y-1">
          <div><span className="text-text-secondary">{t('hooks.eventLabel')}:</span> {hook.event}</div>
          <div><span className="text-text-secondary">{t('hooks.matcherLabel')}:</span> {hook.matcher}</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('hooks.typeLabel')}</label>
            <select
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Hook['type'] }))}
            >
              {HOOK_TYPES.map((ht) => (
                <option key={ht} value={ht}>{ht}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('hooks.commandLabel')}</label>
            <input
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.commandValue}
              onChange={(e) => setForm((f) => ({ ...f, commandValue: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('hooks.timeoutLabel')}</label>
            <input
              type="number"
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.timeout}
              onChange={(e) => setForm((f) => ({ ...f, timeout: e.target.value }))}
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

function HookCard({
  hook,
  agent,
  scope,
  projectPath,
  onChanged,
}: {
  hook: Hook;
  agent: string;
  scope: 'global' | 'project';
  projectPath?: string;
  onChanged: () => void;
}) {
  const { t, tf } = useI18n();
  const addToast = useToast((s) => s.addToast);
  const [showEdit, setShowEdit] = useState(false);
  const colorClass = TYPE_COLORS[hook.type] ?? 'text-text-muted bg-bg-tertiary';

  async function handleDelete() {
    if (!window.confirm(`${t('common.delete')}?`)) return;
    try {
      const body: Record<string, unknown> = {
        event: hook.event,
        matcher: hook.matcher ?? '',
        hookIndex: hook.index ?? 0,
        scope,
      };
      if (scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/hooks?agent=${agent}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('hooks.deleted'), 'success');
      onChanged();
    } catch (err) {
      addToast(String(err), 'error');
    }
  }

  return (
    <>
      <div className="bg-bg-secondary rounded-lg border border-border p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {hook.matcher && (
            <span className="text-sm font-mono text-text-primary truncate flex-1">
              {hook.matcher}
            </span>
          )}
          {hook.scope && <ScopeBadge scope={hook.scope} />}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${colorClass}`}>
            {hook.type}
          </span>
        </div>
        {hook.command && (
          <p className="text-xs font-mono text-text-muted truncate">
            <span className="text-text-muted mr-1">$</span>
            {hook.command.length > 80 ? hook.command.slice(0, 80) + '...' : hook.command}
          </p>
        )}
        <div className="flex items-center justify-between">
          {hook.timeout !== undefined ? (
            <span className="text-xs text-text-muted">{tf('hooks.timeout', { ms: hook.timeout })}</span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <button
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
              onClick={() => setShowEdit(true)}
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
      </div>
      {showEdit && (
        <EditHookDialog
          hook={hook}
          agent={agent}
          scope={scope}
          projectPath={projectPath}
          onClose={() => setShowEdit(false)}
          onUpdated={onChanged}
          t={t}
        />
      )}
    </>
  );
}

function EventGroup({
  event,
  hooks,
  agent,
  scope,
  projectPath,
  onChanged,
}: {
  event: string;
  hooks: Hook[];
  agent: string;
  scope: 'global' | 'project';
  projectPath?: string;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const label = event || t('hooks.unknownEvent');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-text-primary">{label}</span>
        <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">
          {hooks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {hooks.map((hook, i) => (
          <HookCard
            key={`${hook.event}-${hook.matcher}-${i}`}
            hook={hook}
            agent={agent}
            scope={scope}
            projectPath={projectPath}
            onChanged={onChanged}
          />
        ))}
      </div>
    </div>
  );
}

function HooksSection({
  apiUrl,
  agent,
  scope,
  projectPath,
  t,
  showToggle,
  onChanged,
}: {
  apiUrl: string;
  agent: string;
  scope: 'global' | 'project';
  projectPath?: string;
  t: (k: string) => string;
  showToggle?: boolean;
  onChanged: () => void;
}) {
  const { data, loading, error, reload } = useFetch<HooksResponse>(apiUrl);
  const addToast = useToast((s) => s.addToast);
  const [toggling, setToggling] = useState(false);

  const handleChanged = () => {
    reload();
    onChanged();
  };

  const disableAllHooks = data?.disableAllHooks ?? false;

  async function handleToggleAll() {
    setToggling(true);
    try {
      const body: Record<string, unknown> = {
        disabled: !disableAllHooks,
        scope,
      };
      if (scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/hooks/toggle?agent=${agent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('hooks.toggled'), 'success');
      reload();
    } catch {
      addToast(t('common.error'), 'error');
    } finally {
      setToggling(false);
    }
  }

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

  if (data?.unsupported) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6 flex items-center gap-3">
        <svg className="w-5 h-5 text-accent-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        </svg>
        <p className="text-text-secondary text-sm">{t('common.unsupported')}</p>
      </div>
    );
  }

  const hooks = data?.hooks ?? [];

  const grouped = hooks.reduce<Record<string, Hook[]>>((acc, hook) => {
    const key = hook.event || t('hooks.unknownEvent');
    if (!acc[key]) acc[key] = [];
    acc[key].push(hook);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      {showToggle && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleAll}
            disabled={toggling}
            className="text-sm text-text-primary bg-bg-tertiary hover:bg-bg-hover transition-colors px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
          >
            {toggling ? '...' : disableAllHooks ? t('hooks.enableAll') : t('hooks.disableAll')}
          </button>
        </div>
      )}

      {disableAllHooks && (
        <div className="bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-yellow shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-sm text-accent-yellow">{t('hooks.disabledWarning')}</span>
        </div>
      )}

      {hooks.length === 0 ? (
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <p className="text-text-muted text-sm">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([event, eventHooks]) => (
            <EventGroup
              key={event}
              event={event}
              hooks={eventHooks}
              agent={agent}
              scope={scope}
              projectPath={projectPath}
              onChanged={handleChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HooksPanel() {
  const { t } = useI18n();
  const { currentAgent } = useAgentStore();
  const { projectPath, projects } = useScope();
  const projectOnly = useUiStore((s) => s.projectOnly);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const globalApiUrl = `/api/hooks?agent=${currentAgent}&_r=${refreshKey}`;
  const projectApiUrl = projectPath
    ? `/api/hooks?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}&_r=${refreshKey}`
    : null;

  const handleChanged = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-text-primary">{t('hooks.title')}</h2>
        <button
          className="px-4 py-1.5 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity"
          onClick={() => setShowCreate(true)}
        >
          + {t('hooks.createNew')}
        </button>
      </div>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ScopeBadge scope="global" />
          </div>
          <HooksSection
            apiUrl={globalApiUrl}
            agent={currentAgent}
            scope="global"
            t={t}
            showToggle={true}
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
          <HooksSection
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
        <CreateHookDialog
          agent={currentAgent}
          onClose={() => setShowCreate(false)}
          onCreated={handleChanged}
          t={t}
        />
      )}
    </div>
  );
}
