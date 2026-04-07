import { execSync } from 'child_process';
import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody } from '../helpers';

export async function handleSystem(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  if (pathname === '/api/system/status' && req.method === 'GET') {
    let cliVersion = 'unknown';
    let desktopInstalled = false;
    let activeSessions = 0;

    try {
      cliVersion = execSync('claude --version 2>/dev/null || echo unknown', { encoding: 'utf-8' }).trim();
    } catch { /* ignore */ }

    try {
      execSync('ls /Applications/Claude.app 2>/dev/null', { encoding: 'utf-8' });
      desktopInstalled = true;
    } catch { /* ignore */ }

    try {
      const ps = execSync('pgrep -f "claude" 2>/dev/null || echo ""', { encoding: 'utf-8' });
      activeSessions = ps.trim().split('\n').filter(Boolean).length;
    } catch { /* ignore */ }

    json(res, { cliVersion, desktopInstalled, activeSessions });
    return;
  }

  if (pathname === '/api/sessions' && req.method === 'GET') {
    try {
      const ps = execSync('ps aux | grep -E "(claude|codex|copilot|opencode)" | grep -v grep 2>/dev/null || echo ""', { encoding: 'utf-8' });
      const sessions = ps.trim().split('\n').filter(Boolean).map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[1], 10),
          cpu: parseFloat(parts[2]) || 0,
          mem: parseFloat(parts[3]) || 0,
          command: parts.slice(10).join(' '),
        };
      });
      json(res, sessions);
    } catch {
      json(res, []);
    }
    return;
  }

  if (pathname === '/api/open-folder' && req.method === 'POST') {
    const body = await collectBody(req);
    const { path: folderPath } = JSON.parse(body);
    try {
      execSync(`open "${folderPath}"`, { encoding: 'utf-8' });
      json(res, { ok: true });
    } catch {
      jsonError(res, 'Failed to open folder', 500);
    }
    return;
  }

  jsonError(res, 'Not found', 404);
}
