import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';
import { useUiStore } from '../../store/ui-store';

interface HooksResponse {
  hooks: unknown[];
  permissions: { allow: string[]; deny: string[] };
  disableAllHooks: boolean;
  unsupported?: boolean;
}

function ScopeBadge({ scope }: { scope: 'global' | 'project' | 'local' }) {
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

function PermissionsContent({
  apiUrl,
  t,
}: {
  apiUrl: string;
  t: (k: string) => string;
}) {
  const { data, loading, error } = useFetch<HooksResponse>(apiUrl);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted">
        <div className="w-4 h-4 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (error) {
    if (error.includes('404') || error.includes('501')) {
      return (
        <div className="bg-bg-secondary rounded-xl border border-border p-6 flex items-center gap-3">
          <p className="text-text-secondary text-sm">{t('common.unsupported')}</p>
        </div>
      );
    }
    return (
      <div className="bg-bg-secondary rounded-xl border border-accent-red/30 p-4 text-accent-red text-sm">
        {t('common.error')}: {error}
      </div>
    );
  }

  if (data?.unsupported) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6 flex items-center gap-3">
        <p className="text-text-secondary text-sm">{t('common.unsupported')}</p>
      </div>
    );
  }

  const permissions = data?.permissions ?? { allow: [], deny: [] };

  if (permissions.allow.length === 0 && permissions.deny.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
        <p className="text-text-muted text-sm">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-bg-secondary rounded-xl border border-border p-3 flex flex-col gap-2">
        <span className="text-xs font-semibold text-accent-green uppercase tracking-wide">
          {t('hooks.allow')}
        </span>
        {permissions.allow.length === 0 ? (
          <span className="text-xs text-text-muted">None</span>
        ) : (
          permissions.allow.map((item) => (
            <span key={item} className="text-xs font-mono text-text-secondary bg-accent-green/10 px-2 py-1 rounded">
              {item}
            </span>
          ))
        )}
      </div>
      <div className="bg-bg-secondary rounded-xl border border-border p-3 flex flex-col gap-2">
        <span className="text-xs font-semibold text-accent-red uppercase tracking-wide">
          {t('hooks.deny')}
        </span>
        {permissions.deny.length === 0 ? (
          <span className="text-xs text-text-muted">None</span>
        ) : (
          permissions.deny.map((item) => (
            <span key={item} className="text-xs font-mono text-text-secondary bg-accent-red/10 px-2 py-1 rounded">
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function PermissionsPanel() {
  const { t } = useI18n();
  const { currentAgent } = useAgentStore();
  const { projectPath, projects } = useScope();
  const projectOnly = useUiStore((s) => s.projectOnly);

  const globalApiUrl = `/api/hooks?agent=${currentAgent}`;
  const projectApiUrl = projectPath
    ? `/api/hooks?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-text-primary">{t('hooks.permissions')}</h2>
      </div>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ScopeBadge scope="global" />
          </div>
          <PermissionsContent apiUrl={globalApiUrl} t={t} />
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
          <PermissionsContent apiUrl={projectApiUrl} t={t} />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <p className="text-text-muted text-sm">{t('common.noData')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
