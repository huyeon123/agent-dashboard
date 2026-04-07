import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handlePermissions(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found`, 404);
    return;
  }

  if (!adapter.supports.hooks) {
    json(res, { allow: [], deny: [], unsupported: true });
    return;
  }

  if (req.method === 'GET') {
    const scope = (query.get('scope') || 'global') as 'global' | 'project';
    const projectPath = query.get('path') || undefined;

    if (scope === 'project' && !projectPath) {
      jsonError(res, 'Missing "path" parameter', 400);
      return;
    }

    const permissions = adapter.getPermissions(scope, projectPath);
    json(res, permissions);
  } else if (req.method === 'POST') {
    const body = await collectBody(req);
    const { list, entry, scope, projectPath } = JSON.parse(body);
    if (!list || !entry) {
      jsonError(res, 'Missing "list" or "entry"', 400);
      return;
    }
    adapter.addPermission(list, entry, scope || 'global', projectPath);
    json(res, { ok: true });
  } else if (req.method === 'PUT') {
    const body = await collectBody(req);
    const { list, index, entry, scope, projectPath } = JSON.parse(body);
    if (!list || typeof index !== 'number' || !entry) {
      jsonError(res, 'Missing "list", "index", or "entry"', 400);
      return;
    }
    adapter.updatePermission(list, index, entry, scope || 'global', projectPath);
    json(res, { ok: true });
  } else if (req.method === 'DELETE') {
    const body = await collectBody(req);
    const { list, index, scope, projectPath } = JSON.parse(body);
    if (!list || typeof index !== 'number') {
      jsonError(res, 'Missing "list" or "index"', 400);
      return;
    }
    adapter.deletePermission(list, index, scope || 'global', projectPath);
    json(res, { ok: true });
  } else {
    jsonError(res, 'Method not allowed', 405);
  }
}
