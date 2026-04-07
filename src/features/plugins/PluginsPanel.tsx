import { useState, useEffect } from 'react';
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

function PluginCard({
  plugin,
  onOpenFolder,
  onToggle,
  toggling,
}: {
  plugin: Plugin;
  onOpenFolder: (path: string) => void;
  onToggle: (plugin: Plugin) => void;
  toggling: boolean;
}) {
  const { t } = useI18n();
  const scopeKey = ['global', 'project', 'local'].includes(plugin.scope) ? `common.${plugin.scope}` : null;
  return (
    <div className="rounded-xl bg-bg-secondary border border-border p-4 flex items-center gap-4 hover:border-border-hover transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-text-primary truncate">{plugin.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue text-xs font-mono shrink-0">
            v{plugin.version}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted text-xs shrink-0">
            {scopeKey ? t(scopeKey) : plugin.scope}
          </span>
        </div>
        <p className="text-text-muted text-xs mt-1 truncate">{plugin.path}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onToggle(plugin)}
          disabled={toggling}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
            plugin.enabled
              ? 'bg-accent-green/20 text-accent-green border-accent-green/30 hover:opacity-80'
              : 'bg-bg-tertiary text-text-muted border-border hover:border-border-hover'
          }`}
        >
          {toggling ? '...' : plugin.enabled ? t('common.enabled') : t('common.disabled')}
        </button>

        <button
          onClick={() => onOpenFolder(plugin.path)}
          className="px-2.5 py-1.5 text-xs rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          {t('common.open')}
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
  const [togglingName, setTogglingName] = useState<string | null>(null);
  const [localPlugins, setLocalPlugins] = useState<Plugin[] | null>(null);

  useEffect(() => {
    reload();
  }, [currentAgent, reload]);

  // Sync local state with fetched data
  useEffect(() => {
    if (plugins) {
      setLocalPlugins(plugins);
    }
  }, [plugins]);

  const handleOpenFolder = async (path: string) => {
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      addToast(t('common.open'), 'success');
    } catch {
      addToast(t('common.error'), 'error');
    }
  };

  const handleToggle = async (plugin: Plugin) => {
    setTogglingName(plugin.name);
    const newEnabled = !plugin.enabled;

    // Optimistic update
    setLocalPlugins((prev) =>
      (prev ?? []).map((p) =>
        p.name === plugin.name ? { ...p, enabled: newEnabled } : p
      )
    );

    try {
      const res = await fetch(`/api/plugins/toggle?agent=${currentAgent}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: plugin.name, enabled: newEnabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('plugins.toggled'), 'success');
    } catch (err) {
      // Revert optimistic update
      setLocalPlugins((prev) =>
        (prev ?? []).map((p) =>
          p.name === plugin.name ? { ...p, enabled: plugin.enabled } : p
        )
      );
      addToast(String(err), 'error');
    } finally {
      setTogglingName(null);
    }
  };

  const allPlugins = localPlugins ?? plugins ?? [];
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
                    <PluginCard
                      key={plugin.name}
                      plugin={plugin}
                      onOpenFolder={handleOpenFolder}
                      onToggle={handleToggle}
                      toggling={togglingName === plugin.name}
                    />
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
                  <PluginCard
                    key={plugin.name}
                    plugin={plugin}
                    onOpenFolder={handleOpenFolder}
                    onToggle={handleToggle}
                    toggling={togglingName === plugin.name}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
