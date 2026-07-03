import { styleText } from 'node:util';
import { getProjectSessions, type SessionInfo } from '../session-store.js';

function formatDuration(start: number | null, end: number | null): string {
  if (!start) return '-';
  const to = end ?? Date.now();
  const totalSeconds = Math.round((to - start) / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatDate(ts: number | null): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatSessionId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function statusLabel(info: SessionInfo): string {
  if (info.activeStatus === 'busy') return styleText('green', 'busy');
  if (info.activeStatus === 'waiting') return styleText('yellow', 'wait');
  if (info.activeStatus) return styleText('blue', info.activeStatus);
  return styleText('dim', 'done');
}

export function listCommand(projectPath: string): void {
  const sessions = getProjectSessions(projectPath);

  if (sessions.length === 0) {
    console.log(`No sessions found for project: ${projectPath}`);
    return;
  }

  // Header
  console.log(
    styleText('bold', `${'ID'.padEnd(9)}`) +
    styleText('bold', ` ${'START'.padEnd(12)}`) +
    styleText('bold', ` ${'DUR'.padEnd(8)}`) +
    styleText('bold', ` ${'NAME'.padEnd(20)}`) +
    styleText('bold', ` ${'MSGS'.padEnd(5)}`) +
    styleText('bold', ` ${'SIZE'.padEnd(7)}`) +
    styleText('bold', ` ${'STATUS'.padEnd(6)}`),
  );
  console.log(styleText('dim', '─'.repeat(75)));

  for (const s of sessions) {
    const id = formatSessionId(s.sessionId);
    const start = formatDate(s.startedAt);
    const dur = formatDuration(s.startedAt, s.updatedAt);
    const msgs = String(s.messageCount);
    const size = formatSize(s.fileSize);
    const status = statusLabel(s);
    const name = s.name ?? '-';

    console.log(
      `${styleText('cyan', id.padEnd(9))}` +
      ` ${start.padEnd(12)}` +
      ` ${dur.padEnd(8)}` +
      ` ${name.padEnd(20)}` +
      ` ${msgs.padStart(4)} ` +
      ` ${size.padStart(6)}` +
      ` ${status}`,
    );
  }

  const totalSize = sessions.reduce((acc, s) => acc + s.fileSize, 0);
  const active = sessions.filter(s => s.activeStatus).length;
  console.log(styleText('dim', `\n${sessions.length} session(s) — ${formatSize(totalSize)} total`));
  if (active > 0) console.log(styleText('dim', `${active} active`));
}
