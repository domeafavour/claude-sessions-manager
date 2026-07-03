import { styleText } from 'node:util';
import { resolveSessionId, getSessionDetails, deleteSessions } from '../session-store.js';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export async function rmCommand(projectPath: string, sessionId: string): Promise<void> {
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

  if (session.activeStatus) {
    console.error(`Cannot delete active session (${resolved}) — it's currently ${session.activeStatus}. Stop it first.`);
    process.exit(1);
  }

  const size = session.fileSize;
  await deleteSessions([{
    sessionId: resolved,
    filePath: session.filePath,
    fileSize: size,
    startedAt: session.startedAt,
    messageCount: session.messageCount,
  }]);

  console.log(`Deleted session ${styleText('cyan', resolved)} (${formatSize(size)}).`);
}
