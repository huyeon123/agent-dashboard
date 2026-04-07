import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
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

  // POST /api/hooks/toggle
  if (pathname === '/api/hooks/toggle' && req.method === 'POST') {
    const body = await collectBody(req);
    const { disabled, scope, projectPath } = JSON.parse(body);
    if (typeof disabled !== 'boolean') {
      jsonError(res, 'Missing "disabled" (boolean)', 400);
      return;
    }
    adapter.toggleAllHooks(disabled, scope || 'global', projectPath);
    json(res, { ok: true });
    return;
  }

  // GET /api/hooks
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
  } else if (pathname === '/api/hooks' && req.method === 'POST') {
    // Add a hook
    const body = await collectBody(req);
    const { event, matcher, hook, scope, projectPath } = JSON.parse(body);
    if (!event || !matcher || !hook) {
      jsonError(res, 'Missing "event", "matcher", or "hook"', 400);
      return;
    }
    adapter.addHook(event, matcher, hook, scope || 'global', projectPath);
    json(res, { ok: true });
  } else if (pathname === '/api/hooks' && req.method === 'PUT') {
    // Update a hook
    const body = await collectBody(req);
    const { event, matcher, hookIndex, hook, scope, projectPath } = JSON.parse(body);
    if (!event || !matcher || typeof hookIndex !== 'number' || !hook) {
      jsonError(res, 'Missing "event", "matcher", "hookIndex", or "hook"', 400);
      return;
    }
    adapter.updateHook(event, matcher, hookIndex, hook, scope || 'global', projectPath);
    json(res, { ok: true });
  } else if (pathname === '/api/hooks' && req.method === 'DELETE') {
    // Delete a hook
    const body = await collectBody(req);
    const { event, matcher, hookIndex, scope, projectPath } = JSON.parse(body);
    if (!event || !matcher || typeof hookIndex !== 'number') {
      jsonError(res, 'Missing "event", "matcher", or "hookIndex"', 400);
      return;
    }
    adapter.deleteHook(event, matcher, hookIndex, scope || 'global', projectPath);
    json(res, { ok: true });
  } else {
    jsonError(res, 'Method not allowed', 405);
  }
}
