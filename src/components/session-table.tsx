import { Box, Text } from 'ink';
import type { SessionInfo } from '../session-store.js';

// --- Column widths ---

const COL = {
  id: 9,
  start: 16,
  dur: 8,
  name: 20,
  msgs: 5,
  size: 7,
  status: 6,
} as const;

// total rendered width = sum(col widths) + 6 gaps of 1 each
const TOTAL = Object.values(COL).reduce((a, b) => a + b, 0) + 6;

// --- Formatting helpers ---

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
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
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

// --- Ink components ---

function Status({ session }: { session: SessionInfo }) {
  if (session.activeStatus === 'busy') return <Text color="green">busy</Text>;
  if (session.activeStatus === 'waiting') return <Text color="yellow">wait</Text>;
  if (session.activeStatus) return <Text color="blue">{session.activeStatus}</Text>;
  return <Text dimColor>done</Text>;
}

export function SessionTable({ sessions }: { sessions: SessionInfo[] }) {
  const totalSize = sessions.reduce((acc, s) => acc + s.fileSize, 0);
  const active = sessions.filter(s => s.activeStatus).length;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box gap={1}>
        <Box width={COL.id}><Text bold>ID</Text></Box>
        <Box width={COL.start}><Text bold>START</Text></Box>
        <Box width={COL.dur}><Text bold>DUR</Text></Box>
        <Box width={COL.name}><Text bold>NAME</Text></Box>
        <Box width={COL.msgs} justifyContent="flex-end"><Text bold>MSGS</Text></Box>
        <Box width={COL.size} justifyContent="flex-end"><Text bold>SIZE</Text></Box>
        <Box width={COL.status}><Text bold>STATUS</Text></Box>
      </Box>
      <Text dimColor>{'─'.repeat(TOTAL)}</Text>

      {/* Rows */}
      {sessions.map(s => (
        <Box key={s.sessionId} gap={1}>
          <Box width={COL.id}><Text color="cyan">{formatSessionId(s.sessionId)}</Text></Box>
          <Box width={COL.start}><Text>{formatDate(s.startedAt)}</Text></Box>
          <Box width={COL.dur}><Text>{formatDuration(s.startedAt, s.updatedAt)}</Text></Box>
          <Box width={COL.name}><Text wrap="truncate">{s.name ?? '-'}</Text></Box>
          <Box width={COL.msgs} justifyContent="flex-end"><Text>{String(s.messageCount)}</Text></Box>
          <Box width={COL.size} justifyContent="flex-end"><Text>{formatSize(s.fileSize)}</Text></Box>
          <Box width={COL.status}><Status session={s} /></Box>
        </Box>
      ))}

      {/* Footer */}
      <Text>{' '}</Text>
      <Text dimColor>{`${sessions.length} session(s) — ${formatSize(totalSize)} total`}</Text>
      {active > 0 && <Text dimColor>{`${active} active`}</Text>}
    </Box>
  );
}
