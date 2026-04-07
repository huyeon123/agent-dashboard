import { useEffect, useState } from 'react';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
import { useAgentStore } from '../../store/agent-store';

interface SystemStatus {
  cliVersion: string;
  desktopInstalled: boolean;
  activeSessions: number;
}

interface Session {
  pid: number;
  cpu: number;
  mem: number;
  tty: string;
  started: string;
  cwd: string;
  sessionId?: string;
  name?: string;
}

export function MonitorPanel() {
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const { data: status, loading: statusLoading, error: statusError, reload: reloadStatus } = useFetch<SystemStatus>(`/api/system/status?agent=${currentAgent}`);
  const { data: sessions, loading: sessionsLoading, error: sessionsError, reload: reloadSessions } = useFetch<Session[]>(`/api/sessions?agent=${currentAgent}`);
  const { toasts, addToast, removeToast } = useToast();
  const [killingPid, setKillingPid] = useState<number | null>(null);

  const reload = () => {
    reloadStatus();
    reloadSessions();
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const id = setInterval(() => {
      reloadStatus();
      reloadSessions();
    }, 10000);
    return () => clearInterval(id);
  }, [reloadStatus, reloadSessions]);

  const handleKill = async (pid: number) => {
    if (!window.confirm(`프로세스 ${pid}를 종료하시겠습니까?`)) return;
    setKillingPid(pid);
    try {
      const res = await fetch('/api/session/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(`프로세스 ${pid} 종료됨`, 'success');
      setTimeout(reload, 500);
    } catch (e) {
      addToast(e instanceof Error ? e.message : '종료 실패', 'error');
    } finally {
      setKillingPid(null);
    }
  };

  const loading = statusLoading || sessionsLoading;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg cursor-pointer ${
              toast.type === 'success'
                ? 'bg-accent-green text-bg-primary'
                : toast.type === 'error'
                ? 'bg-accent-red text-bg-primary'
                : 'bg-accent-blue text-bg-primary'
            }`}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-text-primary">Monitor</h2>
          {loading && (
            <div className="w-4 h-4 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <button
          onClick={reload}
          className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* System status cards */}
      {statusError && (
        <div className="rounded-lg bg-bg-secondary border border-accent-red/30 p-3 text-accent-red text-sm">
          {statusError}
        </div>
      )}

      {status && (
        <div className="grid grid-cols-3 gap-3 shrink-0">
          {/* CLI Version */}
          <div className="rounded-xl bg-bg-secondary border border-border p-4 flex flex-col gap-1">
            <p className="text-xs text-text-muted uppercase tracking-wide">CLI Version</p>
            <p className="text-lg font-mono font-semibold text-text-primary">{status.cliVersion}</p>
          </div>

          {/* Desktop installed */}
          <div className="rounded-xl bg-bg-secondary border border-border p-4 flex flex-col gap-1">
            <p className="text-xs text-text-muted uppercase tracking-wide">Desktop</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${status.desktopInstalled ? 'bg-accent-green' : 'bg-accent-red'}`}
              />
              <span
                className={`text-sm font-medium ${status.desktopInstalled ? 'text-accent-green' : 'text-accent-red'}`}
              >
                {status.desktopInstalled ? '설치됨' : '미설치'}
              </span>
            </div>
          </div>

          {/* Active sessions */}
          <div className="rounded-xl bg-bg-secondary border border-border p-4 flex flex-col gap-1">
            <p className="text-xs text-text-muted uppercase tracking-wide">Active Sessions</p>
            <p className="text-lg font-mono font-semibold text-accent-purple">{status.activeSessions}</p>
          </div>
        </div>
      )}

      {/* Sessions table */}
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <h3 className="text-sm font-semibold text-text-secondary shrink-0">실행 중인 세션</h3>

        {sessionsError && (
          <div className="rounded-lg bg-bg-secondary border border-accent-red/30 p-3 text-accent-red text-sm">
            {sessionsError}
          </div>
        )}

        {!sessionsLoading && !sessionsError && sessions && sessions.length === 0 && (
          <div className="flex items-center justify-center py-10 text-text-muted text-sm">
            실행 중인 세션이 없습니다
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden flex-1">
            <div className="overflow-auto h-full">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-bg-tertiary border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs text-text-muted font-medium w-20">PID</th>
                    <th className="text-left px-4 py-2.5 text-xs text-text-muted font-medium w-24">상태</th>
                    <th className="text-left px-4 py-2.5 text-xs text-text-muted font-medium w-60">세션</th>
                    <th className="text-right px-4 py-2.5 text-xs text-text-muted font-medium w-20">CPU%</th>
                    <th className="text-right px-4 py-2.5 text-xs text-text-muted font-medium w-20">MEM%</th>
                    <th className="text-left px-4 py-2.5 text-xs text-text-muted font-medium w-24">TTY</th>
                    <th className="text-left px-4 py-2.5 text-xs text-text-muted font-medium w-28">시작 시간</th>
                    <th className="text-left px-4 py-2.5 text-xs text-text-muted font-medium">작업 디렉토리</th>
                    <th className="px-4 py-2.5 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr
                      key={session.pid}
                      className="border-b border-border last:border-0 hover:bg-bg-tertiary/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-text-secondary text-xs">{session.pid}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                          실행 중
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-0">
                        {session.sessionId ? (
                          <div className="flex flex-col gap-0.5">
                            {session.name && (
                              <span className="text-xs text-text-primary font-medium truncate block" title={session.name}>
                                {session.name}
                              </span>
                            )}
                            <span className="text-xs font-mono text-text-muted truncate block" title={session.sessionId}>
                              {session.sessionId.slice(0, 8)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        <span
                          className={
                            session.cpu > 50
                              ? 'text-accent-red'
                              : session.cpu > 20
                              ? 'text-accent-yellow'
                              : 'text-text-secondary'
                          }
                        >
                          {session.cpu.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        <span
                          className={
                            session.mem > 50
                              ? 'text-accent-red'
                              : session.mem > 20
                              ? 'text-accent-yellow'
                              : 'text-text-secondary'
                          }
                        >
                          {session.mem.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-text-secondary text-xs">{session.tty}</td>
                      <td className="px-4 py-2.5 font-mono text-text-secondary text-xs">{session.started}</td>
                      <td className="px-4 py-2.5 font-mono text-text-primary text-xs max-w-0">
                        <span className="block truncate" title={session.cwd}>{session.cwd || '-'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleKill(session.pid)}
                          disabled={killingPid === session.pid}
                          className="px-2 py-1 text-xs rounded-md bg-accent-red/15 text-accent-red hover:bg-accent-red/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {killingPid === session.pid ? '...' : '종료'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-text-muted shrink-0">10초마다 자동 새로고침</p>
    </div>
  );
}
