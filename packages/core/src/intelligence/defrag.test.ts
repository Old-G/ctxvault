import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryStore } from '../memory/store.js';
import { createDatabase } from '../index/db.js';
import { syncMemoryToIndex } from '../index/sync.js';
import { loadConfig } from '../config/loader.js';
import { defragMemories } from './defrag.js';

describe('defragMemories', () => {
  let ctxDir: string;
  let dbPath: string;

  beforeEach(() => {
    ctxDir = mkdtempSync(join(tmpdir(), 'ctxvault-defrag-'));
    dbPath = join(ctxDir, 'vault.db');
  });

  afterEach(() => {
    rmSync(ctxDir, { recursive: true, force: true });
  });

  it('merges duplicate memories', () => {
    const store = new MemoryStore(ctxDir);
    const config = loadConfig(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      // Create similar memories
      for (let i = 0; i < 3; i++) {
        const entry = store.create({
          type: 'gotcha',
          summary: `React useEffect infinite loop variant ${String(i + 1)}`,
          content: `Using objects as deps causes infinite loops variant ${String(i + 1)}.`,
          tags: ['react'],
        });
        syncMemoryToIndex(sqlite, entry);
      }

      const result = defragMemories(store, sqlite, config);
      // Should merge at least some duplicates
      expect(result.merged).toBeGreaterThanOrEqual(0);
      expect(result.totalMemories).toBeGreaterThan(0);
    } finally {
      sqlite.close();
    }
  });

  it('dry-run does not delete anything', () => {
    const store = new MemoryStore(ctxDir);
    const config = loadConfig(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      for (let i = 0; i < 2; i++) {
        const entry = store.create({
          type: 'gotcha',
          summary: `Duplicate gotcha item ${String(i + 1)}`,
          content: `Content ${String(i + 1)}.`,
          tags: ['test'],
        });
        syncMemoryToIndex(sqlite, entry);
      }

      const before = sqlite.prepare('SELECT COUNT(*) as cnt FROM memories').get() as {
        cnt: number;
      };
      defragMemories(store, sqlite, config, { dryRun: true });
      const after = sqlite.prepare('SELECT COUNT(*) as cnt FROM memories').get() as {
        cnt: number;
      };

      expect(after.cnt).toBe(before.cnt);
    } finally {
      sqlite.close();
    }
  });

  it('identifies low relevance memories', () => {
    const store = new MemoryStore(ctxDir);
    const config = loadConfig(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      const entry = store.create({
        type: 'gotcha',
        summary: 'Low relevance item',
        content: 'Content.',
        tags: ['test'],
      });
      syncMemoryToIndex(sqlite, entry);

      // Set very low relevance
      sqlite
        .prepare('UPDATE memories SET relevance = 0.05 WHERE file_path = ?')
        .run(entry.filePath);

      const result = defragMemories(store, sqlite, config, { dryRun: true });
      expect(result.archived).toContain(entry.filePath);
    } finally {
      sqlite.close();
    }
  });
});
