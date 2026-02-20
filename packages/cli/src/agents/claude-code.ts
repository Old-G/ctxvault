import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

interface ClaudeHookConfig {
  type: string;
  matcher: string;
  command: string;
}

interface ClaudeSettings {
  hooks?: Record<string, ClaudeHookConfig[]>;
  [key: string]: unknown;
}

function buildHooks(): Record<string, ClaudeHookConfig[]> {
  return {
    SessionStart: [
      {
        type: 'command',
        matcher: '',
        command: 'ctx hook session-start',
      },
    ],
    PreToolUse: [
      {
        type: 'command',
        matcher: 'edit_file|create_file|read_file',
        command: 'ctx hook pre-tool-use "$FILE_PATH"',
      },
    ],
    PostToolUse: [
      {
        type: 'command',
        matcher: 'edit_file|create_file',
        command: 'ctx hook post-tool-use "$FILE_PATH"',
      },
    ],
    Stop: [
      {
        type: 'command',
        matcher: '',
        command: 'ctx hook stop',
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
