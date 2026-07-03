# `cs` — Claude Session CLI

CLI to manage [Claude Code](https://claude.ai/code) sessions from the terminal.

## Install

```bash
git clone <this-repo>
cd claude-sessions-manager
pnpm install
pnpm build
pnpm link --global
```

Now `cs` is available anywhere:

```bash
cs --help
```

## Usage

### List sessions for the current project

```bash
cs list
```

```
ID        START        DUR      NAME                 MSGS  SIZE    STATUS
───────────────────────────────────────────────────────────────────────────
1126ec53  01:14 PM     41m      claude-session-cli    543   759KB busy
```

Use `--project` for another project:

```bash
cs list --project /path/to/project
```

### Show session details

```bash
cs show <session-id>
```

Session IDs accept prefix matches — `cs show 1126ec53` will match the full UUID.

### Tail recent conversation

```bash
cs tail <session-id>
cs tail <session-id> -n 20    # last 20 messages (default: 10)
```

Shows the most recent user ↔ assistant message pairs.

### Delete a session

```bash
cs rm <session-id>            # single session (rejects active sessions)
```

### Bulk prune old sessions

```bash
cs prune --dry-run            # preview without deleting
cs prune --keep 5             # keep 5 most recent, delete rest
cs prune --older-than 30      # delete sessions older than 30 days
cs prune --keep 5 --older-than 7   # combine filters
```

Active sessions are never eligible for pruning.

## How it works

`cs` reads directly from `~/.claude/` — the same directory Claude Code writes to:

| Data | Location |
|------|----------|
| Active session metadata | `~/.claude/sessions/{pid}.json` |
| Conversation history | `~/.claude/projects/{slug}/{sessionId}.jsonl` |
| Command history | `~/.claude/history.jsonl` |

No server calls, no API keys — operates entirely on local filesystem data.

## Tech

- **Node.js** 22+ / **TypeScript**
- One dependency: [`commander`](https://www.npmjs.com/package/commander)
- Terminal colors via Node 22's built-in `util.styleText()`
