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
    const plugins = adapter.getPlugins();
    json(res, plugins);
  }
}
