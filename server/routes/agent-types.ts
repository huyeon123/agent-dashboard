import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody } from '../helpers';
import { loadRegistry, saveRegistry } from '../agents/registry';

export async function handleAgentTypes(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  if (pathname === '/api/agent-types' && req.method === 'GET') {
    const registry = loadRegistry();
    json(res, registry.agents);
    return;
  }

  if (pathname === '/api/agent-types' && req.method === 'POST') {
    const body = await collectBody(req);
    const input = JSON.parse(body);
    const registry = loadRegistry();

    if (registry.agents.some((a) => a.type === input.type)) {
      jsonError(res, `Agent type "${input.type}" already exists`, 409);
      return;
    }

    registry.agents.push({
      type: input.type,
      displayName: input.displayName || input.type,
      icon: input.icon || 'custom',
      enabled: true,
      builtIn: false,
      paths: input.paths || {},
    });

    saveRegistry(registry);
    json(res, { ok: true });
    return;
  }

  // DELETE /api/agent-types/:type
  const deleteMatch = pathname.match(/^\/api\/agent-types\/(.+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    const type = decodeURIComponent(deleteMatch[1]);
    const registry = loadRegistry();
    const agent = registry.agents.find((a) => a.type === type);

    if (!agent) {
      jsonError(res, 'Agent type not found', 404);
      return;
    }
    if (agent.builtIn) {
      jsonError(res, 'Cannot delete built-in agent type', 400);
      return;
    }

    registry.agents = registry.agents.filter((a) => a.type !== type);
    saveRegistry(registry);
    json(res, { ok: true });
    return;
  }

  // PUT /api/agent-types/:type
  const putMatch = pathname.match(/^\/api\/agent-types\/(.+)$/);
  if (putMatch && req.method === 'PUT') {
    const type = decodeURIComponent(putMatch[1]);
    const body = await collectBody(req);
    const input = JSON.parse(body);
    const registry = loadRegistry();
    const idx = registry.agents.findIndex((a) => a.type === type);

    if (idx === -1) {
      jsonError(res, 'Agent type not found', 404);
      return;
    }

    registry.agents[idx] = { ...registry.agents[idx], ...input };
    saveRegistry(registry);
    json(res, { ok: true });
    return;
  }

  jsonError(res, 'Not found', 404);
}
