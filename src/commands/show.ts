import { styleText } from 'node:util';
import { getSessionDetails, resolveSessionId } from '../session-store.js';

function formatDateTime(ts: number | null): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDuration(start: number | null, end: number | null): string {
  if (!start) return '-';
  const to = end ?? Date.now();
  const totalSeconds = Math.round((to - start) / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function showCommand(projectPath: string, sessionId: string): void {
  const resolved = resolveSessionId(projectPath, sessionId);
  if (!resolved) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  const session = getSessionDetails(projectPath, resolved);

  if (!session) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  const label = (s: string) => styleText('bold', s.padEnd(18));

  console.log(styleText('bold', `\nSession: ${styleText('cyan', session.sessionId)}\n`));
  if (session.name) console.log(`${label('Name:')} ${session.name}`);
  console.log(`${label('Started:')} ${formatDateTime(session.startedAt)}`);
  console.log(`${label('Updated:')} ${formatDateTime(session.updatedAt)}`);
  console.log(`${label('Duration:')} ${formatDuration(session.startedAt, session.updatedAt)}`);
  console.log('');

  console.log(`${label('File size:')} ${formatSize(session.fileSize)}`);
  console.log(`${label('Messages:')} ${session.messageCount} total`);
  console.log(`${label('  User:')} ${session.userMessageCount}`);
  console.log(`${label('  Assistant:')} ${session.assistantMessageCount}`);
  console.log('');

  if (session.activePid) {
    console.log(`${label('Status:')} ${styleText('green', session.activeStatus ?? 'active')}`);
    console.log(`${label('PID:')} ${session.activePid}`);
  } else {
    console.log(`${label('Status:')} ${styleText('dim', 'done')}`);
  }

  console.log('');
  console.log(`${label('File:')} ${styleText('dim', session.filePath)}`);
  console.log('');
}
