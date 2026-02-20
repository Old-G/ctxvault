import { Command } from 'commander';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { MemoryStore, createDatabase, syncMemoryToIndex } from '@ctxvault/core';
import chalk from 'chalk';

export const editCommand = new Command('edit')
  .description('Open a memory file in $EDITOR')
  .argument('<path>', 'Relative path within .ctx (e.g. gotchas/some-issue.md)')
  .action((relPath: string) => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const absPath = join(ctxDir, relPath);

    if (!existsSync(absPath)) {
      console.log(chalk.red(`Not found: ${relPath}`));
      process.exitCode = 1;
      return;
    }

    const editor = process.env.EDITOR ?? process.env.VISUAL ?? 'vi';

    try {
      execSync(`${editor} "${absPath}"`, { stdio: 'inherit' });
    } catch {
      console.log(chalk.red('Editor exited with error.'));
      process.exitCode = 1;
      return;
    }

    // Re-sync to index after editing
    const store = new MemoryStore(ctxDir);
    const entry = store.read(relPath);
    if (entry) {
      const dbPath = join(ctxDir, 'vault.db');
      try {
        const { sqlite } = createDatabase(dbPath);
        syncMemoryToIndex(sqlite, entry);
        sqlite.close();
        console.log(chalk.green(`Synced: ${relPath}`));
      } catch {
        // Index not initialized, skip
      }
    }
  });
