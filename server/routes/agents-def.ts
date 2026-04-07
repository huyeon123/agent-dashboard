import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handleAgentsDef(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found`, 404);
    return;
  }

  if (!adapter.supports.agentDefs) {
    json(res, { unsupported: true, data: [] });
    return;
  }

  if (req.method === 'GET') {
    const scope = query.get('scope') || 'global';
    const projectPath = query.get('path');

    if (scope === 'project') {
      if (!projectPath) { jsonError(res, 'Missing "path" parameter', 400); return; }
      const defs = adapter.getProjectAgentDefs(projectPath);
      json(res, defs);
      return;
    }

    const defs = adapter.getAgentDefs();
    json(res, defs);
  } else if (req.method === 'POST') {
    const body = await collectBody(req);
    const { name, description, model, tools, content, scope, projectPath } = JSON.parse(body);
    if (!name) {
      jsonError(res, 'Missing "name"', 400);
      return;
    }
    adapter.createAgentDef(
      name,
      description || '',
      model || 'unknown',
      Array.isArray(tools) ? tools : [],
      content || '',
      scope || 'global',
      projectPath
    );
    json(res, { ok: true });
  } else if (req.method === 'PUT') {
    const body = await collectBody(req);
    const { path: defPath, name, description, model, tools, content } = JSON.parse(body);
    if (!defPath || !name) {
      jsonError(res, 'Missing "path" or "name"', 400);
      return;
    }
    adapter.updateAgentDef(
      defPath,
      name,
      description || '',
      model || 'unknown',
      Array.isArray(tools) ? tools : [],
      content || ''
    );
    json(res, { ok: true });
  } else if (req.method === 'DELETE') {
    const defPath = query.get('path');
    if (!defPath) {
      jsonError(res, 'Missing "path" parameter', 400);
      return;
    }
    const ok = adapter.deleteAgentDef(defPath);
    json(res, { ok });
  } else {
    jsonError(res, 'Method not allowed', 405);
  }
}
