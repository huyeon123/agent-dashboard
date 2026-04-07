import { useState } from 'react';
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';

interface Hook {
  event: string;
  matcher?: string;
  type: 'command' | 'http' | 'prompt' | 'agent';
  command?: string;
  timeout?: number;
  index?: number;
}

interface HooksResponse {
  hooks: Hook[];
  disableAllHooks: boolean;
  unsupported?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  command: 'text-accent-blue bg-accent-blue/10',
  http: 'text-accent-green bg-accent-green/10',
  prompt: 'text-accent-yellow bg-accent-yellow/10',
  agent: 'text-accent-purple bg-accent-purple/10',
};

function HookCard({ hook }: { hook: Hook }) {
  const colorClass = TYPE_COLORS[hook.type] ?? 'text-text-muted bg-bg-tertiary';
  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {hook.matcher && (
          <span className="text-sm font-mono text-text-primary truncate flex-1">
            {hook.matcher}
          </span>
        )}
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
      {hook.timeout !== undefined && (
        <span className="text-xs text-text-muted">{hook.timeout}ms timeout</span>
      )}
    </div>
  );
}

function EventGroup({ event, hooks }: { event: string; hooks: Hook[] }) {
  const label = event || 'Unknown';
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
          <HookCard key={`${hook.event}-${i}`} hook={hook} />
        ))}
      </div>
    </div>
  );
}

export function HooksPanel() {
  const { t } = useI18n();
  const { currentAgent } = useAgentStore();
  const addToast = useToast((s) => s.addToast);
  const [toggling, setToggling] = useState(false);
  const { scope, projectPath, projects } = useScope();

  const apiUrl = scope === 'project' && projectPath
    ? `/api/hooks?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}`
    : `/api/hooks?agent=${currentAgent}`;

  const { data, loading, error, reload } = useFetch<HooksResponse>(apiUrl);

  async function handleToggleAll() {
    setToggling(true);
    try {
      const res = await fetch(`/api/hooks/toggle?agent=${currentAgent}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('hooks.toggleAll'), 'success');
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
  const disableAllHooks = data?.disableAllHooks ?? false;

  // Group by event
  const grouped = hooks.reduce<Record<string, Hook[]>>((acc, hook) => {
    const key = hook.event || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(hook);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-text-primary">{t('hooks.title')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="text-sm text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-border-hover"
          >
            {t('common.retry')}
          </button>
          <button
            onClick={handleToggleAll}
            disabled={toggling || scope === 'project'}
            className="text-sm text-text-primary bg-bg-tertiary hover:bg-bg-hover transition-colors px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
          >
            {toggling ? '...' : t('hooks.toggleAll')}
          </button>
        </div>
      </div>

      {scope === 'project' && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-text-muted text-sm">{t('common.registerProjects')}</p>
        </div>
      )}

      {(scope === 'global' || projectPath) && (
        <>
          {disableAllHooks && (
            <div className="bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl p-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-yellow shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="text-sm text-accent-yellow">All hooks are currently disabled</span>
            </div>
          )}

          {hooks.length === 0 ? (
            <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
              <p className="text-text-muted text-sm">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(grouped).map(([event, eventHooks]) => (
                <EventGroup key={event} event={event} hooks={eventHooks} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
