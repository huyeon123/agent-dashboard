import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody } from '../helpers';
import { safeReadJson } from '../backup';
import { loadRegistry } from '../agents/registry';


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

const PROJECTS_FILE = path.join(process.cwd(), 'data', 'projects.json');

function loadProjects(): ProjectsData {
  return safeReadJson<ProjectsData>(PROJECTS_FILE, { projects: [], categories: [] });
}

function saveProjects(data: ProjectsData): void {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function handleProjects(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  if (pathname === '/api/projects' && req.method === 'GET') {
    json(res, loadProjects());
    return;
  }

  if (pathname === '/api/projects' && req.method === 'POST') {
    const body = await collectBody(req);
    const input = JSON.parse(body);
    const data = loadProjects();
    const project: Project = {
      id: `proj-${Date.now()}`,
      name: input.name || path.basename(input.path),
      path: input.path,
      category: input.category || '기타',
      agents: input.agents || [],
      addedAt: new Date().toISOString(),
    };
    data.projects.push(project);
    saveProjects(data);
    json(res, project);
    return;
  }

  // DELETE /api/projects/:id
  const deleteMatch = pathname.match(/^\/api\/projects\/(.+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    const id = deleteMatch[1];
    const data = loadProjects();
    data.projects = data.projects.filter((p) => p.id !== id);
    saveProjects(data);
    json(res, { ok: true });
    return;
  }

  if (pathname === '/api/projects/analyze' && req.method === 'POST') {
    const body = await collectBody(req);
    const { path: projectPath } = JSON.parse(body);

    if (!projectPath || !fs.existsSync(projectPath)) {
      jsonError(res, 'Invalid project path', 400);
      return;
    }

    const registry = loadRegistry();
    const detectedAgents: string[] = [];

    for (const agent of registry.agents) {
      if (!agent.enabled) continue;
      const projDir = path.join(projectPath, agent.paths.projectDir);
      const instrFile = path.join(projectPath, agent.paths.projectInstruction);
      if (fs.existsSync(projDir) || fs.existsSync(instrFile)) {
        detectedAgents.push(agent.type);
      }
    }

    const hasPackageJson = fs.existsSync(path.join(projectPath, 'package.json'));
    let framework: string | undefined;
    let language: string | undefined;

    if (hasPackageJson) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.next) framework = 'Next.js';
        else if (deps.react) framework = 'React';
        else if (deps.vue) framework = 'Vue';
        else if (deps.svelte) framework = 'Svelte';
        else if (deps.express) framework = 'Express';

        language = deps.typescript ? 'TypeScript' : 'JavaScript';
      } catch { /* ignore */ }
    }

    json(res, {
      path: projectPath,
      name: path.basename(projectPath),
      detectedAgents,
      hasPackageJson,
      framework,
      language,
    });
    return;
  }

  jsonError(res, 'Not found', 404);
}
