import { useAgentStore } from '../../store/agent-store';
import { useUiStore } from '../../store/ui-store';
import { useFetch } from '../../hooks/use-fetch';
import { useI18n } from '../../i18n';
import type { InstructionsData } from '../../types/instructions';
import type { Skill } from '../../types/skills';
import type { HooksData } from '../../types/hooks';
import type { AgentDefinition } from '../../types/agents-def';
import type { Plugin } from '../../types/plugins';
import type { InstructionFilesCheckResult, RulesCountResult } from '../../types/overview';

interface ConnectorsData {
  mcpServers: Record<string, unknown>;
}

function StatCard({
  label,
  globalValue,
  projectValue,
  color,
}: {
  label: string;
  globalValue: number | string;
  projectValue?: number | string | null;
  color: string;
}) {
  const { t } = useI18n();
  const hasProject = projectValue !== null && projectValue !== undefined;

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4 hover:border-border-hover transition-colors">
      <div className="text-text-secondary text-sm mb-1">{label}</div>
      {hasProject ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold ${color}`}>{globalValue}</span>
            <span className="text-text-muted text-base">/</span>
            <span className="text-xl font-semibold text-text-secondary">{projectValue}</span>
          </div>
          <div className="flex gap-1.5 text-xs text-text-muted mt-0.5">
            <span>{t('common.global')}</span>
            <span>/</span>
            <span>{t('common.project')}</span>
          </div>
        </>
      ) : (
        <div className={`text-2xl font-bold ${color}`}>{globalValue}</div>
      )}
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

function InstructionFilesCard({
  label,
  globalFiles,
  projectFiles,
}: {
  label: string;
  globalFiles: InstructionFilesCheckResult['files'] | null;
  projectFiles: InstructionFilesCheckResult['files'] | null;
}) {
  const { t } = useI18n();
  const hasProject = projectFiles !== null;

  return (
    <div className="col-span-full bg-bg-secondary rounded-xl border border-border p-4 hover:border-border-hover transition-colors">
      <div className="text-text-secondary text-sm mb-3">{label}</div>
      <div className="space-y-2">
        <div>
          <span className="text-xs text-text-muted mb-1.5 block">{t('common.global')}</span>
          <div className="flex flex-wrap gap-2">
            {globalFiles && globalFiles.length > 0 ? (
              globalFiles.map((f) => (
                <span
                  key={f.path}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-mono ${
                    f.exists
                      ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                      : 'bg-bg-tertiary text-text-muted border-border'
                  }`}
                >
                  {f.name}
                  <span className="font-sans">{f.exists ? '✓' : '✗'}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-text-muted">-</span>
            )}
          </div>
        </div>
        {hasProject && (
          <div>
            <span className="text-xs text-text-muted mb-1.5 block">{t('common.project')}</span>
            <div className="flex flex-wrap gap-2">
              {projectFiles && projectFiles.length > 0 ? (
                projectFiles.map((f) => (
                  <span
                    key={f.path}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-mono ${
                      f.exists
                        ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                        : 'bg-bg-tertiary text-text-muted border-border'
                    }`}
                  >
                    {f.name}
                    <span className="font-sans">{f.exists ? '✓' : '✗'}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-text-muted">-</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function OverviewPanel() {
  const { t } = useI18n();
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const projectPath = useUiStore((s) => s.projectPath);

  const encodedPath = projectPath ? encodeURIComponent(projectPath) : null;

  // --- Global fetches ---
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

  // --- Project fetches (only when projectPath is set) ---
  const { loading: loadingProjInstr } = useFetch<InstructionsData>(
    encodedPath ? `/api/instructions/project?agent=${currentAgent}&path=${encodedPath}` : null
  );
  const { data: projSkills, loading: loadingProjSkills } = useFetch<Skill[]>(
    encodedPath ? `/api/skills?agent=${currentAgent}&scope=project&path=${encodedPath}` : null
  );
  const { data: projHooksData, loading: loadingProjHooks } = useFetch<HooksData>(
    encodedPath ? `/api/hooks?agent=${currentAgent}&scope=project&path=${encodedPath}` : null
  );
  const { data: projAgentDefs, loading: loadingProjAgents } = useFetch<AgentDefinition[]>(
    encodedPath ? `/api/agent-defs?agent=${currentAgent}&scope=project&path=${encodedPath}` : null
  );
  const { data: projConnectors, loading: loadingProjConnectors } = useFetch<ConnectorsData>(
    encodedPath ? `/api/connectors?agent=${currentAgent}&scope=project&path=${encodedPath}` : null
  );

  // --- Overview-specific fetches ---
  const { data: instrFiles, loading: loadingInstrFiles } = useFetch<InstructionFilesCheckResult>(
    `/api/overview/instruction-files?agent=${currentAgent}`
  );
  const { data: projInstrFiles, loading: loadingProjInstrFiles } = useFetch<InstructionFilesCheckResult>(
    encodedPath ? `/api/overview/instruction-files?agent=${currentAgent}&scope=project&path=${encodedPath}` : null
  );
  const { data: rulesData, loading: loadingRules } = useFetch<RulesCountResult>(
    `/api/overview/rules?agent=${currentAgent}`
  );
  const { data: projRulesData, loading: loadingProjRules } = useFetch<RulesCountResult>(
    encodedPath ? `/api/overview/rules?agent=${currentAgent}&scope=project&path=${encodedPath}` : null
  );

  const isLoading =
    loadingInstr || loadingInstrFiles || loadingRules ||
    loadingSkills || loadingHooks || loadingAgents || loadingConnectors || loadingPlugins ||
    loadingProjInstr || loadingProjInstrFiles || loadingProjRules ||
    loadingProjSkills || loadingProjHooks || loadingProjAgents || loadingProjConnectors;

  // --- Global counts ---
  const rulesCount = rulesData?.count ?? 0;
  const skillsCount = skills?.length ?? 0;
  const hooksCount = hooksData?.hooks?.length ?? 0;
  const agentsCount = agentDefs?.length ?? 0;
  const pluginsCount = plugins?.filter((p) => p.scope !== 'project').length ?? 0;
  const connectorsCount = connectors?.mcpServers ? Object.keys(connectors.mcpServers).length : 0;

  // --- Project counts (null when no project selected) ---
  const projRulesCount = encodedPath ? (projRulesData?.count ?? 0) : null;
  const projSkillsCount = encodedPath ? (projSkills?.length ?? 0) : null;
  const projHooksCount = encodedPath ? (projHooksData?.hooks?.length ?? 0) : null;
  const projAgentsCount = encodedPath ? (projAgentDefs?.length ?? 0) : null;
  const projConnectorsCount = encodedPath
    ? (projConnectors?.mcpServers ? Object.keys(projConnectors.mcpServers).length : 0)
    : null;
  const projPluginsCount = encodedPath ? (plugins?.filter((p) => p.scope === 'project').length ?? 0) : null;

  const stats = [
    { label: t('overview.rules'), globalValue: rulesCount, projectValue: projRulesCount, color: 'text-accent-blue' },
    { label: t('overview.skills'), globalValue: skillsCount, projectValue: projSkillsCount, color: 'text-accent-green' },
    { label: t('overview.hooks'), globalValue: hooksCount, projectValue: projHooksCount, color: 'text-accent-red' },
    { label: t('overview.agents'), globalValue: agentsCount, projectValue: projAgentsCount, color: 'text-accent-purple' },
    { label: t('overview.plugins'), globalValue: pluginsCount, projectValue: projPluginsCount, color: 'text-accent-blue' },
    { label: t('overview.connectors'), globalValue: connectorsCount, projectValue: projConnectorsCount, color: 'text-accent-green' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">{t('overview.title')}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <div className="col-span-full bg-bg-secondary rounded-xl border border-border p-4 animate-pulse h-20" />
          </>
        ) : (
          <>
            {stats.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                globalValue={s.globalValue}
                projectValue={s.projectValue}
                color={s.color}
              />
            ))}
            <InstructionFilesCard
              label={t('overview.instructions')}
              globalFiles={instrFiles?.files ?? null}
              projectFiles={encodedPath ? (projInstrFiles?.files ?? []) : null}
            />
          </>
        )}
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
