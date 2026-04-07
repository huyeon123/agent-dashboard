import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { useAgentStore } from '../../store/agent-store';
import { useUiStore } from '../../store/ui-store';
import { useFetch } from '../../hooks/use-fetch';
import { SettingsPanel } from '../../features/settings/SettingsPanel';

interface AgentConfig {
  type: string;
  displayName: string;
  icon: string;
  enabled: boolean;
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

export function Header() {
  const { t, locale, setLocale } = useI18n();
  const { currentAgent, setCurrentAgent } = useAgentStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: agentTypes } = useFetch<AgentConfig[]>('/api/agent-types');
  const { data: projectsData } = useFetch<ProjectsData>('/api/projects');

  const scope = useUiStore((s) => s.scope);
  const setScope = useUiStore((s) => s.setScope);
  const projectPath = useUiStore((s) => s.projectPath);
  const setProjectPath = useUiStore((s) => s.setProjectPath);
  const projects = useUiStore((s) => s.projects);

  // Sync fetched projects into the global store
  useEffect(() => {
    if (projectsData?.projects) {
      useUiStore.getState().setProjects(projectsData.projects);
    }
  }, [projectsData]);

  // Auto-select first project when scope is project and no project selected
  useEffect(() => {
    if (scope === 'project' && !projectPath && projects.length > 0) {
      setProjectPath(projects[0].path);
    }
  }, [scope, projectPath, projects, setProjectPath]);

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-secondary">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-purple flex items-center justify-center text-white font-bold text-sm">
          MA
        </div>
        <h1 className="text-lg font-semibold text-text-primary">
          {t('app.title')}
        </h1>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Agent Selector */}
        <div className="flex items-center gap-2">
          <span className="text-text-secondary text-sm">{t('agentSelector.label')}:</span>
          <select
            value={currentAgent}
            onChange={(e) => setCurrentAgent(e.target.value)}
            className="bg-bg-tertiary text-text-primary border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent-purple cursor-pointer"
          >
            {agentTypes?.map((agent) => (
              <option key={agent.type} value={agent.type}>
                {agent.displayName}
              </option>
            )) || (
              <option value="claude">Claude Code</option>
            )}
          </select>
        </div>

        {/* Scope Toggle */}
        <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
          <button
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              scope === 'global'
                ? 'bg-bg-secondary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            onClick={() => setScope('global')}
          >
            {t('common.global')}
          </button>
          <button
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              scope === 'project'
                ? 'bg-bg-secondary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            onClick={() => setScope('project')}
          >
            {t('common.project')}
          </button>
        </div>

        {/* Project Selector - only when scope is project */}
        {scope === 'project' && (
          projects.length > 0 ? (
            <select
              value={projectPath ?? ''}
              onChange={(e) => setProjectPath(e.target.value)}
              className="bg-bg-tertiary text-text-primary border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-border-hover cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.path}>{p.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-text-muted">
              {t('scopeSelector.noProjects')}
            </span>
          )
        )}

        {/* Language Toggle */}
        <button
          onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
          className="px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded-lg hover:border-border-hover transition-colors text-text-secondary hover:text-text-primary"
        >
          {locale === 'ko' ? 'EN' : 'KO'}
        </button>

        {/* Settings Gear Icon */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 text-text-secondary hover:text-text-primary bg-bg-tertiary border border-border rounded-lg hover:border-border-hover transition-colors"
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="bg-bg-primary rounded-xl border border-border w-full max-w-4xl max-h-[85vh] mx-4 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SettingsPanel />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
