import { Command } from 'commander';
import { join } from 'node:path';
import { MEMORY_TYPES, MemoryStore } from '@ctxvault/core';
import type { MemoryType } from '@ctxvault/core';
import chalk from 'chalk';

export const addCommand = new Command('add')
  .description('Add a new memory entry')
  .argument('<type>', `Memory type (${MEMORY_TYPES.join(', ')})`)
  .argument('<summary>', 'Short summary of the memory')
  .option('-c, --content <text>', 'Memory content (body)')
  .option('-t, --tags <tags>', 'Comma-separated tags', '')
  .option('--related <files>', 'Comma-separated related file paths', '')
  .option('--agent <name>', 'Source agent name')
  .option('--session <id>', 'Source session ID')
  .action(
    (
      type: string,
      summary: string,
      options: {
        content?: string;
        tags: string;
        related: string;
        agent?: string;
        session?: string;
      },
    ) => {
      if (!MEMORY_TYPES.includes(type as MemoryType)) {
        console.error(
          chalk.red(`Invalid type: ${type}. Must be one of: ${MEMORY_TYPES.join(', ')}`),
        );
        process.exitCode = 1;
        return;
      }

      const ctxDir = join(process.cwd(), '.ctx');
      const store = new MemoryStore(ctxDir);

      const tags = options.tags ? options.tags.split(',').map((t) => t.trim()) : [];
      const relatedFiles = options.related
        ? options.related.split(',').map((f) => f.trim())
        : undefined;

      const entry = store.create({
        type: type as MemoryType,
        summary,
        content: options.content ?? summary,
        tags,
        relatedFiles,
        sourceAgent: options.agent,
        sourceSession: options.session,
      });

      console.log(chalk.green(`Memory created: ${entry.filePath}`));
    },
  );
