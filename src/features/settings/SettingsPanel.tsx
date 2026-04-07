import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../i18n';
import { useScope } from '../../hooks/use-scope';
import { useUiStore } from '../../store/ui-store';
import { CapabilitiesPanel } from '../capabilities/CapabilitiesPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsData {
  raw: string;
  parsed: unknown;
  format: 'json' | 'toml' | 'jsonc';
  filePath: string;
}

interface AgentPaths {
  globalHome?: string;
  projectDir?: string;
  globalInstruction?: string;
  projectInstruction?: string;
  settings?: string;
  settingsFormat?: string;
  skills?: string;
  commands?: string;
  agents?: string;
  plugins?: string;
  hooks?: string;
  mcp?: string;
  [key: string]: string | undefined;
}

interface AgentConfig {
  type: string;
  displayName: string;
  icon?: string;
  builtIn: boolean;
  enabled: boolean;
  paths: AgentPaths;
}

interface Project {
  id: string;
  name: string;
  path: string;
  category: string;
  agents: string[];
  addedAt: string;
}

interface ProjectsData {
  projects: Project[];
  categories: string[];
}

interface AnalyzeResult {
  path: string;
  name: string;
  detectedAgents: string[];
  hasPackageJson: boolean;
  framework?: string;
  language?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMAT_COLORS: Record<string, string> = {
  json: 'bg-accent-blue/15 text-accent-blue',
  toml: 'bg-accent-green/15 text-accent-green',
  jsonc: 'bg-accent-purple/15 text-accent-purple',
};

const OPTIONAL_PATH_KEYS: (keyof AgentPaths)[] = [
  'settings', 'settingsFormat', 'skills', 'commands',
  'agents', 'plugins', 'hooks', 'mcp',
];

const REQUIRED_PATH_KEYS: (keyof AgentPaths)[] = [
  'globalHome', 'projectDir', 'globalInstruction', 'projectInstruction',
];

const ALL_PATH_KEYS = [...REQUIRED_PATH_KEYS, ...OPTIONAL_PATH_KEYS];

const PROJECT_CATEGORIES = ['work', 'personal', 'open-source', 'experiment', 'other'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateContent(content: string, format: 'json' | 'toml' | 'jsonc'): string | null {
  if (format === 'json' || format === 'jsonc') {
    try {
      const stripped =
        format === 'jsonc'
          ? content.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
          : content;
      JSON.parse(stripped);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid JSON';
    }
  }
  return null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── Sub-components: Agent Types ──────────────────────────────────────────────

function AgentCard({
  agent,
  onSave,
  onDelete,
}: {
  agent: AgentConfig;
  onSave: (type: string, paths: AgentPaths) => Promise<void>;
  onDelete: (type: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftPaths, setDraftPaths] = useState<AgentPaths>({ ...agent.paths });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { t } = useI18n();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(agent.type, draftPaths);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftPaths({ ...agent.paths });
    setEditing(false);
  };

  const pathEntries = ALL_PATH_KEYS.filter(
    (k) => agent.paths[k] !== undefined || editing
  );

  return (
    <div className="bg-bg-secondary rounded-xl border border-border flex flex-col">
      <div className="p-4 flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {agent.icon && <span className="text-lg leading-none">{agent.icon}</span>}
            <span className="font-semibold text-text-primary">{agent.displayName}</span>
            <span className="text-xs font-mono text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">
              {agent.type}
            </span>
            {agent.builtIn ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue">
                {t('common.builtIn')}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-purple/15 text-accent-purple">
                {t('common.custom')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${agent.enabled ? 'bg-accent-green' : 'bg-text-muted'}`}
              title={agent.enabled ? t('common.enabled') : t('common.disabled')}
            />
            <span className="text-xs text-text-muted">{agent.enabled ? t('common.enabled') : t('common.disabled')}</span>
          </div>
        </div>

        {/* Paths toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 mt-1"
        >
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {t('settings.paths')}
        </button>
      </div>

      {/* Paths section */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {pathEntries.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-mono w-36 shrink-0">{key}</span>
                {editing ? (
                  <input
                    type="text"
                    value={draftPaths[key] ?? ''}
                    onChange={(e) =>
                      setDraftPaths((prev) => ({ ...prev, [key]: e.target.value || undefined }))
                    }
                    placeholder={REQUIRED_PATH_KEYS.includes(key) ? t('common.required') : t('common.optional')}
                    className="flex-1 text-xs font-mono bg-bg-primary border border-border focus:border-accent-purple rounded px-2 py-1 outline-none text-text-primary placeholder:text-text-muted"
                  />
                ) : (
                  <span className="text-xs font-mono text-text-secondary truncate flex-1">
                    {agent.paths[key] ?? <span className="text-text-muted italic">—</span>}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-lg bg-accent-purple text-bg-primary hover:bg-accent-purple/80 transition-colors disabled:opacity-40"
                >
                  {saving ? t('common.saving') : t('common.save')}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-xs px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-border-hover text-text-secondary hover:text-text-primary transition-colors"
              >
                {t('settings.editPaths')}
              </button>
            )}
            {!agent.builtIn && !editing && (
              confirmDelete ? (
                <>
                  <span className="text-xs text-text-muted">{t('settings.deleteQuestion')}</span>
                  <button
                    onClick={() => onDelete(agent.type)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent-red text-bg-primary hover:bg-accent-red/80 transition-colors"
                  >
                    {t('common.confirm')}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-accent-red/30 text-accent-red hover:bg-accent-red/10 transition-colors ml-auto"
                >
                  {t('common.delete')}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddAgentForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const addToast = useToast((s) => s.addToast);
  const { t, tf } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'custom:',
    displayName: '',
    icon: '',
    globalHome: '',
    projectDir: '',
    globalInstruction: '',
    projectInstruction: '',
    settings: '',
    settingsFormat: '',
    skills: '',
    commands: '',
    agents: '',
    plugins: '',
    hooks: '',
    mcp: '',
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.type || !form.displayName || !form.globalHome || !form.projectDir ||
        !form.globalInstruction || !form.projectInstruction) {
      addToast(t('settings.fillRequiredFields'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      const paths: AgentPaths = {};
      ALL_PATH_KEYS.forEach((k) => {
        const val = (form as Record<string, string>)[k];
        if (val) paths[k] = val;
      });
      const res = await fetch('/api/agent-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: form.type, displayName: form.displayName, icon: form.icon, paths }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('settings.agentTypeCreated'), 'success');
      onCreated();
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('common.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full text-sm bg-bg-primary border border-border focus:border-accent-purple rounded-lg px-3 py-1.5 outline-none text-text-primary placeholder:text-text-muted';

  return (
    <div className="bg-bg-secondary rounded-xl border border-accent-purple/30 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{t('settings.addCustomAgentType')}</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">{t('settings.type')} <span className="text-accent-red">*</span></label>
          <input className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="custom:my-agent" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">{t('settings.displayName')} <span className="text-accent-red">*</span></label>
          <input className={inputClass} value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="My Agent" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">{t('settings.icon')}</label>
          <input className={inputClass} value={form.icon} onChange={(e) => set('icon', e.target.value)} placeholder="🤖" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-text-secondary">{t('settings.requiredPaths')}</p>
        {REQUIRED_PATH_KEYS.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-mono w-36 shrink-0">{k} <span className="text-accent-red">*</span></span>
            <input
              className={`${inputClass} flex-1`}
              value={(form as Record<string, string>)[k] ?? ''}
              onChange={(e) => set(k as string, e.target.value)}
              placeholder={tf('settings.pathFor', { key: k })}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-text-secondary">{t('settings.optionalPaths')}</p>
        {OPTIONAL_PATH_KEYS.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-mono w-36 shrink-0">{k}</span>
            <input
              className={`${inputClass} flex-1`}
              value={(form as Record<string, string>)[k] ?? ''}
              onChange={(e) => set(k as string, e.target.value)}
              placeholder={t('common.optional')}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="text-sm px-4 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="text-sm px-4 py-1.5 rounded-lg bg-accent-purple text-bg-primary hover:bg-accent-purple/80 transition-colors disabled:opacity-40"
        >
          {submitting ? t('common.loading') : t('common.create')}
        </button>
      </div>
    </div>
  );
}

function AgentTypesTab() {
  const { t, tf } = useI18n();
  const { data, loading, error, reload } = useFetch<AgentConfig[]>('/api/agent-types');
  const addToast = useToast((s) => s.addToast);
  const [showAddForm, setShowAddForm] = useState(false);

  const agents = data ?? [];

  const handleSave = async (type: string, paths: AgentPaths) => {
    try {
      const res = await fetch(`/api/agent-types/${encodeURIComponent(type)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('settings.pathsSaved'), 'success');
      reload();
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('settings.saveFailed'), 'error');
      throw e;
    }
  };

  const handleDelete = async (type: string) => {
    try {
      const res = await fetch(`/api/agent-types/${encodeURIComponent(type)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('settings.agentTypeDeleted'), 'success');
      reload();
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('settings.deleteFailed'), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{tf('settings.agentTypesCount', { count: agents.length })}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="text-sm text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-border-hover"
          >
            {t('common.refresh')}
          </button>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="text-sm px-3 py-1.5 rounded-lg bg-accent-purple text-bg-primary hover:bg-accent-purple/80 transition-colors"
          >
            + {t('settings.addCustomAgent')}
          </button>
        </div>
      </div>

      {showAddForm && (
        <AddAgentForm onClose={() => setShowAddForm(false)} onCreated={reload} />
      )}

      {loading && (
        <div className="flex items-center gap-2 text-text-muted">
          <div className="w-4 h-4 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-bg-secondary rounded-xl border border-accent-red/30 p-4 text-accent-red text-sm">
          {error}
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="bg-bg-secondary rounded-xl border border-border p-8 flex flex-col items-center gap-2 text-center">
          <p className="text-text-muted text-sm">{t('settings.noAgentTypes')}</p>
        </div>
      )}

      {!loading && agents.length > 0 && (
        <div className="flex flex-col gap-3">
          {agents.map((agent) => (
            <AgentCard key={agent.type} agent={agent} onSave={handleSave} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components: Projects ─────────────────────────────────────────────────

function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string) => Promise<void> }) {
  const { t, tf } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(project.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-semibold text-text-primary truncate">{project.name}</span>
          <span className="text-xs font-mono text-text-muted truncate">{project.path}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue capitalize">
            {project.category}
          </span>
        </div>
      </div>

      {project.agents && project.agents.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.agents.map((a) => (
            <span key={a} className="text-xs font-mono px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">
              {a}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{tf('settings.addedOn', { date: formatDate(project.addedAt) })}</span>
        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-xs text-text-muted">{t('settings.deleteQuestion')}</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-3 py-1 rounded-lg bg-accent-red text-bg-primary hover:bg-accent-red/80 transition-colors disabled:opacity-40"
              >
                {deleting ? '…' : t('common.confirm')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-3 py-1 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs px-3 py-1 rounded-lg border border-accent-red/30 text-accent-red hover:bg-accent-red/10 transition-colors"
            >
              {t('common.delete')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RegisterProjectForm({
  agents,
  categories,
  onClose,
  onCreated,
}: {
  agents: AgentConfig[];
  categories: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const addToast = useToast((s) => s.addToast);
  const { t, tf } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState({
    path: '',
    name: '',
    category: categories[0] ?? PROJECT_CATEGORIES[0],
    selectedAgents: [] as string[],
  });

  const enabledAgents = agents.filter((a) => a.enabled);

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePathChange = (val: string) => {
    set('path', val);
    if (!form.name || form.name === deriveBasename(form.path)) {
      set('name', deriveBasename(val));
    }
  };

  const deriveBasename = (p: string) => p.split('/').filter(Boolean).pop() ?? '';

  const handleAnalyze = async () => {
    if (!form.path) { addToast(t('settings.enterPathFirst'), 'error'); return; }
    setAnalyzing(true);
    try {
      const res = await fetch('/api/projects/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: form.path }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: AnalyzeResult = await res.json();
      setForm((prev) => ({
        ...prev,
        name: result.name || prev.name,
        selectedAgents: result.detectedAgents ?? prev.selectedAgents,
      }));
      addToast(tf('settings.detected', { value: result.framework ?? result.language ?? t('common.project') }), 'info');
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('settings.analysisFailed'), 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleAgent = (type: string) =>
    setForm((prev) => ({
      ...prev,
      selectedAgents: prev.selectedAgents.includes(type)
        ? prev.selectedAgents.filter((a) => a !== type)
        : [...prev.selectedAgents, type],
    }));

  const handleSubmit = async () => {
    if (!form.path || !form.name) { addToast(t('settings.pathAndNameRequired'), 'error'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: form.path, name: form.name, category: form.category, agents: form.selectedAgents }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('settings.projectRegistered'), 'success');
      onCreated();
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('common.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const allCategories = [...new Set([...PROJECT_CATEGORIES, ...categories])];
  const inputClass = 'w-full text-sm bg-bg-primary border border-border focus:border-accent-purple rounded-lg px-3 py-1.5 outline-none text-text-primary placeholder:text-text-muted';

  return (
    <div className="bg-bg-secondary rounded-xl border border-accent-purple/30 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{t('settings.registerProject')}</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-muted">{t('settings.path')} <span className="text-accent-red">*</span></label>
        <div className="flex gap-2">
          <input
            className={`${inputClass} flex-1`}
            value={form.path}
            onChange={(e) => handlePathChange(e.target.value)}
            placeholder="/path/to/project"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="text-sm px-3 py-1.5 rounded-lg border border-border hover:border-border-hover text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap disabled:opacity-40"
          >
            {analyzing ? t('settings.analyzing') : t('settings.analyze')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">{t('settings.name')} <span className="text-accent-red">*</span></label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="My Project"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">{t('settings.category')}</label>
          <select
            className={inputClass}
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          >
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {enabledAgents.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-muted">{t('settings.agents')}</label>
          <div className="flex flex-wrap gap-2">
            {enabledAgents.map((a) => (
              <label key={a.type} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.selectedAgents.includes(a.type)}
                  onChange={() => toggleAgent(a.type)}
                  className="accent-accent-purple"
                />
                <span className="text-xs text-text-secondary">
                  {a.icon && <span className="mr-0.5">{a.icon}</span>}{a.displayName}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="text-sm px-4 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="text-sm px-4 py-1.5 rounded-lg bg-accent-purple text-bg-primary hover:bg-accent-purple/80 transition-colors disabled:opacity-40"
        >
          {submitting ? t('common.loading') : t('common.register')}
        </button>
      </div>
    </div>
  );
}

function ProjectsTab() {
  const { t, tf } = useI18n();
  const { data, loading, error, reload } = useFetch<ProjectsData>('/api/projects');
  const agentsFetch = useFetch<AgentConfig[]>('/api/agent-types');
  const addToast = useToast((s) => s.addToast);
  const [showForm, setShowForm] = useState(false);

  const projects = data?.projects ?? [];
  const categories = data?.categories ?? PROJECT_CATEGORIES;
  const agents = agentsFetch.data ?? [];

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('settings.projectRemoved'), 'success');
      reload();
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('settings.deleteFailed'), 'error');
      throw e;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{tf('settings.projectsCount', { count: projects.length })}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="text-sm text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-border-hover"
          >
            {t('common.refresh')}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm px-3 py-1.5 rounded-lg bg-accent-purple text-bg-primary hover:bg-accent-purple/80 transition-colors"
          >
            + {t('settings.registerProject')}
          </button>
        </div>
      </div>

      {showForm && (
        <RegisterProjectForm
          agents={agents}
          categories={categories}
          onClose={() => setShowForm(false)}
          onCreated={reload}
        />
      )}

      {loading && (
        <div className="flex items-center gap-2 text-text-muted">
          <div className="w-4 h-4 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-bg-secondary rounded-xl border border-accent-red/30 p-4 text-accent-red text-sm">
          {error}
        </div>
      )}

      {!loading && !error && projects.length === 0 && !showForm && (
        <div className="bg-bg-secondary rounded-xl border border-border p-8 flex flex-col items-center gap-3 text-center">
          <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-text-muted text-sm">{t('settings.noProjectsYet')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-4 py-1.5 rounded-lg bg-accent-purple text-bg-primary hover:bg-accent-purple/80 transition-colors"
          >
            {t('settings.registerFirstProject')}
          </button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings tab (dual-section: Global + Project) ──────────────────────────

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

function SettingsEditor({
  apiUrl,
  agent,
}: {
  apiUrl: string | null;
  agent: string;
}) {
  const { t } = useI18n();
  const { data, loading, error, reload } = useFetch<SettingsData>(apiUrl);
  const addToast = useToast((s) => s.addToast);
  const [rawContent, setRawContent] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setRawContent(data.raw);
      setValidationError(null);
    }
  }, [data]);

  useEffect(() => {
    reload();
  }, [agent, reload]);

  const handleChange = useCallback(
    (value: string) => {
      setRawContent(value);
      if (data) {
        const err = validateContent(value, data.format);
        setValidationError(err);
      }
    },
    [data]
  );

  const handleSave = async () => {
    if (validationError || !apiUrl) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: rawContent }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('settings.autoBackupCreated'), 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('settings.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const unsupported = !loading && !error && !data;

  if (apiUrl === null) {
    return (
      <div className="flex items-center justify-center py-6">
        <p className="text-text-muted text-sm">{t('common.selectProject')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          {data && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                FORMAT_COLORS[data.format] ?? 'bg-bg-tertiary text-text-muted'
              }`}
            >
              {data.format.toUpperCase()}
            </span>
          )}
          {data && (
            <span className="text-xs text-text-muted font-mono truncate max-w-xs">{data.filePath}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            {t('common.refresh')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !!validationError || !data}
            className="px-3 py-1.5 text-sm rounded-lg bg-accent-purple text-bg-primary hover:bg-accent-purple/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="m-4 rounded-lg bg-bg-secondary border border-accent-red/30 p-4 text-accent-red text-sm">
          {error}
        </div>
      )}

      {unsupported && (
        <div className="flex items-center justify-center py-8">
          <p className="text-text-muted text-sm">{t('settings.settingsFileUnsupported')}</p>
        </div>
      )}

      {!loading && data && (
        <div className="flex flex-col min-h-0 p-4 gap-2">
          <textarea
            value={rawContent}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
            className={`w-full resize-none font-mono text-sm bg-bg-secondary text-text-primary rounded-xl p-4 outline-none transition-colors border min-h-[300px] ${
              validationError
                ? 'border-accent-red focus:border-accent-red'
                : 'border-border focus:border-accent-purple'
            }`}
          />
          {validationError && (
            <p className="text-accent-red text-xs font-mono px-1">{validationError}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const { t } = useI18n();
  const { data: agentTypes, loading } = useFetch<AgentConfig[]>('/api/agent-types');
  const projectOnly = useUiStore((s) => s.projectOnly);
  const { projectPath, projects } = useScope();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {(agentTypes ?? []).map((agent) => (
        <div key={agent.type} className="flex flex-col gap-3">
          {/* Agent header */}
          <div className="flex items-center gap-2 pb-1 border-b border-border">
            {agent.icon && <span className="text-base">{agent.icon}</span>}
            <span className="font-semibold text-text-primary text-sm">{agent.displayName}</span>
            <span className="text-xs font-mono text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">{agent.type}</span>
          </div>

          {!agent.paths.settings ? (
            <p className="text-xs text-text-muted px-1">{t('settings.settingsFileUnsupported')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {!projectOnly && (
                <div>
                  <ScopeBadge scope="global" />
                  <SettingsEditor
                    apiUrl={`/api/settings?agent=${agent.type}`}
                    agent={agent.type}
                  />
                </div>
              )}
              <div>
                <ScopeBadge scope="project" />
                {projects.length === 0 ? (
                  <div className="flex items-center justify-center py-6">
                    <p className="text-text-muted text-sm">{t('common.registerProjects')}</p>
                  </div>
                ) : (
                  <SettingsEditor
                    apiUrl={projectPath ? `/api/settings?agent=${agent.type}&scope=project&path=${encodeURIComponent(projectPath)}` : null}
                    agent={agent.type}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Guide sub-tab ───────────────────────────────────────────────────────────

const GETTING_STARTED_STEPS: { agent: string; file: string; descriptionKey: string; color: string }[] = [
  {
    agent: 'Claude',
    file: 'CLAUDE.md',
    descriptionKey: 'settings.gettingStarted.claude',
    color: 'accent-purple',
  },
  {
    agent: 'Codex',
    file: 'AGENTS.md',
    descriptionKey: 'settings.gettingStarted.codex',
    color: 'accent-green',
  },
  {
    agent: 'Copilot',
    file: '.github/copilot-instructions.md',
    descriptionKey: 'settings.gettingStarted.copilot',
    color: 'accent-blue',
  },
  {
    agent: 'OpenCode',
    file: 'OPENCODE.md',
    descriptionKey: 'settings.gettingStarted.opencode',
    color: 'accent-yellow',
  },
];

const QUICK_TIPS = [
  {
    icon: '📌',
    titleKey: 'settings.tips.clearRoleTitle',
    descriptionKey: 'settings.tips.clearRoleDescription',
  },
  {
    icon: '📁',
    titleKey: 'settings.tips.projectStructureTitle',
    descriptionKey: 'settings.tips.projectStructureDescription',
  },
  {
    icon: '🚫',
    titleKey: 'settings.tips.prohibitionsTitle',
    descriptionKey: 'settings.tips.prohibitionsDescription',
  },
  {
    icon: '🔄',
    titleKey: 'settings.tips.updatesTitle',
    descriptionKey: 'settings.tips.updatesDescription',
  },
  {
    icon: '🌐',
    titleKey: 'settings.tips.languageTitle',
    descriptionKey: 'settings.tips.languageDescription',
  },
  {
    icon: '⚡',
    titleKey: 'settings.tips.conciseTitle',
    descriptionKey: 'settings.tips.conciseDescription',
  },
];

function GuideSectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-bg-tertiary">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function GuideTab() {
  const { t } = useI18n();
  return (
    <div className="p-4 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full bg-accent-purple/15 text-accent-purple text-xs">
          {t('settings.guideBadge')}
        </span>
      </div>

      {/* Section 1: Getting Started */}
      <GuideSectionCard title={t('settings.gettingStartedTitle')}>
        <div className="flex flex-col gap-4">
          {GETTING_STARTED_STEPS.map((step) => (
            <div key={step.agent} className="flex gap-4">
              <div
                className={`shrink-0 w-16 text-center px-2 py-1 rounded-lg text-xs font-semibold bg-${step.color}/15 text-${step.color}`}
              >
                {step.agent}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-text-primary mb-1">{step.file}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{t(step.descriptionKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </GuideSectionCard>

      {/* Section 2: Quick Tips */}
      <GuideSectionCard title={t('settings.quickTipsTitle')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_TIPS.map((tip) => (
            <div
              key={tip.titleKey}
              className="flex gap-3 p-3 rounded-lg bg-bg-tertiary border border-border hover:border-border-hover transition-colors"
            >
              <span className="text-xl shrink-0">{tip.icon}</span>
              <div>
                <p className="text-sm font-medium text-text-primary mb-0.5">{t(tip.titleKey)}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{t(tip.descriptionKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </GuideSectionCard>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type SubTab = 'settings' | 'agent-types' | 'projects' | 'guide' | 'capabilities';

const SUB_TABS: SubTab[] = ['settings', 'agent-types', 'projects', 'capabilities', 'guide'];

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SubTab>('settings');
  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-0 shrink-0">
        <h2 className="text-xl font-semibold text-text-primary">{t('settings.title')}</h2>
      </div>

      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-border shrink-0">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-accent-purple text-accent-purple'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {t(`settings.subTabs.${tab === 'agent-types' ? 'agentTypes' : tab}`)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'agent-types' && <AgentTypesTab />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'guide' && <GuideTab />}
        {activeTab === 'capabilities' && <CapabilitiesPanel />}
      </div>
    </div>
  );
}
