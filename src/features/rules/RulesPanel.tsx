import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
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
  const { t } = useI18n();
  const colors = {
    global: 'bg-accent-purple/15 text-accent-purple border-accent-purple/20',
    project: 'bg-accent-green/15 text-accent-green border-accent-green/20',
  };
  const labels = { global: t('common.global'), project: t('common.project') };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${colors[scope]}`}>
      {labels[scope]}
    </span>
  );
}

function CreateRuleDialog({
  agent,
  defaultScope = 'global',
  onClose,
  onCreated,
  t,
}: {
  agent: string;
  defaultScope?: 'global' | 'project';
  onClose: () => void;
  onCreated: () => void;
  t: (k: string) => string;
}) {
  const addToast = useToast((s) => s.addToast);
  const { projectPath } = useScope();
  const [form, setForm] = useState({
    name: '',
    content: '',
    scope: defaultScope,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, string | undefined> = {
        name: form.name,
        content: form.content,
        scope: form.scope,
      };
      if (form.scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/rules?agent=${agent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('rules.created'), 'success');
      onCreated();
      onClose();
    } catch (err) {
      addToast(String(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-md mx-4 p-6">
        <h3 className="text-text-primary font-semibold mb-4">{t('rules.createNew')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('rules.name')}</label>
            <input
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('rules.content')}</label>
            <textarea
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-48"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('rules.scope')}</label>
            <select
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as 'global' | 'project' }))}
            >
              <option value="global">{t('common.global')}</option>
              <option value="project">{t('common.project')}</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="flex-1 py-2 border border-border rounded-lg text-sm text-text-secondary hover:border-border-hover transition-colors"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {submitting ? '...' : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRuleDialog({
  agent,
  rule,
  onClose,
  onUpdated,
  t,
}: {
  agent: string;
  rule: RuleFile;
  onClose: () => void;
  onUpdated: () => void;
  t: (k: string) => string;
}) {
  const addToast = useToast((s) => s.addToast);
  const [content, setContent] = useState(rule.raw);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rules?agent=${agent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: rule.path, content }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('rules.updated'), 'success');
      onUpdated();
      onClose();
    } catch (err) {
      addToast(String(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-md mx-4 p-6">
        <h3 className="text-text-primary font-semibold mb-4">{t('rules.editRule')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{rule.name}</label>
            <textarea
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-64"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="flex-1 py-2 border border-border rounded-lg text-sm text-text-secondary hover:border-border-hover transition-colors"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {submitting ? '...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RuleCard({
  rule,
  agent,
  onChanged,
  t,
}: {
  rule: RuleFile;
  agent: string;
  onChanged: () => void;
  t: (k: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingRule, setEditingRule] = useState(false);
  const addToast = useToast((s) => s.addToast);

  async function handleDelete() {
    if (!window.confirm(`${t('common.delete')}?`)) return;
    try {
      const res = await fetch(
        `/api/rules?agent=${agent}&path=${encodeURIComponent(rule.path)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('rules.deleted'), 'success');
      onChanged();
    } catch (err) {
      addToast(String(err), 'error');
    }
  }

  return (
    <>
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
            <div className="flex items-center justify-end gap-3">
              <button
                className="text-xs text-text-muted hover:text-text-primary transition-colors"
                onClick={() => setEditingRule(true)}
              >
                {t('common.edit')}
              </button>
              <button
                className="text-xs text-accent-red hover:text-accent-red/70 transition-colors"
                onClick={handleDelete}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        )}
      </div>

      {editingRule && (
        <EditRuleDialog
          agent={agent}
          rule={rule}
          onClose={() => setEditingRule(false)}
          onUpdated={onChanged}
          t={t}
        />
      )}
    </>
  );
}

function RulesSection({
  apiUrl,
  agent,
  t,
  reload,
}: {
  apiUrl: string;
  agent: string;
  t: (key: string) => string;
  reload?: () => void;
}) {
  const { data, loading, error, reload: sectionReload } = useFetch<RulesResponse>(apiUrl);

  const handleChanged = () => {
    sectionReload();
    reload?.();
  };

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
        <RuleCard key={rule.path} rule={rule} agent={agent} onChanged={handleChanged} t={t} />
      ))}
    </div>
  );
}

export function RulesPanel() {
  const { t } = useI18n();
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const { projectPath, projects } = useScope();
  const projectOnly = useUiStore((s) => s.projectOnly);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const globalApiUrl = `/api/rules?agent=${currentAgent}&_r=${refreshKey}`;
  const projectApiUrl = projectPath
    ? `/api/rules?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}&_r=${refreshKey}`
    : null;

  const handleCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">{t('rules.title')}</h2>
        <button
          className="px-4 py-1.5 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity"
          onClick={() => setShowCreate(true)}
        >
          + {t('rules.createNew')}
        </button>
      </div>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ScopeBadge scope="global" />
          </div>
          <RulesSection apiUrl={globalApiUrl} agent={currentAgent} t={t} />
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
          <RulesSection apiUrl={projectApiUrl} agent={currentAgent} t={t} />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <p className="text-text-muted text-sm">{t('common.noData')}</p>
          </div>
        )}
      </section>

      {showCreate && (
        <CreateRuleDialog
          agent={currentAgent}
          defaultScope={projectOnly ? 'project' : 'global'}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          t={t}
        />
      )}
    </div>
  );
}
