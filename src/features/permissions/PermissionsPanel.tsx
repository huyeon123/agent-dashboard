import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';

interface HooksResponse {
  hooks: unknown[];
  permissions: { allow: string[]; deny: string[] };
  disableAllHooks: boolean;
  unsupported?: boolean;
}

export function PermissionsPanel() {
  const { t } = useI18n();
  const { currentAgent } = useAgentStore();
  const { scope, projectPath, projects } = useScope();

  const apiUrl = scope === 'project' && projectPath
    ? `/api/hooks?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}`
    : `/api/hooks?agent=${currentAgent}`;

  const { data, loading, error, reload } = useFetch<HooksResponse>(apiUrl);

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
          <svg className="w-5 h-5 text-accent-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
          </svg>
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
        <svg className="w-5 h-5 text-accent-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        </svg>
        <p className="text-text-secondary text-sm">{t('common.unsupported')}</p>
      </div>
    );
  }

  const permissions = data?.permissions ?? { allow: [], deny: [] };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-text-primary">{t('hooks.permissions')}</h2>
        <button
          onClick={reload}
          className="text-sm text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-border-hover"
        >
          {t('common.retry')}
        </button>
      </div>

      {scope === 'project' && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-text-muted text-sm">{t('common.registerProjects')}</p>
        </div>
      )}

      {(scope === 'global' || projectPath) && (
        <>
          {permissions.allow.length === 0 && permissions.deny.length === 0 ? (
            <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
              <p className="text-text-muted text-sm">{t('common.noData')}</p>
            </div>
          ) : (
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
          )}
        </>
      )}
    </div>
  );
}
