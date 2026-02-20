import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';

interface ClaudeHookEntry {
  type: string;
  command: string;
}

interface ClaudeHookGroup {
  matcher?: string;
  hooks: ClaudeHookEntry[];
}

interface ClaudeSettings {
  hooks?: Record<string, ClaudeHookGroup[]>;
  [key: string]: unknown;
}

/**
 * Resolves the `ctx` command to use in hooks.
 * Priority: 1) global `ctx` in PATH, 2) absolute `node <path-to-ctx.js>`
 */
function resolveCtxCommand(): string {
  // Check if ctx is globally available
  try {
    execSync('command -v ctx', { stdio: 'pipe' });
    return 'ctx';
  } catch {
    // Not in PATH — use absolute path to current binary
    const ctxBin = resolve(dirname(new URL(import.meta.url).pathname), '../../bin/ctx.js');
    if (existsSync(ctxBin)) {
      return `node ${ctxBin}`;
    }
    // Fallback: try to find via process.argv
    const argv1 = process.argv[1];
    if (argv1?.endsWith('ctx.js')) {
      return `node ${resolve(argv1)}`;
    }
    // Last resort — hope it's in PATH at runtime
    return 'ctx';
  }
}

/**
 * Wraps a command so it sources .ctx/.env first (for ANTHROPIC_API_KEY etc.)
 * The env file is gitignored and contains API keys set during `ctx init`.
 */
function withEnv(command: string): string {
  return `test -f .ctx/.env && export $(cat .ctx/.env | grep -v '^#' | xargs) 2>/dev/null; ${command}`;
}

function buildHooks(ctx: string): Record<string, ClaudeHookGroup[]> {
  return {
    SessionStart: [
      {
        hooks: [
          {
            type: 'command',
            command: withEnv(`${ctx} hook session-start`),
          },
        ],
      },
    ],
    PreToolUse: [
      {
        matcher: 'Edit|MultiEdit|Write',
        hooks: [
          {
            type: 'command',
            command: `${ctx} hook context-for-file`,
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: 'Edit|MultiEdit|Write',
        hooks: [
          {
            type: 'command',
            command: `${ctx} hook track-change`,
          },
        ],
      },
    ],
    PreCompact: [
      {
        hooks: [
          {
            type: 'command',
            command: `${ctx} hook snapshot`,
          },
        ],
      },
    ],
    Stop: [
      {
        hooks: [
          {
            type: 'command',
            command: withEnv(`${ctx} hook auto-extract`),
          },
        ],
      },
    ],
  };
}

export function setupClaudeCode(projectRoot: string): string[] {
  const claudeDir = join(projectRoot, '.claude');
  const settingsPath = join(claudeDir, 'settings.json');
  const actions: string[] = [];

  mkdirSync(claudeDir, { recursive: true });

  let settings: ClaudeSettings = {};
  if (existsSync(settingsPath)) {
    const raw = readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(raw) as ClaudeSettings;
    actions.push('Merged with existing .claude/settings.json');
  } else {
    actions.push('Created .claude/settings.json');
  }

  const ctx = resolveCtxCommand();
  settings.hooks = { ...settings.hooks, ...buildHooks(ctx) };

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

  if (ctx !== 'ctx') {
    actions.push(`Hooks use absolute path: ${ctx}`);
  }

  return actions;
}
