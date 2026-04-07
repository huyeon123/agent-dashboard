import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handleRules(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found`, 404);
    return;
  }

  if (req.method === 'GET') {
    const scope = query.get('scope') || 'global';
    const projectPath = query.get('path');

    if (scope === 'project') {
      if (!projectPath) {
        jsonError(res, 'Missing "path" parameter', 400);
        return;
      }
      json(res, adapter.getProjectRules(projectPath));
      return;
    }

    json(res, adapter.getGlobalRules());
  } else if (req.method === 'POST') {
    const body = await collectBody(req);
    const { name, content, scope, projectPath } = JSON.parse(body);
    if (!name || !content) {
      jsonError(res, 'Missing "name" or "content"', 400);
      return;
    }
    adapter.createRule(name, content, scope || 'global', projectPath);
    json(res, { ok: true });
  } else if (req.method === 'PUT') {
    const body = await collectBody(req);
    const { path: rulePath, content } = JSON.parse(body);
    if (!rulePath || !content) {
      jsonError(res, 'Missing "path" or "content"', 400);
      return;
    }
    adapter.updateRule(rulePath, content);
    json(res, { ok: true });
  } else if (req.method === 'DELETE') {
    const rulePath = query.get('path');
    if (!rulePath) {
      jsonError(res, 'Missing "path" parameter', 400);
      return;
    }
    const ok = adapter.deleteRule(rulePath);
    json(res, { ok });
  } else {
    jsonError(res, 'Method not allowed', 405);
  }
}
