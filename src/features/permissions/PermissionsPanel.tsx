import { useState } from 'react';
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';
import { useUiStore } from '../../store/ui-store';

interface PermissionsResponse {
  allow: string[];
  deny: string[];
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

function PermissionList({
  listType,
  items,
  agent,
  scope,
  projectPath,
  onChanged,
}: {
  listType: 'allow' | 'deny';
  items: string[];
  agent: string;
  scope: 'global' | 'project';
  projectPath?: string;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const addToast = useToast((s) => s.addToast);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAllow = listType === 'allow';
  const headerColor = isAllow ? 'text-accent-green' : 'text-accent-red';
  const itemBg = isAllow ? 'bg-accent-green/10' : 'bg-accent-red/10';
  const label = isAllow ? t('hooks.allow') : t('hooks.deny');
  const addLabel = isAllow ? t('permissions.addAllow') : t('permissions.addDeny');

  async function handleAdd() {
    if (!newEntry.trim()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        list: listType,
        entry: newEntry.trim(),
        scope,
      };
      if (scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/permissions?agent=${agent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('permissions.created'), 'success');
      setNewEntry('');
      setShowAdd(false);
      onChanged();
    } catch (err) {
      addToast(String(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(index: number) {
    if (!editValue.trim()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        list: listType,
        index,
        entry: editValue.trim(),
        scope,
      };
      if (scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/permissions?agent=${agent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('permissions.updated'), 'success');
      setEditingIndex(null);
      setEditValue('');
      onChanged();
    } catch (err) {
      addToast(String(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(index: number) {
    if (!window.confirm(`${t('common.delete')}?`)) return;
    try {
      const body: Record<string, unknown> = {
        list: listType,
        index,
        scope,
      };
      if (scope === 'project' && projectPath) {
        body.projectPath = projectPath;
      }
      const res = await fetch(`/api/permissions?agent=${agent}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('permissions.deleted'), 'success');
      onChanged();
    } catch (err) {
      addToast(String(err), 'error');
    }
  }

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wide ${headerColor}`}>
          {label}
        </span>
        <button
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
          onClick={() => setShowAdd((v) => !v)}
        >
          + {addLabel}
        </button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-2">
          <input
            className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-hover"
            placeholder={t('permissions.placeholder')}
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <button
            disabled={submitting}
            className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-xs hover:opacity-80 transition-opacity disabled:opacity-50"
            onClick={handleAdd}
          >
            {submitting ? '...' : t('common.add')}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <span className="text-xs text-text-muted">{t('common.none')}</span>
      ) : (
        items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-2">
            {editingIndex === index ? (
              <>
                <input
                  className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-hover"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUpdate(index);
                    }
                    if (e.key === 'Escape') {
                      setEditingIndex(null);
                    }
                  }}
                />
                <button
                  disabled={submitting}
                  className="px-2 py-1 bg-accent-purple text-white rounded text-xs hover:opacity-80 disabled:opacity-50"
                  onClick={() => handleUpdate(index)}
                >
                  {submitting ? '...' : t('common.save')}
                </button>
                <button
                  className="px-2 py-1 border border-border rounded text-xs text-text-secondary hover:border-border-hover"
                  onClick={() => setEditingIndex(null)}
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <>
                <span className={`flex-1 text-xs font-mono text-text-secondary ${itemBg} px-2 py-1 rounded`}>
                  {item}
                </span>
                <button
                  className="text-xs text-text-muted hover:text-text-primary transition-colors"
                  onClick={() => {
                    setEditingIndex(index);
                    setEditValue(item);
                  }}
                >
                  {t('common.edit')}
                </button>
                <button
                  className="text-xs text-accent-red hover:text-accent-red/70 transition-colors"
                  onClick={() => handleDelete(index)}
                >
                  {t('common.delete')}
                </button>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function PermissionsContent({
  apiUrl,
  agent,
  scope,
  projectPath,
  t,
  onChanged,
}: {
  apiUrl: string;
  agent: string;
  scope: 'global' | 'project';
  projectPath?: string;
  t: (k: string) => string;
  onChanged: () => void;
}) {
  const { data, loading, error, reload } = useFetch<PermissionsResponse>(apiUrl);

  const handleChanged = () => {
    reload();
    onChanged();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted">
        <div className="w-4 h-4 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (error) {
    if (error.includes('404') || error.includes('501')) {
      return (
        <div className="bg-bg-secondary rounded-xl border border-border p-6 flex items-center gap-3">
          <p className="text-text-secondary text-sm">{t('common.unsupported')}</p>
        </div>
      );
    }
    return (
      <div className="bg-bg-secondary rounded-xl border border-accent-red/30 p-4 text-accent-red text-sm">
        {t('common.error')}: {error}
      </div>
    );
  }

  const permissions = data ?? { allow: [], deny: [] };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PermissionList
        listType="allow"
        items={permissions.allow}
        agent={agent}
        scope={scope}
        projectPath={projectPath}
        onChanged={handleChanged}
      />
      <PermissionList
        listType="deny"
        items={permissions.deny}
        agent={agent}
        scope={scope}
        projectPath={projectPath}
        onChanged={handleChanged}
      />
    </div>
  );
}

export function PermissionsPanel() {
  const { t } = useI18n();
  const { currentAgent } = useAgentStore();
  const { projectPath, projects } = useScope();
  const projectOnly = useUiStore((s) => s.projectOnly);
  const [refreshKey, setRefreshKey] = useState(0);

  const globalApiUrl = `/api/permissions?agent=${currentAgent}&_r=${refreshKey}`;
  const projectApiUrl = projectPath
    ? `/api/permissions?agent=${currentAgent}&scope=project&path=${encodeURIComponent(projectPath)}&_r=${refreshKey}`
    : null;

  const handleChanged = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-text-primary">{t('permissions.title')}</h2>
      </div>

      {!projectOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ScopeBadge scope="global" />
          </div>
          <PermissionsContent
            apiUrl={globalApiUrl}
            agent={currentAgent}
            scope="global"
            t={t}
            onChanged={handleChanged}
          />
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
          <PermissionsContent
            apiUrl={projectApiUrl}
            agent={currentAgent}
            scope="project"
            projectPath={projectPath ?? undefined}
            t={t}
            onChanged={handleChanged}
          />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <p className="text-text-muted text-sm">{t('common.noData')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
