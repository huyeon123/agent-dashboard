import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
import { loadRegistry } from '../agents/registry';
import { resolveHome, type AgentConfig } from '../agents/types';

function getAgentConfig(agentType: string) {
  const registry = loadRegistry();
  return registry.agents.find((a) => a.type === agentType) || null;
}

interface ClaudeSessionFile {
  pid: number;
  sessionId?: string;
  cwd?: string;
  startedAt?: number;
  kind?: string;
  name?: string;
}

interface SessionMeta {
  sessionId?: string;
  cwd?: string;
  name?: string;
}

interface LsofSessionInfo {
  cwd?: string;
  sessionFile?: string;
}

function formatStartTime(raw: string): string {
  // macOS Korean locale: "1:58오후" → "오후 1:58", "11:14오전" → "오전 11:14"
  const match = raw.match(/^(\d+:\d+)(오전|오후)$/);
  if (match) return `${match[2]} ${match[1]}`;
  return raw;
}

function readSessionFiles(sessionsDir: string, pids: string[]): Record<string, ClaudeSessionFile> {
  const map: Record<string, ClaudeSessionFile> = {};
  for (const pid of pids) {
    const filePath = path.join(sessionsDir, `${pid}.json`);
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ClaudeSessionFile;
        map[pid] = data;
      }
    } catch { /* ignore */ }
  }
  return map;
}

function isDesktopInstalled(config: AgentConfig | null): boolean {
  if (!config?.desktopApps?.length) return false;
  return config.desktopApps.some((appPath) => fs.existsSync(appPath));
}

function formatCliVersion(raw: string, processName: string): string {
  const line = raw
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1);

  if (!line || line.toLowerCase() === 'unknown') {
    return 'unknown';
  }

  const versionWithNameInParens = line.match(/^v?(\d+(?:\.\d+)+(?:[-+._a-zA-Z0-9]+)?)\s+\((.+)\)$/);
  if (versionWithNameInParens) {
    const [, version, cliName] = versionWithNameInParens;
    return `${cliName} ${version}`;
  }

  const nameThenVersion = line.match(/^(.+?)\s+v?(\d+(?:\.\d+)+(?:[-+._a-zA-Z0-9]+)?)$/);
  if (nameThenVersion) {
    const [, cliName, version] = nameThenVersion;
    return `${cliName} ${version}`;
  }

  const versionOnly = line.match(/^v?(\d+(?:\.\d+)+(?:[-+._a-zA-Z0-9]+)?)$/);
  if (versionOnly) {
    return `${processName} ${versionOnly[1]}`;
  }

  return line;
}

function readSessionMetaForAgent(config: AgentConfig | null, pids: string[]): Record<string, SessionMeta> {
  if (!config || pids.length === 0) return {};

  const globalHome = resolveHome(config.paths.globalHome);
  const sessionsDir = path.join(globalHome, 'sessions');
  const strategy = config.sessionStrategy || 'pid-json';

  if (strategy === 'codex-jsonl') {
    return readCodexSessionMeta(globalHome, sessionsDir, pids);
  }

  const files = readSessionFiles(sessionsDir, pids);
  return Object.fromEntries(
    Object.entries(files).map(([pid, meta]) => [pid, {
      sessionId: meta.sessionId,
      cwd: meta.cwd,
      name: meta.name,
    }]),
  );
}

function readCodexSessionMeta(globalHome: string, sessionsDir: string, pids: string[]): Record<string, SessionMeta> {
  const processMap = readLsofSessionFiles(pids, sessionsDir);
  const partialMap: Record<string, SessionMeta> = {};

  for (const pid of pids) {
    const info = processMap[pid];
    if (!info) continue;

    const meta = info.sessionFile ? readCodexSessionFile(info.sessionFile) : null;
    partialMap[pid] = {
      sessionId: meta?.sessionId,
      cwd: meta?.cwd || info.cwd,
    };
  }

  const sessionIds = Object.values(partialMap)
    .map((meta) => meta.sessionId)
    .filter((sessionId): sessionId is string => !!sessionId);

  const sessionNames = {
    ...readCodexSessionIndex(globalHome),
    ...readCodexThreadTitles(globalHome, sessionIds),
  };

  const map: Record<string, SessionMeta> = {};
  for (const [pid, meta] of Object.entries(partialMap)) {
    map[pid] = {
      ...meta,
      name: meta.sessionId ? sessionNames[meta.sessionId] : undefined,
    };
  }

  return map;
}

function readLsofSessionFiles(pids: string[], sessionsDir: string): Record<string, LsofSessionInfo> {
  if (pids.length === 0) return {};

  try {
    const output = execSync(`lsof -Fn -p ${pids.join(',')} 2>/dev/null || true`, { encoding: 'utf-8' });
    const map: Record<string, LsofSessionInfo> = {};
    let currentPid = '';
    let currentFd = '';

    for (const line of output.split('\n')) {
      if (!line) continue;
      const prefix = line[0];
      const value = line.slice(1);

      if (prefix === 'p') {
        currentPid = value;
        currentFd = '';
        if (!map[currentPid]) map[currentPid] = {};
        continue;
      }

      if (!currentPid) continue;

      if (prefix === 'f') {
        currentFd = value;
        continue;
      }

      if (prefix !== 'n') continue;

      if (currentFd === 'cwd') {
        map[currentPid].cwd = value;
        continue;
      }

      if (!map[currentPid].sessionFile && value.startsWith(sessionsDir) && value.endsWith('.jsonl')) {
        map[currentPid].sessionFile = value;
      }
    }

    return map;
  } catch {
    return {};
  }
}

function readCodexSessionIndex(globalHome: string): Record<string, string> {
  const filePath = path.join(globalHome, 'session_index.jsonl');
  const map: Record<string, string> = {};

  if (!fs.existsSync(filePath)) return map;

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as { id?: string; thread_name?: string };
        if (parsed.id && parsed.thread_name) {
          map[parsed.id] = parsed.thread_name;
        }
      } catch {
        // Ignore malformed JSONL rows.
      }
    }
  } catch {
    return {};
  }

  return map;
}

function readCodexThreadTitles(globalHome: string, sessionIds: string[]): Record<string, string> {
  if (sessionIds.length === 0) return {};

  const filePath = path.join(globalHome, 'state_5.sqlite');
  if (!fs.existsSync(filePath)) return {};

  try {
    const quotedIds = sessionIds
      .map((sessionId) => `'${escapeSqliteLiteral(sessionId)}'`)
      .join(', ');

    const query = `select id, title from threads where id in (${quotedIds});`;
    const output = execSync(`sqlite3 -separator "	" "${filePath}" "${query}"`, { encoding: 'utf-8' });
    const map: Record<string, string> = {};

    for (const line of output.split('\n')) {
      if (!line.trim()) continue;
      const [id, title] = line.split('\t');
      if (id && title) {
        map[id] = title;
      }
    }

    return map;
  } catch {
    return {};
  }
}

function escapeSqliteLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function readFileHead(filePath: string, bytes = 64 * 1024): string {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytes);
    const read = fs.readSync(fd, buffer, 0, bytes, 0);
    return buffer.toString('utf-8', 0, read);
  } finally {
    fs.closeSync(fd);
  }
}

function readCodexSessionFile(filePath: string): SessionMeta | null {
  if (!fs.existsSync(filePath)) return null;

  try {
    const head = readFileHead(filePath);
    for (const line of head.split('\n')) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line) as {
        type?: string;
        payload?: { id?: string; cwd?: string };
      };

      if (parsed.type !== 'session_meta') continue;

      const sessionId = parsed.payload?.id;
      return {
        sessionId,
        cwd: parsed.payload?.cwd,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function handleSystem(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  if (pathname === '/api/system/status' && req.method === 'GET') {
    const query = getQuery(req.url || '');
    const agentType = query.get('agent') || 'claude';
    const config = getAgentConfig(agentType);
    const processName = config?.processName || null;

    let cliVersion = 'unknown';
    let desktopInstalled = false;
    let activeSessions = 0;

    // CLI version
    if (processName) {
      try {
        const rawVersion = execSync(`${processName} --version 2>/dev/null || echo unknown`, { encoding: 'utf-8' }).trim();
        cliVersion = formatCliVersion(rawVersion, processName);
      } catch { /* ignore */ }
    }

    desktopInstalled = isDesktopInstalled(config);

    // Active sessions via pgrep -x (exact binary name match)
    if (processName) {
      try {
        const pids = execSync(`pgrep -x "${processName}" 2>/dev/null || echo ""`, { encoding: 'utf-8' });
        activeSessions = pids.trim().split('\n').filter(Boolean).length;
      } catch { /* ignore */ }
    }

    json(res, { cliVersion, desktopInstalled, activeSessions });
    return;
  }

  if (pathname === '/api/sessions' && req.method === 'GET') {
    const query = getQuery(req.url || '');
    const agentType = query.get('agent') || 'claude';
    const config = getAgentConfig(agentType);
    const processName = config?.processName || null;

    if (!processName) {
      json(res, []);
      return;
    }

    try {
      const pidsRaw = execSync(`pgrep -x "${processName}" 2>/dev/null || echo ""`, { encoding: 'utf-8' });
      const pids = pidsRaw.trim().split('\n').filter(Boolean);

      if (pids.length === 0) {
        json(res, []);
        return;
      }

      const pidList = pids.join(',');
      const ps = execSync(`ps -ww -p ${pidList} -o pid=,pcpu=,pmem=,tty=,start= 2>/dev/null || echo ""`, { encoding: 'utf-8' });

      const sessionFileMap = readSessionMetaForAgent(config, pids);

      const sessions = ps.trim().split('\n').filter(Boolean).map((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[0];
        const meta = sessionFileMap[pid];
        return {
          pid: parseInt(pid, 10),
          cpu: parseFloat(parts[1]) || 0,
          mem: parseFloat(parts[2]) || 0,
          tty: parts[3] || '',
          started: formatStartTime(parts.slice(4).join(' ') || ''),
          cwd: meta?.cwd || '',
          sessionId: meta?.sessionId,
          name: meta?.name,
        };
      });
      json(res, sessions);
    } catch {
      json(res, []);
    }
    return;
  }

  if (pathname === '/api/session/kill' && req.method === 'POST') {
    const body = await collectBody(req);
    const { pid } = JSON.parse(body);
    if (!pid || typeof pid !== 'number') {
      jsonError(res, 'pid required', 400);
      return;
    }
    try {
      execSync(`kill -9 ${pid}`, { encoding: 'utf-8' });
      json(res, { ok: true });
    } catch {
      jsonError(res, `Failed to kill process ${pid}`, 500);
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
