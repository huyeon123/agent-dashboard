import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';
import { useUiStore } from '../../store/ui-store';
import type { RuleFile, RulesResponse } from '../../types/rules';

const MARKDOWN_PROSE_CLASSES = `prose prose-invert prose-sm max-w-none bg-bg-tertiary border border-border rounded-lg px-6 py-5 overflow-y-auto max-h-[calc(100vh-280px)]
  [&_h1]:text-text-primary [&_h1]:text-lg [&_h1]:font-bold [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-2 [&_h1]:mb-4
  [&_h2]:text-text-primary [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
  [&_h3]:text-text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
  [&_h4]:text-text-secondary [&_h4]:text-sm [&_h4]:font-medium
  [&_p]:text-text-secondary [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-3
  [&_ul]:text-text-secondary [&_ul]:text-sm [&_ul]:space-y-1
  [&_ol]:text-text-secondary [&_ol]:text-sm [&_ol]:space-y-1
  [&_li]:text-text-secondary
  [&_a]:text-accent-purple [&_a]:no-underline hover:[&_a]:underline
  [&_code]:text-accent-purple [&_code]:bg-bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
  [&_pre]:bg-bg-secondary [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border
  [&_pre_code]:bg-transparent [&_pre_code]:p-0
  [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse
  [&_th]:text-left [&_th]:text-text-primary [&_th]:bg-bg-secondary [&_th]:px-3 [&_th]:py-2 [&_th]:border [&_th]:border-border [&_th]:text-xs [&_th]:font-medium
  [&_td]:text-text-secondary [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-border [&_td]:text-xs
  [&_blockquote]:border-l-2 [&_blockquote]:border-accent-purple [&_blockquote]:pl-4 [&_blockquote]:text-text-muted [&_blockquote]:italic
  [&_hr]:border-border [&_hr]:my-6
  [&_strong]:text-text-primary [&_strong]:font-semibold`;

function ScopeBadge({ scope }: { scope: 'global' | 'project' }) {
  const colors = {
    global: 'bg-accent-purple/15 text-accent-purple border-accent-purple/20',
    project: 'bg-accent-green/15 text-accent-green border-accent-green/20',
  };
  const labels = { global: 'Global', project: 'Project' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${colors[scope]}`}>
      {labels[scope]}
    </span>
  );
}

function RuleCard({ rule }: { rule: RuleFile }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-tertiary/50 transition-colors"
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-text-primary text-sm">{rule.name}</div>
          <div className="text-text-muted text-xs truncate mt-0.5">{rule.path}</div>
        </div>
        <span className="text-text-muted text-xs flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
          <div className={MARKDOWN_PROSE_CLASSES}>
            <Markdown remarkPlugins={[remarkGfm]}>{rule.raw}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}

function RulesSection({
  apiUrl,
  t,
}: {
  apiUrl: string;
  t: (key: string) => string;
}) {
  const { data, loading, error } = useFetch<RulesResponse>(apiUrl);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-14 bg-bg-tertiary rounded-lg border border-border" />
        ))}
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

  if (data?.unsupported) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <p className="text-text-secondary text-sm">{t('common.unsupported')}</p>
      </div>
    );
  }

  const rules = data?.files ?? [];

  if (rules.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
        <p className="text-text-muted text-sm">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data?.dir && (
        <div className="text-xs text-text-muted font-mono">{data.dir}</div>
      )}
      {rules.map((rule) => (
        <RuleCard key={rule.path} rule={rule} />
      ))}
    </div>
  );
}

export function RulesPanel() {
  const { t } = useI18n();
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const { projectPath, projects } = useScope();
  const projectOnly = useUiStore((s) => s.projectOnly);

  const globalApiUrl = `/api/rules?agent=${currentAgent}`;
  const projectApiUrl = projectPath
    ? `/api/rules?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}`
    : null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">{t('rules.title')}</h2>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ScopeBadge scope="global" />
          </div>
          <RulesSection apiUrl={globalApiUrl} t={t} />
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
          <RulesSection apiUrl={projectApiUrl} t={t} />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <p className="text-text-muted text-sm">{t('common.noData')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
