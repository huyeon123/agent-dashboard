import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { setCorsHeaders, getPathname, jsonError } from './helpers';
import { handleInstructions } from './routes/instructions';
import { handleSettings } from './routes/settings';
import { handleSkills } from './routes/skills';
import { handleRules } from './routes/rules';
import { handleHooks } from './routes/hooks';
import { handleAgentsDef } from './routes/agents-def';
import { handleConnectors } from './routes/connectors';
import { handlePlugins } from './routes/plugins';
import { handlePermissions } from './routes/permissions';
import { handleProjects } from './routes/projects';
import { handleAgentTypes } from './routes/agent-types';
import { handleSystem } from './routes/system';
import { handleOverview } from './routes/overview';

export function apiMiddlewarePlugin(): Plugin {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const pathname = getPathname(req.url || '');

        if (!pathname.startsWith('/api/')) {
          next();
          return;
        }

        setCorsHeaders(res);

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        try {
          if (pathname.startsWith('/api/instructions')) {
            await handleInstructions(req, res, pathname);
          } else if (pathname === '/api/rules') {
            await handleRules(req, res);
          } else if (pathname.startsWith('/api/overview')) {
            await handleOverview(req, res, pathname);
          } else if (pathname.startsWith('/api/settings')) {
            await handleSettings(req, res);
          } else if (pathname === '/api/skills') {
            await handleSkills(req, res);
          } else if (pathname.startsWith('/api/hooks')) {
            await handleHooks(req, res, pathname);
          } else if (pathname === '/api/agent-defs') {
            await handleAgentsDef(req, res);
          } else if (pathname.startsWith('/api/connectors')) {
            await handleConnectors(req, res, pathname);
          } else if (pathname.startsWith('/api/plugins')) {
            await handlePlugins(req, res, pathname);
          } else if (pathname === '/api/permissions') {
            await handlePermissions(req, res);
          } else if (pathname.startsWith('/api/projects')) {
            await handleProjects(req, res, pathname);
          } else if (pathname.startsWith('/api/agent-types')) {
            await handleAgentTypes(req, res, pathname);
          } else if (pathname.startsWith('/api/system') || pathname.startsWith('/api/sessions') || pathname.startsWith('/api/session') || pathname === '/api/open-folder') {
            await handleSystem(req, res, pathname);
          } else {
            jsonError(res, 'Not found', 404);
          }
        } catch (err) {
          console.error('API Error:', err);
          jsonError(res, err instanceof Error ? err.message : 'Internal server error', 500);
        }
      });
    },
  };
}
