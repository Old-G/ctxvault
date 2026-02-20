import { Command } from 'commander';
import { join } from 'node:path';
import { MemoryStore } from '@ctxvault/core';
import chalk from 'chalk';

export const showCommand = new Command('show')
  .description('Show full contents of a memory entry')
  .argument('<path>', 'Relative path within .ctx (e.g. gotchas/some-issue.md)')
  .action((relPath: string) => {
    const ctxDir = join(process.cwd(), '.ctx');
    const store = new MemoryStore(ctxDir);
    const entry = store.read(relPath);

    if (!entry) {
      console.log(chalk.red(`Not found: ${relPath}`));
      process.exitCode = 1;
      return;
    }

    console.log(chalk.bold(`${entry.type}: ${entry.summary}`));
    console.log(chalk.dim('─'.repeat(60)));
    console.log('');
    console.log(entry.content);
    console.log('');
    console.log(chalk.dim('─'.repeat(60)));
    console.log(`  Type:      ${chalk.cyan(entry.type)}`);
    console.log(`  Tags:      ${entry.tags.join(', ') || chalk.dim('none')}`);
    console.log(`  Relevance: ${String(entry.relevance)}`);
    console.log(`  Created:   ${entry.createdAt}`);
    console.log(`  Updated:   ${entry.updatedAt}`);
    if (entry.relatedFiles.length > 0) {
      console.log(`  Related:   ${entry.relatedFiles.join(', ')}`);
    }
  });
