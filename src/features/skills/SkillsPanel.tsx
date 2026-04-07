import { useState } from 'react';
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';
import { useUiStore } from '../../store/ui-store';
import type { Skill, SkillSource, CreateSkillInput } from '../../types/skills';

const SOURCE_BADGE: Record<SkillSource, { label: string; color: string }> = {
  user: { label: 'Global', color: 'text-accent-purple bg-accent-purple/10 border-accent-purple/20' },
  plugin: { label: 'Plugin', color: 'text-accent-blue bg-accent-blue/10 border-accent-blue/20' },
  project: { label: 'Project', color: 'text-accent-green bg-accent-green/10 border-accent-green/20' },
};

function SourceBadge({ source }: { source: SkillSource }) {
  const { label, color } = SOURCE_BADGE[source] ?? SOURCE_BADGE.user;
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${color}`}>{label}</span>
  );
}

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

function SkillCard({
  skill,
  onDelete,
  t,
}: {
  skill: Skill;
  onDelete: (id: string) => void;
  t: (k: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-bg-tertiary rounded-lg border border-border">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-secondary/50 transition-colors rounded-lg"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary text-sm">{skill.name}</span>
            <SourceBadge source={skill.source} />
          </div>
          {skill.description && (
            <p className="text-text-muted text-xs mt-0.5 truncate">{skill.description}</p>
          )}
        </div>
        <span className="text-text-muted text-xs flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
          {skill.description && (
            <p className="text-text-secondary text-sm">{skill.description}</p>
          )}
          {skill.content && (
            <pre className="font-mono text-xs text-text-muted bg-bg-secondary rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
              {skill.content}
            </pre>
          )}
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs">{skill.path}</span>
            {skill.source === 'user' && (
              <button
                className="text-xs text-accent-red hover:text-accent-red/70 transition-colors"
                onClick={() => {
                  if (window.confirm(`Delete skill "${skill.name}"?`)) {
                    onDelete(skill.id);
                  }
                }}
              >
                {t('common.delete')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateSkillDialog({
  agent,
  defaultScope,
  onClose,
  onCreated,
  t,
}: {
  agent: string;
  defaultScope: 'global' | 'project';
  onClose: () => void;
  onCreated: () => void;
  t: (k: string) => string;
}) {
  const addToast = useToast((s) => s.addToast);
  const [form, setForm] = useState<CreateSkillInput>({
    name: '',
    description: '',
    content: '',
    scope: defaultScope,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/skills?agent=${agent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('skills.created'), 'success');
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
        <h3 className="text-text-primary font-semibold mb-4">{t('skills.createNew')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('skills.name')}</label>
            <input
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('skills.description')}</label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-hover resize-none h-20"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('skills.content')}</label>
            <textarea
              required
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-border-hover resize-none h-32"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('skills.scope')}</label>
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

function SkillsList({
  skills,
  onDelete,
  t,
}: {
  skills: Skill[];
  onDelete: (id: string) => void;
  t: (k: string) => string;
}) {
  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-text-muted text-sm">{t('common.noData')}</p>
      </div>
    );
  }

  const grouped: Record<SkillSource, Skill[]> = { user: [], plugin: [], project: [] };
  for (const skill of skills) {
    const src = skill.source in grouped ? skill.source : 'user';
    grouped[src].push(skill);
  }

  const groupOrder: SkillSource[] = ['user', 'plugin', 'project'];
  const groupLabels: Record<SkillSource, string> = {
    user: t('common.user'),
    plugin: t('common.plugin'),
    project: t('common.project'),
  };

  return (
    <div className="space-y-6">
      {groupOrder.map((source) => {
        const group = grouped[source];
        if (group.length === 0) return null;
        return (
          <div key={source}>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              {groupLabels[source]} ({group.length})
            </h3>
            <div className="space-y-2">
              {group.map((skill) => (
                <SkillCard key={skill.id} skill={skill} onDelete={onDelete} t={t} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkillsSection({
  apiUrl,
  onDelete,
  t,
}: {
  apiUrl: string;
  onDelete: (id: string) => void;
  t: (k: string) => string;
}) {
  const { data, loading, error } = useFetch<Skill[]>(apiUrl);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-bg-tertiary rounded-lg border border-border" />
        ))}
      </div>
    );
  }

  if (error) {
    if (error.includes('404') || error.includes('501')) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-text-muted text-sm">{t('common.unsupported')}</p>
        </div>
      );
    }
    return <div className="text-accent-red text-sm">{t('common.error')}: {error}</div>;
  }

  return <SkillsList skills={data ?? []} onDelete={onDelete} t={t} />;
}

export function SkillsPanel() {
  const { t } = useI18n();
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const addToast = useToast((s) => s.addToast);
  const [showCreate, setShowCreate] = useState(false);
  const { projectPath, projects } = useScope();
  const projectOnly = useUiStore((s) => s.projectOnly);

  const globalApiUrl = `/api/skills?agent=${currentAgent}`;
  const projectApiUrl = projectPath
    ? `/api/skills?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}`
    : null;

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/skills/${id}?agent=${currentAgent}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('skills.deleted'), 'success');
    } catch (err) {
      addToast(String(err), 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">{t('skills.title')}</h2>
        {!projectOnly && (
          <button
            className="px-4 py-1.5 bg-accent-purple text-white rounded-lg text-sm hover:opacity-80 transition-opacity"
            onClick={() => setShowCreate(true)}
          >
            + {t('skills.createNew')}
          </button>
        )}
      </div>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ScopeBadge scope="global" />
          </div>
          <SkillsSection apiUrl={globalApiUrl} onDelete={handleDelete} t={t} />
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
          <SkillsSection apiUrl={projectApiUrl} onDelete={handleDelete} t={t} />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <p className="text-text-muted text-sm">{t('common.noData')}</p>
          </div>
        )}
      </section>

      {showCreate && (
        <CreateSkillDialog
          agent={currentAgent}
          defaultScope="global"
          onClose={() => setShowCreate(false)}
          onCreated={() => {/* sections will re-fetch via useFetch */}}
          t={t}
        />
      )}
    </div>
  );
}
