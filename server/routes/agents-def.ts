import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, getQuery } from '../helpers';
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
  } else {
    jsonError(res, 'Not implemented', 501);
  }
}
