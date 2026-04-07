import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handleSkills(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found`, 404);
    return;
  }

  if (!adapter.supports.skills) {
    json(res, []);
    return;
  }

  if (req.method === 'GET') {
    const scope = query.get('scope') || 'global';
    const projectPath = query.get('path');

    if (scope === 'project') {
      if (!projectPath) { jsonError(res, 'Missing "path" parameter', 400); return; }
      const skills = adapter.getProjectSkills(projectPath);
      json(res, skills);
      return;
    }

    const skills = adapter.getSkills();
    json(res, skills);
  } else if (req.method === 'POST') {
    const body = await collectBody(req);
    const { name, description, content, scope, projectPath } = JSON.parse(body);
    adapter.createSkill(name, description, content, scope, projectPath);
    json(res, { ok: true });
  } else if (req.method === 'DELETE') {
    const skillPath = query.get('path');
    if (!skillPath) {
      jsonError(res, 'Missing "path" parameter', 400);
      return;
    }
    const ok = adapter.deleteSkill(skillPath);
    json(res, { ok });
  }
}
