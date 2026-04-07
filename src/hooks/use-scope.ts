import { useUiStore } from '../store/ui-store';

export function useScope() {
  const scope = useUiStore((s) => s.scope);
  const setScope = useUiStore((s) => s.setScope);
  const projectPath = useUiStore((s) => s.projectPath);
  const setProjectPath = useUiStore((s) => s.setProjectPath);
  const projects = useUiStore((s) => s.projects);
  return { scope, setScope, projectPath, setProjectPath, projects };
}
