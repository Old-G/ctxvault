import { Command } from 'commander';
import { join } from 'node:path';
import {
  loadConfig,
  createDatabase,
  buildSessionPayload,
  getContextForFile,
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
      // Output raw markdown for agent consumption
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
