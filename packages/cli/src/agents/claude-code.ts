import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

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

function buildHooks(): Record<string, ClaudeHookGroup[]> {
  return {
    SessionStart: [
      {
        hooks: [
          {
            type: 'command',
            command: 'ctx hook session-start',
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
            command: 'ctx hook context-for-file',
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
            command: 'ctx hook track-change',
          },
        ],
      },
    ],
    PreCompact: [
      {
        hooks: [
          {
            type: 'command',
            command: 'ctx hook snapshot',
          },
        ],
      },
    ],
    Stop: [
      {
        hooks: [
          {
            type: 'command',
            command: 'ctx hook auto-extract',
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

  settings.hooks = { ...settings.hooks, ...buildHooks() };

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

  return actions;
}
