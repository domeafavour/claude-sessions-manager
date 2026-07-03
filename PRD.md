# PRD: `cs` — Claude Session CLI

## Problem Statement

Claude Code stores session data in `~/.claude/` — PIDs, conversation history, per-project `.jsonl` files — but provides no built-in CLI to inspect, query, or clean up this data. Users have to dig around in the filesystem to find session files, check if a session is still running, or see how much disk space old sessions consume. This makes it difficult to understand usage patterns, troubleshoot active sessions, or reclaim disk space from historical session data.

## Solution

A CLI tool (`cs`) that reads from the existing `~/.claude/` data directory and lets users:

- **List** all sessions for any project with a summary table
- **Show** detailed metadata about a single session
- **Tail** recent conversation messages from a session
- **Delete** a single session by ID
- **Prune** old sessions in bulk (by age or count)

The tool operates on the local filesystem only — no server calls, no API integration. It follows the existing filesystem layout that Claude Code already writes to: `~/.claude/sessions/` for active session metadata and `~/.claude/projects/{slug}/` for per-session conversation data.

## User Stories

1. As a developer, I want to list all Claude Code sessions for my current project, so that I can see what sessions exist, when they ran, and whether they're still active.
2. As a developer, I want to list sessions for another project with a `--project` flag, so that I can inspect sessions across any project from any working directory.
3. As a developer, I want to see detailed metadata about a single session (start time, duration, message counts, file size, status), so that I can understand what happened in a session at a glance.
4. As a developer, I want to see the session's assigned name when it's active (e.g., "claude-session-cli"), so that I can identify sessions by their derived project name.
5. As a developer, I want to view the most recent user and assistant messages from a session, so that I can quickly recall what was discussed without opening the full JSONL file.
6. As a developer, I want to control how many messages are shown when tailing a session via `-n`, so that I can get more or less context as needed.
7. As a developer, I want to delete a single session by its ID (or prefix), so that I can clean up specific sessions I no longer need.
8. As a developer, I want the tool to refuse to delete active sessions, so that I don't accidentally corrupt a running Claude Code session.
9. As a developer, I want to preview what would be deleted before running a bulk cleanup, so that I can verify the candidates before committing.
10. As a developer, I want to prune old sessions keeping only the N most recent, so that I can retain recent context while reclaiming disk space.
11. As a developer, I want to prune sessions older than N days, so that I can expire stale sessions based on age.
12. As a developer, I want the CLI to accept session ID prefixes (not just full UUIDs), so that I can type a short identifier instead of a 36-character UUID.
13. As a developer, I want to see session timestamps in my local timezone, so that times are meaningful without mental conversion.
14. As a developer, I want to see file sizes and message counts in the session list, so that I can quickly assess which sessions are large or chatty.

## Implementation Decisions

### Architecture

- **Language:** Node.js/TypeScript, compiled with `tsc` for distribution as a single compressed output.
- **Binary name:** `cs` (alias: `claude-session`), installed globally via `pnpm link --global`.
- **CLI framework:** `commander` — the only external dependency. Provides subcommand parsing, argument validation, and help generation.
- **No chalk / no table libraries:** Node 22's built-in `util.styleText()` handles terminal colors. Tables are manually formatted with fixed-width columns. This avoids 3+ additional dependencies for functionality that is a few lines of code.
- **Build output:** `dist/` via `tsc` — `bin` field in `package.json` points to `./dist/index.js`.

### Data Sources (read-only on ~/.claude/)

| Source | Path | Format | Content |
|--------|------|--------|---------|
| Active session metadata | `~/.claude/sessions/{pid}.json` | JSON per PID | PID, sessionId, cwd, status (busy/waiting), name, startedAt |
| Conversation data | `~/.claude/projects/{slug}/{sessionId}.jsonl` | NDJSON | Full conversation history with user, assistant, system, tool entries |
| Command history | `~/.claude/history.jsonl` | NDJSON | Command log across all sessions (used only for cross-reference) |

**Slug computation:** `computeSlug("/Users/foo/projects/bar")` → `"-Users-foo-projects-bar"` by replacing `/` with `-`. Claude Code uses this convention for the `projects/` subdirectory.

### Session Store Module

The `session-store.ts` module is the single seam for reading and writing session data. It exposes:

- `getProjectSessions(projectPath)` — returns all sessions for a project sorted by most recent
- `getSessionDetails(projectPath, sessionId)` — returns metadata for one session or null
- `readSessionMessages(projectPath, sessionId, count)` — returns last N user/assistant message pairs
- `resolveSessionId(projectPath, prefix)` — matches a prefix against session files for tab-completion-like UX
- `getPruneCandidates(projectPath, options)` — computes which sessions to delete based on keep/age rules
- `deleteSessions(candidates)` — deletes session files and their corresponding `session-env/` directories
- `computeSlug(projectPath)` — path-to-slug conversion

Key behaviors:
- Active sessions (status = "busy" or "waiting") are never eligible for deletion in either `rm` or `prune`
- Messages are read from the end of the file working backward (most recent first)
- Timestamps are ISO 8601 strings in the JSONL; they are parsed to milliseconds via `new Date(ts).getTime()`
- Session names are only available for currently active sessions (stored in `~/.claude/sessions/{pid}.json`)

### Command Design

| Command | Arguments | Options | Description |
|---------|-----------|---------|-------------|
| `list` | | `--project <path>` | Table of sessions: ID, start, duration, name, msgs, size, status |
| `show` | `<session-id>` | `--project <path>` | Full metadata for one session |
| `tail` | `<session-id>` | `-n <count>` (default 10), `--project <path>` | Recent user/assistant messages |
| `rm` | `<session-id>` | `--project <path>` | Delete one session by ID/prefix (rejects active) |
| `prune` | | `--dry-run`, `--keep <N>`, `--older-than <days>`, `--project <path>` | Bulk delete old/inactive sessions |

All sessions that take a `<session-id>` support prefix matching — the tool lists `.jsonl` files in the project directory and finds the first whose filename starts with the given string.

## Testing Decisions

### What makes a good test

- Test external behavior (what the tool tells you about a session), not internal implementation details (how many times `readdirSync` was called)
- Use fixture data on disk (real or synthetic `.jsonl` files) rather than mocking `fs` — the parsing logic is the core complexity
- Pure helper functions (slug computation, timestamp parsing) are tested in isolation with no IO
- Edge cases: empty project directory, malformed JSON lines, session files with only metadata entries (no user/assistant messages), missing timestamps, session IDs that don't exist

### Testing seam

The **session-store** module is the testing seam. All command handlers delegate to it and are thin wrappers. Testing at this level covers the parsing logic, edge cases, and deletion behavior without needing E2E CLI invocation.

### Test structure

```
tests/
├── session-store.test.ts    # Core data layer tests
├── helpers.test.ts          # computeSlug, parseTimestamp, formatDuration
└── fixtures/                # Real/synthetic session files
    ├── simple-session.jsonl
    ├── empty-session.jsonl
    └── malformed.jsonl
```

### Prior art

No existing tests in the project — this is greenfield. Standard Vitest (or Node's built-in `node:test`) with temp directories for fixture-based tests is the natural fit. Use `os.mktempSync` to create a fixture `~/.claude` tree, set up session `.jsonl` files, run the store functions, verify output, then clean up.

### Out of scope

- **API or server integration** — no plans to support remote session inspection or cloud sync
- **Editing sessions** — read-only for content, delete-only for lifecycle. No "edit message" or "inject message" features
- **Metrics collection** — no tracking, analytics, or telemetry built into the CLI
- **Real-time monitoring** — no `watch` or `follow` mode for active sessions
- **Cross-platform authentication** — the tool only reads local filesystem data
- **Graphical UI** — CLI only, no TUI or web interface

## Further Notes

- The project directory (`~/.claude/projects/`) is created lazily by Claude Code — tests must account for projects with no session data returning an empty list rather than erroring
- Session names are derived from the project directory by Claude Code (e.g., a project at `/projects/claude-sessions-manager` gets name `claude-sessions-manager-xx`). The name is only persisted in the active session PID file — once the session ends and the PID file is cleaned up, the name is lost
- The `session-env/` cleanup in `deleteSessions` is best-effort — an occupied or missing directory is silently skipped
- The entire file is read into memory for `readSessionMessages` (marked with a `ponytail:` comment). For 100MB+ session files this could be optimized to a reverse-chunk reader, but typical sessions are 0.1-10 MB and the trade-off is acceptable
