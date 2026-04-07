import { create } from 'zustand';

export type Locale = 'ko' | 'en';
export type Scope = 'global' | 'project';

interface Project {
  id: string;
  name: string;
  path: string;
}

interface UiState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  scope: Scope;
  setScope: (scope: Scope) => void;
  projectPath: string | null;
  setProjectPath: (path: string | null) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  projectOnly: boolean;
  setProjectOnly: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  locale: (localStorage.getItem('locale') as Locale) || 'ko',
  setLocale: (locale) => {
    localStorage.setItem('locale', locale);
    set({ locale });
  },
  scope: (localStorage.getItem('scope') as Scope) || 'global',
  setScope: (scope) => {
    localStorage.setItem('scope', scope);
    set({ scope });
  },
  projectPath: localStorage.getItem('projectPath') || null,
  setProjectPath: (path) => {
    if (path) {
      localStorage.setItem('projectPath', path);
    } else {
      localStorage.removeItem('projectPath');
    }
    set({ projectPath: path });
  },
  projects: [],
  setProjects: (projects) => set({ projects }),
  projectOnly: (localStorage.getItem('projectOnly') === 'true') || false,
  setProjectOnly: (v) => {
    localStorage.setItem('projectOnly', String(v));
    set({ projectOnly: v });
  },
}));
