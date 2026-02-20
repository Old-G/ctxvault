import { Command } from 'commander';
import { join } from 'node:path';
import { MemoryStore } from '@ctxvault/core';
import chalk from 'chalk';

export const removeCommand = new Command('remove')
  .alias('rm')
  .description('Remove a memory entry by its relative path')
  .argument('<path>', 'Relative path within .ctx (e.g. gotchas/some-issue.md)')
  .action((relPath: string) => {
    const ctxDir = join(process.cwd(), '.ctx');
    const store = new MemoryStore(ctxDir);

    const deleted = store.delete(relPath);
    if (deleted) {
      console.log(chalk.green(`Removed: ${relPath}`));
    } else {
      console.log(chalk.red(`Not found: ${relPath}`));
      process.exitCode = 1;
    }
  });
