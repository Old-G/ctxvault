import { Command } from 'commander';
import { join } from 'node:path';
import {
  MemoryStore,
  createDatabase,
  extractFromTranscript,
  syncMemoryToIndex,
  loadConfig,
  discoverClaudeCodeTranscripts,
  parseClaudeCodeTranscript,
  buildTranscriptText,
} from '@ctxvault/core';
import chalk from 'chalk';

export const importCommand = new Command('import')
  .description('Import memories from Claude Code / Codex session history')
  .option('--agent <agent>', 'Agent to import from (claude-code)', 'claude-code')
  .option('--limit <n>', 'Max sessions to process', '5')
  .option('--dry-run', 'Show what would be extracted without saving')
  .action((options: { agent: string; limit: string; dryRun?: boolean }) => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const dbPath = join(ctxDir, 'vault.db');
    const config = loadConfig(ctxDir);

    if (options.dryRun) {
      console.log(chalk.dim('Dry run — no changes will be made.\n'));
    }

    // Discover transcripts
    let transcripts: string[];
    if (options.agent === 'claude-code') {
      transcripts = discoverClaudeCodeTranscripts(projectRoot);
    } else {
      console.log(chalk.red(`Unsupported agent: ${options.agent}`));
      console.log(chalk.dim('Supported: claude-code'));
      process.exitCode = 1;
      return;
    }

    if (transcripts.length === 0) {
      console.log(chalk.dim('No session transcripts found.'));
      return;
    }

    const limit = parseInt(options.limit, 10);
    const toProcess = transcripts.slice(-limit); // latest N

    console.log(
      chalk.bold(
        `Found ${String(transcripts.length)} sessions, processing ${String(toProcess.length)}...\n`,
      ),
    );

    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      let totalCreated = 0;
      let totalDedup = 0;

      for (const file of toProcess) {
        const session = parseClaudeCodeTranscript(file);
        if (!session || session.messages.length < config.extract.min_session_messages) {
          continue;
        }

        const text = buildTranscriptText(session);
        const result = extractFromTranscript(text, config, {
          sourceAgent: session.agent,
          sourceSession: session.sessionId,
          db: sqlite,
        });

        if (result.memories.length === 0) {
          continue;
        }

        console.log(
          chalk.cyan(`Session ${session.sessionId.slice(0, 8)}:`),
          `${String(result.memories.length)} new, ${String(result.deduplicated)} dedup`,
        );

        if (!options.dryRun) {
          for (const mem of result.memories) {
            const entry = store.create(mem);
            syncMemoryToIndex(sqlite, entry);
            totalCreated++;
          }
        } else {
          for (const mem of result.memories) {
            console.log(`  ${chalk.bold(mem.type)} — ${mem.summary}`);
          }
          totalCreated += result.memories.length;
        }

        totalDedup += result.deduplicated;
      }

      console.log(
        chalk.bold(`\nTotal: ${String(totalCreated)} created, ${String(totalDedup)} deduplicated`),
      );
    } finally {
      sqlite.close();
    }
  });
