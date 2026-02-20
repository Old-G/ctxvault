import { Command } from 'commander';
import { join } from 'node:path';
import { createDatabase, MemoryStore, rebuildIndex } from '@ctxvault/core';
import chalk from 'chalk';

export const syncCommand = new Command('sync')
  .description('Rebuild SQLite index from .md files')
  .action(() => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const dbPath = join(ctxDir, 'index.db');
    const { sqlite } = createDatabase(dbPath);
    const store = new MemoryStore(ctxDir);

    try {
      const count = rebuildIndex(sqlite, store);
      console.log(chalk.green(`Index rebuilt: ${String(count)} memories indexed`));
    } finally {
      sqlite.close();
    }
  });
