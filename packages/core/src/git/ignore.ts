import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CTX_IGNORE_ENTRIES = [
  '# CtxVault',
  '.ctx/index.db',
  '.ctx/index.db-wal',
  '.ctx/index.db-shm',
];

export function ensureGitignore(projectRoot: string): void {
  const gitignorePath = join(projectRoot, '.gitignore');
  let content = '';

  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, 'utf-8');
  }

  const missing = CTX_IGNORE_ENTRIES.filter((entry) => !content.includes(entry));
  if (missing.length === 0) return;

  const addition = '\n' + missing.join('\n') + '\n';
  writeFileSync(gitignorePath, content + addition, 'utf-8');
}
