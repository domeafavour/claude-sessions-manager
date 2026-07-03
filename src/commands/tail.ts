import { styleText } from 'node:util';
import { readSessionMessages, resolveSessionId } from '../session-store.js';

function formatTime(ts: number | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + styleText('dim', '…');
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

  console.log(styleText('bold', `\nSession ${styleText('cyan', sessionId)} — last ${messages.length} message(s)\n`));

  for (const msg of messages) {
    const time = formatTime(msg.timestamp);
    const prefix = msg.type === 'user'
      ? styleText('green', '◉ user')
      : styleText('blue', '◉ assistant');

    const timeStr = time ? styleText('dim', ` ${time}`) : '';
    console.log(`${prefix}${timeStr}`);

    const content = msg.truncated ? truncate(msg.content, 2000) : msg.content;
    const lines = content.split('\n').slice(0, 20); // cap display lines

    for (const line of lines) {
      console.log(`  ${line}`);
    }

    if (content.split('\n').length > 20) {
      console.log(styleText('dim', '  … (truncated)'));
    }

    console.log('');
  }

  const anyTruncated = messages.some(m => m.truncated);
  if (anyTruncated) {
    console.log(styleText('dim', 'Some messages were truncated. Use -n <N> to control depth.'));
  }
}
