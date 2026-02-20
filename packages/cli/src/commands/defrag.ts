import { Command } from 'commander';
import { join } from 'node:path';
import { MemoryStore, createDatabase, defragMemories, loadConfig } from '@ctxvault/core';
import chalk from 'chalk';

export const defragCommand = new Command('defrag')
  .description('Deduplicate and optimize memory vault')
  .option('--dry-run', 'Show what would change without applying')
  .action((options: { dryRun?: boolean }) => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const dbPath = join(ctxDir, 'vault.db');

    const store = new MemoryStore(ctxDir);
    const config = loadConfig(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      if (options.dryRun) {
        console.log(chalk.dim('Dry run — no changes will be made.\n'));
      }

      const result = defragMemories(store, sqlite, config, {
        ...(options.dryRun !== undefined && { dryRun: options.dryRun }),
      });

      console.log(chalk.bold('Defrag results:'));
      console.log(`  Merged duplicates: ${String(result.merged)}`);
      console.log(`  Low relevance:     ${String(result.archived.length)}`);
      console.log(`  Total memories:    ${String(result.totalMemories)}`);

      if (result.archived.length > 0) {
        console.log(chalk.yellow('\nLow relevance memories:'));
        for (const path of result.archived) {
          console.log(`  ${chalk.dim(path)}`);
        }
      }
    } finally {
      sqlite.close();
    }
  });
