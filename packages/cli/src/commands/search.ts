import { Command } from 'commander';
import { join } from 'node:path';
import { createDatabase, searchMemories } from '@ctxvault/core';
import chalk from 'chalk';

export const searchCommand = new Command('search')
  .alias('s')
  .description('Full-text search across memories')
  .argument('<query>', 'Search query')
  .option('-t, --type <type>', 'Filter by memory type')
  .option('-l, --limit <n>', 'Maximum results', '10')
  .action((query: string, options: { type?: string; limit: string }) => {
    const ctxDir = join(process.cwd(), '.ctx');
    const dbPath = join(ctxDir, 'index.db');
    const { sqlite } = createDatabase(dbPath);

    try {
      const results = searchMemories(sqlite, query, {
        ...(options.type !== undefined && { type: options.type }),
        limit: parseInt(options.limit, 10),
      });

      if (results.length === 0) {
        console.log(chalk.dim('No results found.'));
        return;
      }

      for (const result of results) {
        const score = chalk.dim(`(${result.rank.toFixed(2)})`);
        console.log(`${chalk.cyan(result.type.padEnd(11))} ${chalk.bold(result.summary)} ${score}`);
        console.log(`  ${chalk.dim(result.filePath)}`);
      }

      console.log(chalk.dim(`\n${String(results.length)} results`));
    } finally {
      sqlite.close();
    }
  });
