import { Command } from 'commander';
import { join } from 'node:path';
import { MemoryStore, createDatabase, reflectOnSessions, loadConfig } from '@ctxvault/core';
import chalk from 'chalk';

export const reflectCommand = new Command('reflect')
  .description('Analyze session snapshots and extract new memories')
  .option('--dry-run', 'Show what would be extracted without saving')
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

      const result = reflectOnSessions(store, sqlite, config, {
        ...(options.dryRun !== undefined && { dryRun: options.dryRun }),
      });

      console.log(chalk.bold('Reflect results:'));
      console.log(`  Created:       ${String(result.created)}`);
      console.log(`  Deduplicated:  ${String(result.deduplicated)}`);

      if (result.memories.length > 0) {
        console.log(chalk.cyan('\nExtracted memories:'));
        for (const mem of result.memories) {
          console.log(`  ${chalk.bold(mem.type)} — ${mem.summary}`);
        }
      } else {
        console.log(chalk.dim('\nNo new memories found in session snapshots.'));
      }
    } finally {
      sqlite.close();
    }
  });
