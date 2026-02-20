import { Command } from 'commander';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { MemoryStore, MEMORY_TYPES } from '@ctxvault/core';
import chalk from 'chalk';

export const statusCommand = new Command('status')
  .description('Show project memory status')
  .action(() => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');

    if (!existsSync(join(ctxDir, 'config.yaml'))) {
      console.log(chalk.red('CtxVault not initialized. Run `ctx init` first.'));
      process.exitCode = 1;
      return;
    }

    const store = new MemoryStore(ctxDir);
    const all = store.list();

    console.log(chalk.bold('CtxVault Status'));
    console.log(chalk.dim('─'.repeat(40)));

    // Count by type
    const counts = new Map<string, number>();
    for (const type of MEMORY_TYPES) {
      counts.set(type, 0);
    }
    for (const entry of all) {
      counts.set(entry.type, (counts.get(entry.type) ?? 0) + 1);
    }

    console.log(`  Total memories: ${chalk.bold(String(all.length))}`);
    console.log('');
    for (const [type, count] of counts) {
      if (count > 0) {
        console.log(`  ${chalk.cyan(type.padEnd(12))} ${String(count)}`);
      }
    }

    if (all.length === 0) {
      console.log(chalk.dim('  No memories yet. Start adding with `ctx add`.'));
    }

    // Index status
    const dbExists = existsSync(join(ctxDir, 'vault.db'));
    console.log('');
    console.log(
      `  Index: ${dbExists ? chalk.green('exists') : chalk.yellow('not built (run ctx sync)')}`,
    );
  });
