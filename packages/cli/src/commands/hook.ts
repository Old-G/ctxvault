import { Command } from 'commander';
import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  loadConfig,
  createDatabase,
  buildSessionPayload,
  getContextForFile,
  extractFromTranscript,
  extractFromTranscriptAsync,
  syncMemoryToIndex,
  MemoryStore,
  discoverClaudeCodeTranscripts,
  parseClaudeCodeTranscript,
  buildTranscriptText,
} from '@ctxvault/core';

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    // If stdin is a TTY (no piped input), resolve immediately
    if (process.stdin.isTTY) {
      resolve('');
    }
  });
}

function extractFilePathFromStdin(raw: string): string | null {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const toolInput = parsed.tool_input as Record<string, unknown> | undefined;
    if (toolInput && typeof toolInput.file_path === 'string') {
      return toolInput.file_path;
    }
    if (typeof parsed.file_path === 'string') {
      return parsed.file_path;
    }
  } catch {
    return raw.trim() || null;
  }
  return null;
}

export const hookCommand = new Command('hook').description(
  'Hook handlers for AI agent integration',
);

// SessionStart
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

// PreToolUse → context-for-file
hookCommand
  .command('context-for-file')
  .description('Generate contextual injection for PreToolUse hook')
  .argument('[file-path]', 'File being accessed (optional, reads stdin if omitted)')
  .action(async (filePathArg?: string) => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const config = loadConfig(projectRoot);
    const dbPath = join(ctxDir, 'vault.db');

    let filePath = filePathArg;
    if (!filePath) {
      const stdinData = await readStdin();
      filePath = extractFilePathFromStdin(stdinData) ?? undefined;
    }

    if (!filePath) return;

    const { sqlite } = createDatabase(dbPath);
    try {
      const context = getContextForFile(sqlite, config, filePath);
      if (context.markdown) {
        const output = JSON.stringify({
          hookSpecificOutput: {
            additionalContext: context.markdown,
          },
        });
        process.stdout.write(output);
      }
    } finally {
      sqlite.close();
    }
  });

// PostToolUse → track-change
hookCommand
  .command('track-change')
  .description('Track file changes after tool use')
  .argument('[file-path]', 'File that was modified (optional, reads stdin if omitted)')
  .action(async (filePathArg?: string) => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const dbPath = join(ctxDir, 'vault.db');

    let filePath = filePathArg;
    if (!filePath) {
      const stdinData = await readStdin();
      filePath = extractFilePathFromStdin(stdinData) ?? undefined;
    }

    if (!filePath) return;

    try {
      const { sqlite } = createDatabase(dbPath);
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

// PreCompact → snapshot
hookCommand
  .command('snapshot')
  .description('Save memory snapshot before context compaction')
  .action(() => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const config = loadConfig(projectRoot);
    const store = new MemoryStore(ctxDir);

    const payload = buildSessionPayload(store, config);

    if (payload.markdown) {
      const sessionsDir = join(ctxDir, 'sessions');
      mkdirSync(sessionsDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotPath = join(sessionsDir, `snapshot-${timestamp}.md`);
      writeFileSync(snapshotPath, payload.markdown, 'utf-8');
      process.stderr.write(`ctx: snapshot saved to ${snapshotPath}\n`);
    }
  });

// Stop → auto-extract
hookCommand
  .command('auto-extract')
  .description('Auto-extract memories from session transcript')
  .option('--transcript <text>', 'Session transcript text (optional — auto-reads latest session)')
  .action(async (options: { transcript?: string }) => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const config = loadConfig(projectRoot);

    const store = new MemoryStore(ctxDir);
    const dbPath = join(ctxDir, 'vault.db');
    const { sqlite } = createDatabase(dbPath);

    try {
      let transcript = options.transcript;

      // Auto-discover latest Claude Code session transcript
      if (!transcript) {
        const transcripts = discoverClaudeCodeTranscripts(projectRoot);
        if (transcripts.length > 0) {
          const latest = transcripts[transcripts.length - 1];
          const session = parseClaudeCodeTranscript(latest);
          if (session && session.messages.length >= config.extract.min_session_messages) {
            transcript = buildTranscriptText(session);
          }
        }
      }

      if (!transcript) return;

      // Use deep extract (Haiku) if ANTHROPIC_API_KEY is set, otherwise lightweight regex
      const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
      let result;

      if (hasApiKey) {
        result = await extractFromTranscriptAsync(transcript, config, { db: sqlite });
      } else {
        result = extractFromTranscript(transcript, config, { db: sqlite });
      }

      if (result.memories.length === 0) return;

      for (const memory of result.memories) {
        const entry = store.create(memory);
        syncMemoryToIndex(sqlite, entry);
      }

      const mode = hasApiKey ? 'deep' : 'lightweight';
      const msg =
        result.deduplicated > 0
          ? `ctx: extracted ${String(result.memories.length)} memories [${mode}] (${String(result.deduplicated)} duplicates skipped)\n`
          : `ctx: extracted ${String(result.memories.length)} memories [${mode}]\n`;
      process.stderr.write(msg);
    } finally {
      sqlite.close();
    }
  });
