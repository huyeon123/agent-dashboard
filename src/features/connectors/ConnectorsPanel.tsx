import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';
import { useUiStore } from '../../store/ui-store';

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

function ConnectorsSection({
  apiUrl,
  t,
}: {
  apiUrl: string;
  t: (k: string) => string;
}) {
  const { data, loading, error } = useFetch<ConnectorsResponse>(apiUrl);
  const servers = data?.mcpServers ?? [];

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
        {servers.length} MCP server{servers.length !== 1 ? 's' : ''} configured
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {servers.map((server) => (
          <ServerCard key={server.name} server={server} />
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

  const globalApiUrl = `/api/connectors?agent=${currentAgent}`;
  const projectApiUrl = projectPath
    ? `/api/connectors?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">{t('tabs.connectors')}</h2>
      </div>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ScopeBadge scope="global" />
          </div>
          <ConnectorsSection apiUrl={globalApiUrl} t={t} />
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
          <ConnectorsSection apiUrl={projectApiUrl} t={t} />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <p className="text-text-muted text-sm">{t('common.noData')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
