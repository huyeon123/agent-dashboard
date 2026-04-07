import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handleOverview(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  if (req.method !== 'GET') {
    jsonError(res, 'Method not allowed', 405);
    return;
  }

  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found`, 404);
    return;
  }

  if (pathname === '/api/overview/instruction-files') {
    const scope = query.get('scope') || 'global';
    const projectPath = query.get('path');

    if (scope === 'project') {
      if (!projectPath) {
        jsonError(res, 'Missing "path" parameter', 400);
        return;
      }
      json(res, adapter.checkProjectInstructionFiles(decodeURIComponent(projectPath)));
      return;
    }
    json(res, adapter.checkGlobalInstructionFiles());

  } else if (pathname === '/api/overview/rules') {
    const scope = query.get('scope') || 'global';
    const projectPath = query.get('path');

    if (scope === 'project') {
      if (!projectPath) {
        jsonError(res, 'Missing "path" parameter', 400);
        return;
      }
      json(res, adapter.getProjectRulesCount(decodeURIComponent(projectPath)));
      return;
    }
    json(res, adapter.getGlobalRulesCount());

  } else {
    jsonError(res, 'Not found', 404);
  }
}
