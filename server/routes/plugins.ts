import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handlePlugins(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
      if (!projectPath) { jsonError(res, 'Missing "path" parameter', 400); return; }
      const plugins = adapter.getProjectPlugins(projectPath);
      json(res, plugins);
      return;
    }

    const plugins = adapter.getPlugins();
    json(res, plugins);
  }
}
