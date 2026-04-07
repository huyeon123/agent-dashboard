import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handleInstructions(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found or disabled`, 404);
    return;
  }

  if (pathname === '/api/instructions') {
    if (req.method === 'GET') {
      const data = adapter.getGlobalInstructions();
      json(res, data);
    } else if (req.method === 'PUT') {
      const body = await collectBody(req);
      const parsed = JSON.parse(body);
      adapter.setGlobalInstructions(parsed.raw);
      json(res, { ok: true });
    }
  } else if (pathname === '/api/instructions/project') {
    const projectPath = query.get('path');
    if (!projectPath) {
      jsonError(res, 'Missing "path" parameter', 400);
      return;
    }

    if (req.method === 'GET') {
      const data = adapter.getProjectInstructions(projectPath);
      json(res, data);
    } else if (req.method === 'PUT') {
      const body = await collectBody(req);
      const parsed = JSON.parse(body);
      adapter.setProjectInstructions(projectPath, parsed.raw);
      json(res, { ok: true });
    } else if (req.method === 'DELETE') {
      const ok = adapter.deleteProjectInstructions(projectPath);
      json(res, { ok });
    }
  }
}
