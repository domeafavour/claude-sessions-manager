import { renderToString } from 'ink';
import { getProjectSessions } from '../session-store.js';
import { SessionTable } from '../components/session-table.js';

export function listCommand(projectPath: string): void {
  const sessions = getProjectSessions(projectPath);

  if (sessions.length === 0) {
    console.log(`No sessions found for project: ${projectPath}`);
    return;
  }

  const output = renderToString(<SessionTable sessions={sessions} />, { columns: 120 });
  console.log(output);
}
