import { renderToString } from 'ink';
import { Box, Text } from 'ink';
import { readSessionMessages, resolveSessionId } from '../session-store.js';
import { ChatView } from '../components/chat-view.js';

function TailView({ sessionId, messages }: { sessionId: string; messages: ReturnType<typeof readSessionMessages> }) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text>{'  '}</Text>
        <Text bold>Session  </Text>
        <Text color="cyan">{sessionId}</Text>
        <Text dimColor>{` — last ${messages.length} message(s)`}</Text>
      </Box>
      <Text dimColor>{'  '}{'─'.repeat(55)}</Text>
      <ChatView messages={messages} />
    </Box>
  );
}

export function tailCommand(projectPath: string, sessionId: string, count: number): void {
  const resolved = resolveSessionId(projectPath, sessionId);
  if (!resolved) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  const messages = readSessionMessages(projectPath, resolved, count);

  if (messages.length === 0) {
    console.log(`No messages found for session: ${sessionId}`);
    return;
  }

  const output = renderToString(<TailView sessionId={sessionId} messages={messages} />, { columns: 120 });
  console.log(output);
}
