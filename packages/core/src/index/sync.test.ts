import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryStore } from '../memory/store.js';
import { createDatabase } from './db.js';
import { syncMemoryToIndex, rebuildIndex } from './sync.js';
import { searchMemories } from './search.js';

describe('sync', () => {
  let ctxDir: string;
  let dbPath: string;

  beforeEach(() => {
    ctxDir = mkdtempSync(join(tmpdir(), 'ctxvault-sync-test-'));
    dbPath = join(ctxDir, 'index.db');
  });

  afterEach(() => {
    rmSync(ctxDir, { recursive: true, force: true });
  });

  it('syncs a memory entry to SQLite and finds it via FTS5', () => {
    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      const entry = store.create({
        type: 'gotcha',
        summary: 'Watch out for circular imports',
        content: 'Barrel files can cause circular import issues in ESM.',
        tags: ['esm', 'imports'],
      });

      syncMemoryToIndex(sqlite, entry);

      const results = searchMemories(sqlite, 'circular imports');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]?.summary).toBe('Watch out for circular imports');
    } finally {
      sqlite.close();
    }
  });

  it('rebuilds full index from .md files', () => {
    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      store.create({
        type: 'decision',
        summary: 'Use SQLite for indexing',
        content: 'SQLite with FTS5 provides fast full-text search.',
        tags: ['db'],
      });
      store.create({
        type: 'solution',
        summary: 'Fix ESM imports',
        content: 'Add .js extension to all relative imports.',
        tags: ['esm'],
      });

      const count = rebuildIndex(sqlite, store);
      expect(count).toBe(2);

      const results = searchMemories(sqlite, 'SQLite');
      expect(results.length).toBeGreaterThanOrEqual(1);
    } finally {
      sqlite.close();
    }
  });
});
