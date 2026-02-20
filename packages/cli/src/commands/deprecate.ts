import { Command } from 'commander';
import { join } from 'node:path';
import { MemoryStore, createDatabase, boostRelevance } from '@ctxvault/core';
import chalk from 'chalk';

export const deprecateCommand = new Command('deprecate')
  .description('Mark a memory as deprecated (reduces relevance by 0.3)')
  .argument('<path>', 'Relative path within .ctx (e.g. gotchas/some-issue.md)')
  .action((relPath: string) => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const dbPath = join(ctxDir, 'vault.db');

    const store = new MemoryStore(ctxDir);
    const entry = store.read(relPath);

    if (!entry) {
      console.log(chalk.red(`Not found: ${relPath}`));
      process.exitCode = 1;
      return;
    }

    const { sqlite } = createDatabase(dbPath);
    try {
      // Negative boost = deprecation
      boostRelevance(sqlite, store, relPath, -0.3);
      const updated = store.read(relPath);
      const newRelevance = updated?.relevance ?? entry.relevance - 0.3;
      console.log(chalk.yellow(`Deprecated: ${relPath}`));
      console.log(`  Relevance: ${String(entry.relevance)} → ${String(newRelevance)}`);
    } finally {
      sqlite.close();
    }
  });
