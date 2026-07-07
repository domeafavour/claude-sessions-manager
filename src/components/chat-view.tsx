import { Box, Text } from 'ink';
import type { SessionMessage } from '../session-store.js';

function formatTime(ts: number | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const MAX_LINES = 20;

function Message({ msg }: { msg: SessionMessage }) {
  const label = msg.type === 'user' ? 'user' : 'assistant';
  const color = msg.type === 'user' ? 'green' : 'blue';
  const time = formatTime(msg.timestamp);
  const lines = msg.content.trim().split('\n');
  const capped = lines.slice(0, MAX_LINES);
  const truncated = lines.length > MAX_LINES;

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{'  '}</Text>
        <Text color={color}>{`◉ ${label}`}</Text>
        {time && <Text dimColor>{`  ${time}`}</Text>}
      </Box>
      {lines.length > 0 && lines[0] !== '' && (
        <Box paddingLeft={4} flexDirection="column">
          {capped.map((line, i) => <Text key={i}>{line}</Text>)}
          {truncated && <Text dimColor>{'  … (truncated)'}</Text>}
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
