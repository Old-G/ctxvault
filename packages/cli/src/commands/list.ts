import { Command } from 'commander';
import { join } from 'node:path';
import { MemoryStore } from '@ctxvault/core';
import type { MemoryType } from '@ctxvault/core';
import chalk from 'chalk';

export const listCommand = new Command('list')
  .alias('ls')
  .description('List memory entries')
  .option('-t, --type <type>', 'Filter by memory type')
  .option('-s, --sort <field>', 'Sort by: relevance, created, updated', 'relevance')
  .option('-l, --limit <n>', 'Maximum entries to show', '20')
  .action((options: { type?: string; sort: string; limit: string }) => {
    const ctxDir = join(process.cwd(), '.ctx');
    const store = new MemoryStore(ctxDir);

    const entries = store.list({
      type: options.type as MemoryType | undefined,
      sortBy: options.sort as 'relevance' | 'created' | 'updated',
      limit: parseInt(options.limit, 10),
    });

    if (entries.length === 0) {
      console.log(chalk.dim('No memories found.'));
      return;
    }

    for (const entry of entries) {
      const tags = entry.tags.length > 0 ? chalk.dim(` [${entry.tags.join(', ')}]`) : '';
      console.log(`${chalk.cyan(entry.type.padEnd(11))} ${chalk.bold(entry.summary)}${tags}`);
      console.log(`  ${chalk.dim(entry.filePath)}`);
    }

    console.log(chalk.dim(`\n${String(entries.length)} entries`));
  });
