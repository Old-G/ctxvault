import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface DetectedAgent {
  name: string;
  detected: boolean;
  configDir?: string | undefined;
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function detectAgents(projectRoot: string): DetectedAgent[] {
  const agents: DetectedAgent[] = [];

  // Claude Code
  agents.push({
    name: 'claude-code',
    detected: commandExists('claude') || existsSync(join(projectRoot, '.claude')),
    configDir: join(projectRoot, '.claude'),
  });

  // Cursor
  agents.push({
    name: 'cursor',
    detected: commandExists('cursor') || existsSync(join(projectRoot, '.cursor')),
    configDir: join(projectRoot, '.cursor'),
  });

  // Windsurf
  agents.push({
    name: 'windsurf',
    detected: existsSync(join(projectRoot, '.windsurf')),
    configDir: join(projectRoot, '.windsurf'),
  });

  // Codex
  agents.push({
    name: 'codex',
    detected: commandExists('codex'),
  });

  return agents;
}
