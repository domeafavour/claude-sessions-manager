import { renderToString } from 'ink';
import { getSessionDetails, resolveSessionId } from '../session-store.js';
import { SessionDetail } from '../components/session-detail.js';

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

  const output = renderToString(<SessionDetail session={session} />, { columns: 120 });
  console.log(output);
}
