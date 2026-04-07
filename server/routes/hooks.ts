import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handleHooks(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found`, 404);
    return;
  }

  if (!adapter.supports.hooks) {
    json(res, { hooks: [], permissions: { allow: [], deny: [] }, disableAllHooks: false, unsupported: true });
    return;
  }

  if (pathname === '/api/hooks' && req.method === 'GET') {
    const scope = query.get('scope') || 'global';
    const projectPath = query.get('path');

    if (scope === 'project') {
      if (!projectPath) { jsonError(res, 'Missing "path" parameter', 400); return; }
      const data = adapter.getProjectHooks(projectPath);
      json(res, data);
      return;
    }

    const data = adapter.getHooks();
    json(res, data);
  } else if (pathname === '/api/hooks/toggle' && req.method === 'POST') {
    // Toggle all hooks - read settings, flip disableAllHooks, write back
    json(res, { ok: true, message: 'Toggle not yet implemented' });
  } else {
    jsonError(res, 'Not implemented', 501);
  }
}
