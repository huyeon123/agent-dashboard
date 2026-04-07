import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useI18n } from '../../i18n';
import type { InstructionsData } from '../../types/instructions';
import type { Skill } from '../../types/skills';
import type { HooksData } from '../../types/hooks';
import type { AgentDefinition } from '../../types/agents-def';
import type { Plugin } from '../../types/plugins';

interface ConnectorsData {
  mcpServers: Record<string, unknown>;
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4 hover:border-border-hover transition-colors">
      <div className="text-text-secondary text-sm mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4 animate-pulse">
      <div className="h-3 bg-bg-tertiary rounded w-2/3 mb-2" />
      <div className="h-7 bg-bg-tertiary rounded w-1/3" />
    </div>
  );
}

export function OverviewPanel() {
  const { t } = useI18n();
  const currentAgent = useAgentStore((s) => s.currentAgent);

  const { data: instructions, loading: loadingInstr } = useFetch<InstructionsData>(
    `/api/instructions?agent=${currentAgent}`
  );
  const { data: skills, loading: loadingSkills } = useFetch<Skill[]>(
    `/api/skills?agent=${currentAgent}`
  );
  const { data: hooksData, loading: loadingHooks } = useFetch<HooksData>(
    `/api/hooks?agent=${currentAgent}`
  );
  const { data: agentDefs, loading: loadingAgents } = useFetch<AgentDefinition[]>(
    `/api/agent-defs?agent=${currentAgent}`
  );
  const { data: connectors, loading: loadingConnectors } = useFetch<ConnectorsData>(
    `/api/connectors?agent=${currentAgent}`
  );
  const { data: plugins, loading: loadingPlugins } = useFetch<Plugin[]>(
    `/api/plugins?agent=${currentAgent}`
  );

  const isLoading =
    loadingInstr || loadingSkills || loadingHooks || loadingAgents || loadingConnectors || loadingPlugins;

  const sectionCount = instructions?.sections?.length ?? 0;
  const rulesCount = instructions?.sections?.reduce((acc, s) => acc + s.content.length, 0) ?? 0;
  const skillsCount = skills?.length ?? 0;
  const hooksCount = hooksData?.hooks?.length ?? 0;
  const agentsCount = agentDefs?.length ?? 0;
  const pluginsCount = plugins?.length ?? 0;
  const connectorsCount = connectors?.mcpServers ? Object.keys(connectors.mcpServers).length : 0;

  const stats = [
    { label: t('overview.instructions'), value: sectionCount, color: 'text-accent-purple' },
    { label: t('overview.rules'), value: rulesCount, color: 'text-accent-blue' },
    { label: t('overview.skills'), value: skillsCount, color: 'text-accent-green' },
    { label: t('overview.hooks'), value: hooksCount, color: 'text-accent-red' },
    { label: t('overview.agents'), value: agentsCount, color: 'text-accent-purple' },
    { label: t('overview.plugins'), value: pluginsCount, color: 'text-accent-blue' },
    { label: t('overview.connectors'), value: connectorsCount, color: 'text-accent-green' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">{t('overview.title')}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
          : stats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />
            ))}
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">{t('overview.preview')}</h3>
        {loadingInstr ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 bg-bg-tertiary rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
          </div>
        ) : instructions?.raw ? (
          <pre className="font-mono text-xs text-text-secondary whitespace-pre-wrap overflow-auto max-h-64 leading-relaxed">
            {instructions.raw}
          </pre>
        ) : (
          <p className="text-text-muted text-sm">{t('instructions.noInstructions')}</p>
        )}
      </div>
    </div>
  );
}
