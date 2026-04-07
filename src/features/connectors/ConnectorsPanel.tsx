import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';

interface McpServer {
  name: string;
  command: string;
  args?: string[];
}

interface ConnectorsResponse {
  mcpServers: McpServer[];
}

function ServerCard({ server }: { server: McpServer }) {
  const args = server.args ?? [];
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-text-primary truncate">{server.name}</span>
        {args.length > 0 && (
          <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full shrink-0">
            {args.length} arg{args.length !== 1 ? 's' : ''}
          </span>
        )}
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
    </div>
  );
}

export function ConnectorsPanel() {
  const { t } = useI18n();
  const { currentAgent } = useAgentStore();
  const { scope, projectPath, projects } = useScope();

  const apiUrl = scope === 'project' && projectPath
    ? `/api/connectors?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}`
    : `/api/connectors?agent=${currentAgent}`;

  const { data, loading, error, reload } = useFetch<ConnectorsResponse>(apiUrl);

  const servers = data?.mcpServers ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">{t('tabs.connectors')}</h2>
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
          {loading && (
            <div className="flex items-center gap-2 text-text-muted">
              <div className="w-4 h-4 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-bg-secondary rounded-xl border border-accent-red/30 p-4 text-accent-red text-sm">
              {t('common.error')}: {error}
            </div>
          )}

          {!loading && !error && servers.length === 0 && (
            <div className="bg-bg-secondary rounded-xl border border-border p-8 flex flex-col items-center gap-2 text-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <p className="text-text-muted text-sm">{t('common.noData')}</p>
            </div>
          )}

          {!loading && !error && servers.length > 0 && (
            <>
              <p className="text-sm text-text-muted">
                {servers.length} MCP server{servers.length !== 1 ? 's' : ''} configured
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {servers.map((server) => (
                  <ServerCard key={server.name} server={server} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
