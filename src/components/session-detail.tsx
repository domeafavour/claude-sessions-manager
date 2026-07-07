import { Box, Text } from 'ink';
import type { SessionInfo } from '../session-store.js';
import { formatDate, formatDuration, formatSize } from '../format.js';

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
        <Text>{formatDate(session.startedAt)}</Text>
      </Box>
      <Box>
        <Text>{'  '}</Text>
        <Box width={14}><Text bold>Updated</Text></Box>
        <Text>{formatDate(session.updatedAt)}</Text>
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
