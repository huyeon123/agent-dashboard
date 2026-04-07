import { useEffect } from 'react';
import { useFetch } from '../../hooks/use-fetch';
import { useAgentStore } from '../../store/agent-store';
import { useToast } from '../../hooks/use-toast';

interface Plugin {
  name: string;
  version: string;
  scope: string;
  enabled: boolean;
  path: string;
}

export function PluginsPanel() {
  const { currentAgent } = useAgentStore();
  const { data: plugins, loading, error, reload } = useFetch<Plugin[]>(
    currentAgent ? `/api/plugins?agent=${currentAgent}` : null
  );
  const { toasts, addToast, removeToast } = useToast();

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
      addToast('폴더를 열었습니다', 'success');
    } catch {
      addToast('폴더를 열 수 없습니다', 'error');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg cursor-pointer ${
              toast.type === 'success'
                ? 'bg-accent-green text-bg-primary'
                : toast.type === 'error'
                ? 'bg-accent-red text-bg-primary'
                : 'bg-accent-blue text-bg-primary'
            }`}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">Plugins</h2>
        <button
          onClick={reload}
          className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          새로고침
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

      {/* Empty state */}
      {!loading && !error && plugins && plugins.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="text-4xl">🔌</div>
          <p className="text-text-muted text-sm">이 에이전트에 설치된 플러그인이 없습니다</p>
        </div>
      )}

      {/* Plugin list */}
      {!loading && !error && plugins && plugins.length > 0 && (
        <div className="flex flex-col gap-3">
          {plugins.map((plugin) => (
            <div
              key={plugin.name}
              className="rounded-xl bg-bg-secondary border border-border p-4 flex items-center gap-4 hover:border-border-hover transition-colors"
            >
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
                {/* Enabled indicator */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      plugin.enabled ? 'bg-accent-green' : 'bg-text-muted'
                    }`}
                  />
                  <span className={`text-xs ${plugin.enabled ? 'text-accent-green' : 'text-text-muted'}`}>
                    {plugin.enabled ? '활성' : '비활성'}
                  </span>
                </div>

                {/* Open folder button */}
                <button
                  onClick={() => handleOpenFolder(plugin.path)}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                  title="폴더 열기"
                >
                  열기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
