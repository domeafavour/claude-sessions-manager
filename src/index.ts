#!/usr/bin/env node

import { Command } from 'commander';
import { listCommand } from './commands/list.js';
import { showCommand } from './commands/show.js';
import { tailCommand } from './commands/tail.js';
import { rmCommand } from './commands/rm.js';
import { pruneCommand } from './commands/prune.js';

function resolveProjectPath(project: string | undefined): string {
  if (project) return project;
  return process.cwd();
}

const program = new Command();

program
  .name('cs')
  .description('CLI to manage Claude Code sessions')
  .version('0.1.0');

program
  .command('list')
  .description('List sessions for a project')
  .option('--project <path>', 'Project path (defaults to current directory)')
  .action(opts => {
    const projectPath = resolveProjectPath(opts.project);
    listCommand(projectPath);
  });

program
  .command('show')
  .description('Show details of a session')
  .argument('<session-id>', 'Session ID (full or prefix)')
  .option('--project <path>', 'Project path (defaults to current directory)')
  .action((sessionId: string, opts) => {
    const projectPath = resolveProjectPath(opts.project);
    showCommand(projectPath, sessionId);
  });

program
  .command('tail')
  .description('Show recent messages from a session')
  .argument('<session-id>', 'Session ID (full or prefix)')
  .option('-n, --lines <count>', 'Number of messages to show', '10')
  .option('--project <path>', 'Project path (defaults to current directory)')
  .action((sessionId: string, opts) => {
    const projectPath = resolveProjectPath(opts.project);
    const count = parseInt(opts.lines, 10);
    tailCommand(projectPath, sessionId, isNaN(count) ? 10 : count);
  });

program
  .command('rm')
  .description('Delete a session by ID')
  .argument('<session-id>', 'Session ID (full or prefix)')
  .option('--project <path>', 'Project path (defaults to current directory)')
  .action(async (sessionId: string, opts) => {
    const projectPath = resolveProjectPath(opts.project);
    await rmCommand(projectPath, sessionId);
  });

program
  .command('prune')
  .description('Remove old session data')
  .option('--dry-run', 'Preview what would be deleted without deleting', false)
  .option('--keep <count>', 'Keep the N most recent sessions, delete rest', parseInt)
  .option('--older-than <days>', 'Delete sessions older than N days', parseInt)
  .option('--project <path>', 'Project path (defaults to current directory)')
  .action(async opts => {
    const projectPath = resolveProjectPath(opts.project);
    await pruneCommand(projectPath, opts);
  });

program.parse(process.argv);
