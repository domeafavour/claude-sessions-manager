import { Box, Text } from 'ink';
import type { SessionInfo } from '../session-store.js';

function formatDateTime(ts: number | null): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function Status({ session }: { session: SessionInfo }) {
  if (session.activeStatus === 'busy') return <Text color="green">busy</Text>;
  if (session.activeStatus === 'waiting') return <Text color="yellow">wait</Text>;
  if (session.activeStatus) return <Text color="blue">{session.activeStatus}</Text>;
  return <Text dimColor>done</Text>;
}

export function SessionDetail({ session }: { session: SessionInfo }) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>  Session  </Text>
        <Text color="cyan">{session.sessionId}</Text>
      </Box>
      <Text dimColor>{'  '}{'─'.repeat(55)}</Text>

      {session.name && (
        <Box>
          <Text>{'  '}</Text>
          <Box width={14}><Text bold>Name</Text></Box>
          <Text>{session.name}</Text>
        </Box>
      )}

      <Box>
        <Text>{'  '}</Text>
        <Box width={14}><Text bold>Started</Text></Box>
        <Text>{formatDateTime(session.startedAt)}</Text>
      </Box>
      <Box>
        <Text>{'  '}</Text>
        <Box width={14}><Text bold>Updated</Text></Box>
        <Text>{formatDateTime(session.updatedAt)}</Text>
      </Box>
      <Box>
        <Text>{'  '}</Text>
        <Box width={14}><Text bold>Duration</Text></Box>
        <Text>{formatDuration(session.startedAt, session.updatedAt)}</Text>
      </Box>

      <Text>{'  '}</Text>

      <Box>
        <Text>{'  '}</Text>
        <Box width={14}><Text bold>File size</Text></Box>
        <Text>{formatSize(session.fileSize)}</Text>
      </Box>
      <Box>
        <Text>{'  '}</Text>
        <Box width={14}><Text bold>Messages</Text></Box>
        <Text>
          {session.messageCount}{'  ·  '}{session.userMessageCount} user{'  ·  '}{session.assistantMessageCount} assistant
        </Text>
      </Box>

      <Text>{'  '}</Text>

      <Box>
        <Text>{'  '}</Text>
        <Box width={14}><Text bold>Status</Text></Box>
        <Status session={session} />
      </Box>
      <Box>
        <Text>{'  '}</Text>
        <Box width={14}><Text bold>File</Text></Box>
        <Text wrap="truncate">{session.filePath}</Text>
      </Box>
    </Box>
  );
}
