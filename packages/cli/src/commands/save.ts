import { Command } from 'commander';
import { join } from 'node:path';
import { MemoryStore, createDatabase, syncMemoryToIndex } from '@ctxvault/core';
import type { MemoryType } from '@ctxvault/core';
import chalk from 'chalk';

export const saveCommand = new Command('save')
  .description('Save a memory entry (non-interactive, for scripts and skill integration)')
  .requiredOption(
    '--type <type>',
    'Memory type (gotcha, decision, solution, discovery, convention)',
  )
  .requiredOption('--summary <summary>', 'One-line summary')
  .requiredOption('--content <content>', 'Full content')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--related-files <files>', 'Comma-separated related file paths')
  .option('--agent <agent>', 'Source agent name')
  .option('--session <session>', 'Source session ID')
  .action(
    (options: {
      type: string;
      summary: string;
      content: string;
      tags?: string;
      relatedFiles?: string;
      agent?: string;
      session?: string;
    }) => {
      const projectRoot = process.cwd();
      const ctxDir = join(projectRoot, '.ctx');

      const store = new MemoryStore(ctxDir);
      const entry = store.create({
        type: options.type as MemoryType,
        summary: options.summary,
        content: options.content,
        tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : [],
        ...(options.relatedFiles !== undefined && {
          relatedFiles: options.relatedFiles.split(',').map((f) => f.trim()),
        }),
        ...(options.agent !== undefined && { sourceAgent: options.agent }),
        ...(options.session !== undefined && { sourceSession: options.session }),
      });

      // Sync to SQLite
      const dbPath = join(ctxDir, 'vault.db');
      try {
        const { sqlite } = createDatabase(dbPath);
        syncMemoryToIndex(sqlite, entry);
        sqlite.close();
      } catch {
        // Index not initialized, skip
      }

      console.log(chalk.green(`Saved: ${entry.filePath}`));
    },
  );
