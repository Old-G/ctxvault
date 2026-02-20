import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryStore } from '../memory/store.js';
import { createDatabase } from '../index/db.js';
import { syncMemoryToIndex } from '../index/sync.js';
import { deduplicatePatterns } from './dedup.js';
import type { PatternMatch } from './patterns.js';

describe('deduplicatePatterns', () => {
  let ctxDir: string;
  let dbPath: string;

  beforeEach(() => {
    ctxDir = mkdtempSync(join(tmpdir(), 'ctxvault-dedup-'));
    dbPath = join(ctxDir, 'vault.db');
  });

  afterEach(() => {
    rmSync(ctxDir, { recursive: true, force: true });
  });

  it('keeps patterns when no similar memories exist', () => {
    const { sqlite } = createDatabase(dbPath);
    try {
      const patterns: PatternMatch[] = [
        {
          type: 'gotcha',
          summary: 'React useEffect infinite loop with object deps',
          content: 'Using objects as deps causes infinite loops.',
          tags: ['react'],
          confidence: 0.6,
        },
      ];

      const result = deduplicatePatterns(sqlite, patterns);
      expect(result).toHaveLength(1);
    } finally {
      sqlite.close();
    }
  });

  it('filters out patterns that already exist in the index', () => {
    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      // Create existing memories about the same topic
      for (let i = 0; i < 3; i++) {
        const entry = store.create({
          type: 'gotcha',
          summary: `React useEffect infinite loop variant ${String(i + 1)}`,
          content: `Using objects as deps causes infinite loops variant ${String(i + 1)}.`,
          tags: ['react'],
        });
        syncMemoryToIndex(sqlite, entry);
      }

      const patterns: PatternMatch[] = [
        {
          type: 'gotcha',
          summary: 'React useEffect infinite loop with object deps',
          content: 'Same issue about infinite loops.',
          tags: ['react'],
          confidence: 0.6,
        },
      ];

      const result = deduplicatePatterns(sqlite, patterns);
      expect(result).toHaveLength(0);
    } finally {
      sqlite.close();
    }
  });

  it('returns empty for empty input', () => {
    const { sqlite } = createDatabase(dbPath);
    try {
      expect(deduplicatePatterns(sqlite, [])).toHaveLength(0);
    } finally {
      sqlite.close();
    }
  });
});
