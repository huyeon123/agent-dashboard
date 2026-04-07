import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handleSettings(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found`, 404);
    return;
  }

  if (!adapter.supports.settings) {
    jsonError(res, `Agent "${agentType}" does not support settings`, 400);
    return;
  }

  if (req.method === 'GET') {
    const scope = query.get('scope') || 'global';
    const projectPath = query.get('path');

    if (scope === 'project') {
      if (!projectPath) { jsonError(res, 'Missing "path" parameter', 400); return; }
      const data = adapter.getProjectSettings(projectPath);
      json(res, data);
      return;
    }

    const data = adapter.getSettings();
    json(res, data);
  } else if (req.method === 'PUT') {
    const body = await collectBody(req);
    const parsed = JSON.parse(body);
    adapter.setSettings(parsed.raw);
    json(res, { ok: true });
  }
}
