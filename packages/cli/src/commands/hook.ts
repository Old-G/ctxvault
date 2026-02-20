import { Command } from 'commander';
import { join } from 'node:path';
import {
  loadConfig,
  createDatabase,
  buildSessionPayload,
  getContextForFile,
  extractFromTranscript,
  syncMemoryToIndex,
  MemoryStore,
} from '@ctxvault/core';

export const hookCommand = new Command('hook').description(
  'Hook handlers for AI agent integration',
);

hookCommand
  .command('session-start')
  .description('Generate injection payload for SessionStart hook')
  .action(() => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const config = loadConfig(projectRoot);
    const store = new MemoryStore(ctxDir);

    const payload = buildSessionPayload(store, config);

    if (payload.markdown) {
      process.stdout.write(payload.markdown);
    }
  });

hookCommand
  .command('pre-tool-use')
  .description('Generate contextual injection for PreToolUse hook')
  .argument('<file-path>', 'File being accessed by the agent')
  .action((filePath: string) => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const config = loadConfig(projectRoot);
    const dbPath = join(ctxDir, 'index.db');
    const { sqlite } = createDatabase(dbPath);

    try {
      const context = getContextForFile(sqlite, config, filePath);
      if (context.markdown) {
        process.stdout.write(context.markdown);
      }
    } finally {
      sqlite.close();
    }
  });

hookCommand
  .command('post-tool-use')
  .description('Track file changes after tool use')
  .argument('<file-path>', 'File that was modified')
  .action((filePath: string) => {
    // For now, just log that the file was touched.
    // In the future this will track changes for session analysis.
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const dbPath = join(ctxDir, 'index.db');

    // Ensure the DB exists, but don't fail silently if .ctx not initialized
    try {
      const { sqlite } = createDatabase(dbPath);
      // Record the file access timestamp
      sqlite
        .prepare(
          'UPDATE memories SET access_count = access_count + 1, last_accessed = ? WHERE file_path = ?',
        )
        .run(new Date().toISOString(), filePath);
      sqlite.close();
    } catch {
      // Not initialized yet, silently ignore
    }
  });

hookCommand
  .command('stop')
  .description('Auto-extract memories from session transcript')
  .option('--transcript <text>', 'Session transcript text')
  .action((options: { transcript?: string }) => {
    if (!options.transcript) return;

    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const config = loadConfig(projectRoot);

    const result = extractFromTranscript(options.transcript, config);

    if (result.memories.length === 0) return;

    const store = new MemoryStore(ctxDir);
    const dbPath = join(ctxDir, 'index.db');
    const { sqlite } = createDatabase(dbPath);

    try {
      for (const memory of result.memories) {
        const entry = store.create(memory);
        syncMemoryToIndex(sqlite, entry);
      }
      process.stderr.write(`ctx: extracted ${String(result.memories.length)} memories\n`);
    } finally {
      sqlite.close();
    }
  });
