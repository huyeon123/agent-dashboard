import { useEffect } from 'react';
import { useFetch } from '../../hooks/use-fetch';
import { useAgentStore } from '../../store/agent-store';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../store/ui-store';

interface Plugin {
  name: string;
  version: string;
  scope: string;
  enabled: boolean;
  path: string;
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

function PluginCard({ plugin, onOpenFolder }: { plugin: Plugin; onOpenFolder: (path: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl bg-bg-secondary border border-border p-4 flex items-center gap-4 hover:border-border-hover transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-text-primary truncate">{plugin.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue text-xs font-mono shrink-0">
            v{plugin.version}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted text-xs shrink-0">
            {plugin.scope}
          </span>
        </div>
        <p className="text-text-muted text-xs mt-1 truncate">{plugin.path}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              plugin.enabled ? 'bg-accent-green' : 'bg-text-muted'
            }`}
          />
          <span className={`text-xs ${plugin.enabled ? 'text-accent-green' : 'text-text-muted'}`}>
            {plugin.enabled ? t('common.enabled') : t('common.disabled')}
          </span>
        </div>

        <button
          onClick={() => onOpenFolder(plugin.path)}
          className="px-2.5 py-1.5 text-xs rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          Open
        </button>
      </div>
    </div>
  );
}

export function PluginsPanel() {
  const { t } = useI18n();
  const { currentAgent } = useAgentStore();
  const projectOnly = useUiStore((s) => s.projectOnly);
  const { data: plugins, loading, error, reload } = useFetch<Plugin[]>(
    currentAgent ? `/api/plugins?agent=${currentAgent}` : null
  );
  const { addToast } = useToast();

  useEffect(() => {
    reload();
  }, [currentAgent, reload]);

  const handleOpenFolder = async (path: string) => {
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      addToast('Folder opened', 'success');
    } catch {
      addToast('Cannot open folder', 'error');
    }
  };

  const allPlugins = plugins ?? [];
  const globalPlugins = allPlugins.filter((p) => p.scope !== 'project');
  const projectPlugins = allPlugins.filter((p) => p.scope === 'project');

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">{t('tabs.plugins')}</h2>
        <button
          onClick={reload}
          className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg bg-bg-secondary border border-accent-red/30 p-4 text-accent-red text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="flex flex-col gap-6">
          {/* Global section */}
          {!projectOnly && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <ScopeBadge scope="global" />
              </div>
              {globalPlugins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <p className="text-text-muted text-sm">{t('common.noData')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {globalPlugins.map((plugin) => (
                    <PluginCard key={plugin.name} plugin={plugin} onOpenFolder={handleOpenFolder} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Project section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ScopeBadge scope="project" />
            </div>
            {projectPlugins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <p className="text-text-muted text-sm">{t('common.noData')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {projectPlugins.map((plugin) => (
                  <PluginCard key={plugin.name} plugin={plugin} onOpenFolder={handleOpenFolder} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
