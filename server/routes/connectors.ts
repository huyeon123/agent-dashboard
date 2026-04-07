import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handleConnectors(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found`, 404);
    return;
  }

  // PATCH /api/connectors/toggle
  if (pathname === '/api/connectors/toggle' && req.method === 'PATCH') {
    const body = await collectBody(req);
    const { name, disabled, scope, projectPath } = JSON.parse(body);
    if (!name || typeof disabled !== 'boolean') {
      jsonError(res, 'Missing "name" or "disabled"', 400);
      return;
    }
    adapter.toggleMcpServer(name, disabled, scope || 'global', projectPath);
    json(res, { ok: true });
    return;
  }

  // GET /api/connectors
  if (req.method === 'GET') {
    const scope = query.get('scope') || 'global';
    const projectPath = query.get('path');

    if (scope === 'project') {
      if (!projectPath) { jsonError(res, 'Missing "path" parameter', 400); return; }
      const mcpServers = adapter.getProjectMcpServers(projectPath);
      json(res, { mcpServers });
      return;
    }

    const mcpServers = adapter.getMcpServers();
    json(res, { mcpServers });
  } else if (req.method === 'POST') {
    const body = await collectBody(req);
    const { name, command, args, env, scope, projectPath } = JSON.parse(body);
    if (!name || !command) {
      jsonError(res, 'Missing "name" or "command"', 400);
      return;
    }
    adapter.addMcpServer(
      name,
      command,
      Array.isArray(args) ? args : [],
      env,
      scope || 'global',
      projectPath
    );
    json(res, { ok: true });
  } else if (req.method === 'PUT') {
    const body = await collectBody(req);
    const { name, command, args, env, scope, projectPath } = JSON.parse(body);
    if (!name || !command) {
      jsonError(res, 'Missing "name" or "command"', 400);
      return;
    }
    adapter.updateMcpServer(
      name,
      command,
      Array.isArray(args) ? args : [],
      env,
      scope || 'global',
      projectPath
    );
    json(res, { ok: true });
  } else if (req.method === 'DELETE') {
    const name = query.get('name');
    const scope = query.get('scope') || 'global';
    const projectPath = query.get('path');
    if (!name) {
      jsonError(res, 'Missing "name" parameter', 400);
      return;
    }
    adapter.deleteMcpServer(name, scope as 'global' | 'project', projectPath || undefined);
    json(res, { ok: true });
  } else {
    jsonError(res, 'Method not allowed', 405);
  }
}
