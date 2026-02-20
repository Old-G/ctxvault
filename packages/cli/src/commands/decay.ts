import { Command } from 'commander';
import { join } from 'node:path';
import { MemoryStore, createDatabase, applyDecay } from '@ctxvault/core';
import { loadConfig } from '@ctxvault/core';
import chalk from 'chalk';

export const decayCommand = new Command('decay')
  .description('Apply relevance decay to memories')
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

      const result = applyDecay(sqlite, store, config);

      console.log(chalk.bold('Decay results:'));
      console.log(`  Updated:         ${String(result.updated)}`);
      console.log(`  Low relevance:   ${String(result.archived.length)}`);
      console.log(`  Suggest delete:  ${String(result.suggestDelete.length)}`);

      if (result.archived.length > 0) {
        console.log(chalk.yellow('\nLow relevance (< archive threshold):'));
        for (const path of result.archived) {
          console.log(`  ${chalk.dim(path)}`);
        }
      }

      if (result.suggestDelete.length > 0) {
        console.log(chalk.red('\nSuggested for deletion (very low relevance + old):'));
        for (const path of result.suggestDelete) {
          console.log(`  ${chalk.dim(path)}`);
        }
      }
    } finally {
      sqlite.close();
    }
  });
