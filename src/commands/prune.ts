import { styleText } from 'node:util';
import { getPruneCandidates, deleteSessions, type PruneCandidate } from '../session-store.js';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(ts: number | null): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString();
}

function printDryRun(candidates: PruneCandidate[]): void {
  if (candidates.length === 0) {
    console.log('Nothing to prune.');
    return;
  }

  const totalSize = candidates.reduce((acc, c) => acc + c.fileSize, 0);

  console.log(styleText('bold', `\nWould delete ${candidates.length} session(s) (${formatSize(totalSize)})\n`));
  console.log(styleText('dim', `${'ID'.padEnd(9)} ${'STARTED'.padEnd(12)} ${'SIZE'.padEnd(7)} ${'MSGS'}`));
  console.log(styleText('dim', '─'.repeat(40)));

  for (const c of candidates) {
    const id = c.sessionId.length > 8 ? c.sessionId.slice(0, 8) : c.sessionId;
    const date = formatDate(c.startedAt);
    const size = formatSize(c.fileSize);
    const msgs = String(c.messageCount);
    console.log(`${styleText('red', id.padEnd(9))} ${date.padEnd(12)} ${size.padStart(6)} ${msgs.padStart(4)}`);
  }

  console.log(styleText('dim', `\nRun without --dry-run to delete.`));
}

function printResult(count: number, freedBytes: number): void {
  if (count === 0) {
    console.log('Nothing to prune.');
    return;
  }
  console.log(`Deleted ${count} session(s), freed ${formatSize(freedBytes)}.`);
}

export async function pruneCommand(
  projectPath: string,
  options: { dryRun?: boolean; keep?: number; olderThanDays?: number },
): Promise<void> {
  const candidates = getPruneCandidates(projectPath, {
    keep: options.keep,
    olderThanDays: options.olderThanDays,
  });

  if (options.dryRun) {
    printDryRun(candidates);
    return;
  }

  const freedBytes = await deleteSessions(candidates);
  printResult(candidates.length, freedBytes);
}
