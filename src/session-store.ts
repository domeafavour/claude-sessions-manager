import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { readdir, readFile, stat, unlink, rmdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

// --- Types ---

export interface SessionInfo {
  sessionId: string;
  filePath: string;
  fileSize: number;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  startedAt: number | null;
  updatedAt: number | null;
  activePid: number | null;
  activeStatus: string | null;
  name: string | null;
}

export interface SessionMessage {
  type: 'user' | 'assistant';
  timestamp: number | null;
  content: string;
  truncated: boolean;
}

export interface PruneCandidate {
  sessionId: string;
  filePath: string;
  fileSize: number;
  startedAt: number | null;
  messageCount: number;
}

// --- Path helpers ---

function claudeDir(): string {
  return join(homedir(), '.claude');
}

function sessionsDir(): string {
  return join(claudeDir(), 'sessions');
}

function projectsDir(): string {
  return join(claudeDir(), 'projects');
}

export function computeSlug(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

function projectDir(projectPath: string): string {
  return join(projectsDir(), computeSlug(projectPath));
}

export function sessionFilePath(projectPath: string, sessionId: string): string {
  return join(projectDir(projectPath), `${sessionId}.jsonl`);
}

// --- Active sessions ---

function parseActiveSessions(): Map<string, { pid: number; status: string; name: string | null }> {
  const map = new Map<string, { pid: number; status: string; name: string | null }>();
  const dir = sessionsDir();
  if (!existsSync(dir)) return map;

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
      if (data.sessionId) {
        map.set(data.sessionId, { pid: data.pid, status: data.status, name: data.name ?? null });
      }
    } catch {
      // skip corrupt files
    }
  }
  return map;
}

// --- Session file parsing ---

function countLines(filePath: string): number {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  return lines.filter(l => l.trim().length > 0).length;
}

function parseTimestamp(ts: unknown): number | null {
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') return new Date(ts).getTime();
  return null;
}

function parseFirstLine(filePath: string): { sessionId: string; startedAt: number | null } {
  const content = readFileSync(filePath, 'utf-8');
  const firstLine = content.split('\n')[0];
  if (!firstLine) return { sessionId: '', startedAt: null };

  try {
    const entry = JSON.parse(firstLine);
    return { sessionId: entry.sessionId ?? '', startedAt: parseTimestamp(entry.timestamp) };
  } catch {
    return { sessionId: '', startedAt: null };
  }
}

function parseTimeRange(
  filePath: string,
): { startedAt: number | null; updatedAt: number | null; userCount: number; assistantCount: number } {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  let startedAt: number | null = null;
  let updatedAt: number | null = null;
  let userCount = 0;
  let assistantCount = 0;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'user' || entry.type === 'assistant') {
        if (entry.type === 'user') userCount++;
        else assistantCount++;

        const ts = parseTimestamp(entry.timestamp);
        if (ts !== null) {
          if (startedAt === null || ts < startedAt) startedAt = ts;
          if (updatedAt === null || ts > updatedAt) updatedAt = ts;
        }
      }
    } catch {
      // skip unparseable lines
    }
  }

  return { startedAt, updatedAt, userCount, assistantCount };
}

// --- Public API ---

export function getProjectSessions(projectPath: string): SessionInfo[] {
  const dir = projectDir(projectPath);
  if (!existsSync(dir)) return [];

  const activeMap = parseActiveSessions();
  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));

  return files.map(file => {
    const filePath = join(dir, file);
    const stats = statSync(filePath);
    const sessionId = file.replace(/\.jsonl$/, '');
    const active = activeMap.get(sessionId);

    // Parse first line for sessionId
    const first = parseFirstLine(filePath);
    // Parse time range
    const range = parseTimeRange(filePath);
    // Count total lines
    const totalLines = countLines(filePath);

    return {
      sessionId,
      filePath,
      fileSize: stats.size,
      messageCount: totalLines,
      userMessageCount: range.userCount,
      assistantMessageCount: range.assistantCount,
      startedAt: range.startedAt ?? first.startedAt,
      updatedAt: range.updatedAt,
      activePid: active?.pid ?? null,
      activeStatus: active?.status ?? null,
      name: active?.name ?? null,
    };
  }).sort((a, b) => (b.updatedAt ?? b.startedAt ?? 0) - (a.updatedAt ?? a.startedAt ?? 0));
}

export function getSessionDetails(
  projectPath: string,
  sessionId: string,
): SessionInfo | null {
  const filePath = sessionFilePath(projectPath, sessionId);
  if (!existsSync(filePath)) return null;

  const stats = statSync(filePath);
  const activeMap = parseActiveSessions();
  const active = activeMap.get(sessionId);
  const range = parseTimeRange(filePath);
  const totalLines = countLines(filePath);

  return {
    sessionId,
    filePath,
    fileSize: stats.size,
    messageCount: totalLines,
    userMessageCount: range.userCount,
    assistantMessageCount: range.assistantCount,
    startedAt: range.startedAt,
    updatedAt: range.updatedAt,
    activePid: active?.pid ?? null,
    activeStatus: active?.status ?? null,
    name: active?.name ?? null,
  };
}

// ponytail: reads entire file — fine for typical sessions (0.1-5 MB).
// For 100MB+ sessions, swap with a reverse-chunk reader.
export function readSessionMessages(
  projectPath: string,
  sessionId: string,
  count: number,
): SessionMessage[] {
  const filePath = sessionFilePath(projectPath, sessionId);
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  const messages: SessionMessage[] = [];

  for (let i = lines.length - 1; i >= 0 && messages.length < count; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type !== 'user' && entry.type !== 'assistant') continue;

      const text = extractText(entry);
      messages.unshift({
        type: entry.type,
        timestamp: entry.timestamp ?? null,
        content: text,
        truncated: text.length > 2000,
      });
    } catch {
      // skip
    }
  }

  return messages;
}

function extractText(entry: Record<string, unknown>): string {
  const msg = entry.message ?? entry.content;

  // Assistant messages: message.content is an array of content blocks
  if (Array.isArray(msg)) {
    return msg
      .map((block: Record<string, unknown>) => {
        if (block.type === 'text') return String(block.text ?? '');
        if (block.type === 'tool_use') return `[tool_use: ${block.name ?? '?'}]`;
        if (block.type === 'tool_result') return '[tool_result]';
        if (block.type === 'thinking') return '';
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  // User messages: content is { content: [{ type: 'text', text: '...' }] }
  if (typeof msg === 'object' && msg !== null) {
    const m = msg as Record<string, unknown>;
    const content = m.content;
    if (Array.isArray(content)) {
      return content
        .map((block: Record<string, unknown>) => {
          if (block.type === 'text') return String(block.text ?? '');
          if (block.type === 'tool_use') return `[tool_use: ${block.name ?? '?'}]`;
          if (block.type === 'tool_result') return '[tool_result]';
          return '';
        })
        .filter(Boolean)
        .join('\n')
        .trim();
    }
    if (typeof content === 'string') return content;
  }

  // Plain string
  if (typeof msg === 'string') return msg;

  // Fallback: if message itself is content array
  if (Array.isArray(entry.content)) {
    return extractText({ message: entry.content });
  }

  return JSON.stringify(msg).slice(0, 500);
}

// --- Prune ---

export function getPruneCandidates(
  projectPath: string,
  options: { keep?: number; olderThanDays?: number },
): PruneCandidate[] {
  const sessions = getProjectSessions(projectPath);

  let candidates = sessions;

  // Never prune active sessions
  candidates = candidates.filter(s => !s.activeStatus);

  if (options.olderThanDays !== undefined) {
    const cutoff = Date.now() - options.olderThanDays * 86400 * 1000;
    candidates = candidates.filter(s => (s.updatedAt ?? s.startedAt ?? Infinity) < cutoff);
  }

  if (options.keep !== undefined && options.keep > 0) {
    // Keep the N most recent sessions (by updatedAt), flag the rest
    const sorted = [...candidates].sort(
      (a, b) => (b.updatedAt ?? b.startedAt ?? 0) - (a.updatedAt ?? a.startedAt ?? 0),
    );
    candidates = sorted.slice(options.keep);
  }

  return candidates.map(s => ({
    sessionId: s.sessionId,
    filePath: s.filePath,
    fileSize: s.fileSize,
    startedAt: s.startedAt,
    messageCount: s.messageCount,
  }));
}

export async function deleteSessions(candidates: PruneCandidate[]): Promise<number> {
  let freed = 0;
  for (const c of candidates) {
    try {
      await unlink(c.filePath);
      freed += c.fileSize;

      // Try to clean up the session-env dir if it exists
      const envDir = join(claudeDir(), 'session-env', c.sessionId);
      try {
        await rmdir(envDir);
      } catch {
        // dir may not exist or may not be empty — skip
      }
    } catch {
      // file may have been deleted already
    }
  }
  return freed;
}

// --- Session ID resolution ---

export function resolveSessionId(projectPath: string, prefix: string): string | null {
  const dir = projectDir(projectPath);
  if (!existsSync(dir)) return null;

  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
  const match = files.find(f => f.startsWith(prefix));
  return match ? match.replace(/\.jsonl$/, '') : null;
}

// --- Listing convenience ---

export function listAllProjects(): string[] {
  const dir = projectsDir();
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter(name => {
      const full = join(dir, name);
      try {
        return statSync(full).isDirectory();
      } catch {
        return false;
      }
    })
    .map(name => {
      // Try to reverse the slug back to a path
      // slug is like "-Users-name-projects-foo" — replace leading dash + dashes with /
      return name.replace(/^-/, '').replace(/-/g, '/');
    })
    .filter(p => p.startsWith('Users/') || p.startsWith('/'));
}
