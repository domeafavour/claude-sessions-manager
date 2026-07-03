import { Box, Text } from 'ink';
import type { SessionMessage } from '../session-store.js';

function formatTime(ts: number | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Message({ msg }: { msg: SessionMessage }) {
  const label = msg.type === 'user' ? 'user' : 'assistant';
  const color = msg.type === 'user' ? 'green' : 'blue';
  const time = formatTime(msg.timestamp);

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{'  '}</Text>
        <Text color={color}>{`◉ ${label}`}</Text>
        {time && <Text dimColor>{`  ${time}`}</Text>}
      </Box>
      {msg.content.trim() && (
        <Box paddingLeft={4}>
          <Text>{msg.content}</Text>
        </Box>
      )}
    </Box>
  );
}

export function ChatView({ messages }: { messages: SessionMessage[] }) {
  const anyTruncated = messages.some(m => m.truncated);

  return (
    <Box flexDirection="column">
      {messages.map((msg, i) => (
        <Box key={i} flexDirection="column">
          {i > 0 && <Text>{'  '}</Text>}
          <Message msg={msg} />
        </Box>
      ))}

      {anyTruncated && (
        <Box flexDirection="column">
          <Text>{'  '}</Text>
          <Text dimColor>{'  ── Some messages were truncated. Use -n <N> to control depth. ──'}</Text>
        </Box>
      )}
    </Box>
  );
}
