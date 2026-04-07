import { useFetch } from '../../hooks/use-fetch';
import type { AgentConfig } from '../../types/agent';
import { getAgentSupports } from '../../types/agent';

interface FeatureRow {
  key: keyof ReturnType<typeof getAgentSupports>;
  label: string;
  description: string;
}

const FEATURES: FeatureRow[] = [
  { key: 'settings', label: 'Settings', description: '설정 파일 지원' },
  { key: 'skills', label: 'Skills', description: '스킬/커스텀 명령 지원' },
  { key: 'commands', label: 'Commands', description: '슬래시 명령 지원' },
  { key: 'hooks', label: 'Hooks', description: '이벤트 훅 시스템' },
  { key: 'agentDefs', label: 'Agent Defs', description: '에이전트 정의 파일' },
  { key: 'mcpServers', label: 'MCP', description: 'MCP 서버 연동' },
  { key: 'plugins', label: 'Plugins', description: '플러그인 시스템' },
];

function Check({ supported }: { supported: boolean }) {
  if (supported) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-green/15 text-accent-green text-sm font-bold">
        ✓
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-tertiary text-text-muted text-sm">
      —
    </span>
  );
}

const AGENT_ICON_COLORS: Record<string, string> = {
  claude: 'text-accent-purple',
  codex: 'text-accent-green',
  copilot: 'text-accent-blue',
  opencode: 'text-accent-yellow',
};

export function CapabilitiesPanel() {
  const { data: agents, loading, error, reload } = useFetch<AgentConfig[]>('/api/agent-types');

  const enabledAgents = agents?.filter((a) => a.enabled) ?? [];

  // Compute summary stats
  const totalFeatures = FEATURES.length;
  const supportCounts = enabledAgents.map((agent) => {
    const supports = getAgentSupports(agent.paths);
    const count = FEATURES.filter((f) => supports[f.key]).length;
    return { agent, count };
  });

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-semibold text-text-primary">Capabilities</h2>
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

      {!loading && !error && agents && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 shrink-0 sm:grid-cols-4">
            {supportCounts.map(({ agent, count }) => (
              <div
                key={agent.type}
                className="rounded-xl bg-bg-secondary border border-border p-3 flex flex-col gap-1"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{agent.icon}</span>
                  <span
                    className={`text-sm font-medium ${AGENT_ICON_COLORS[agent.type] ?? 'text-text-primary'}`}
                  >
                    {agent.displayName}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-text-primary">{count}</span>
                  <span className="text-xs text-text-muted">/ {totalFeatures} 기능</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-1.5 mt-1">
                  <div
                    className="h-1.5 rounded-full bg-accent-purple transition-all"
                    style={{ width: `${(count / totalFeatures) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Capabilities matrix */}
          <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden flex-1">
            <div className="overflow-auto h-full">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-bg-tertiary border-b border-border z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium min-w-36">기능</th>
                    {enabledAgents.map((agent) => (
                      <th
                        key={agent.type}
                        className="text-center px-4 py-3 text-xs font-medium min-w-24"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-base">{agent.icon}</span>
                          <span className={AGENT_ICON_COLORS[agent.type] ?? 'text-text-primary'}>
                            {agent.displayName}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((feature, i) => (
                    <tr
                      key={feature.key}
                      className={`border-b border-border last:border-0 hover:bg-bg-tertiary/50 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-bg-primary/20'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">{feature.label}</p>
                        <p className="text-xs text-text-muted">{feature.description}</p>
                      </td>
                      {enabledAgents.map((agent) => {
                        const supports = getAgentSupports(agent.paths);
                        return (
                          <td key={agent.type} className="px-4 py-3 text-center">
                            <Check supported={supports[feature.key]} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disabled agents note */}
          {agents.some((a) => !a.enabled) && (
            <p className="text-xs text-text-muted shrink-0">
              비활성화된 에이전트 {agents.filter((a) => !a.enabled).length}개는 표시에서 제외되었습니다.
            </p>
          )}
        </>
      )}
    </div>
  );
}
