import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handlePlugins(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found`, 404);
    return;
  }

  // PATCH /api/plugins/toggle
  if (pathname === '/api/plugins/toggle' && req.method === 'PATCH') {
    const body = await collectBody(req);
    const { name, enabled } = JSON.parse(body);
    if (!name || typeof enabled !== 'boolean') {
      jsonError(res, 'Missing "name" or "enabled"', 400);
      return;
    }
    adapter.togglePlugin(name, enabled);
    json(res, { ok: true });
    return;
  }

  // GET /api/plugins
  if (req.method === 'GET') {
    const scope = query.get('scope') || 'global';
    const projectPath = query.get('path');

    if (scope === 'project') {
      if (!projectPath) { jsonError(res, 'Missing "path" parameter', 400); return; }
      const plugins = adapter.getProjectPlugins(projectPath);
      json(res, plugins);
      return;
    }

    const plugins = adapter.getPlugins();
    json(res, plugins);
  } else {
    jsonError(res, 'Method not allowed', 405);
  }
}
