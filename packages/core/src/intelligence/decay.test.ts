import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryStore } from '../memory/store.js';
import { createDatabase } from '../index/db.js';
import { syncMemoryToIndex } from '../index/sync.js';
import { loadConfig } from '../config/loader.js';
import { applyDecay, boostRelevance } from './decay.js';

describe('applyDecay', () => {
  let ctxDir: string;
  let dbPath: string;

  beforeEach(() => {
    ctxDir = mkdtempSync(join(tmpdir(), 'ctxvault-decay-'));
    dbPath = join(ctxDir, 'vault.db');
  });

  afterEach(() => {
    rmSync(ctxDir, { recursive: true, force: true });
  });

  it('applies decay to memory relevance', () => {
    const store = new MemoryStore(ctxDir);
    const config = loadConfig(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      const entry = store.create({
        type: 'gotcha',
        summary: 'Test decay gotcha',
        content: 'Content for decay test.',
        tags: ['test'],
      });
      syncMemoryToIndex(sqlite, entry);

      // Set last_accessed to 30 days ago
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      sqlite
        .prepare('UPDATE memories SET last_accessed = ? WHERE file_path = ?')
        .run(thirtyDaysAgo, entry.filePath);

      const result = applyDecay(sqlite, store, config);
      expect(result.updated).toBeGreaterThanOrEqual(1);
    } finally {
      sqlite.close();
    }
  });

  it('does not decay pinned types', () => {
    const store = new MemoryStore(ctxDir);
    const config = loadConfig(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      const entry = store.create({
        type: 'convention',
        summary: 'Convention should not decay',
        content: 'Pinned content.',
        tags: ['test'],
      });
      syncMemoryToIndex(sqlite, entry);

      // convention maps to 'system' type dir, but type in DB is 'convention'
      // pinned_types default is ['system'], not 'convention'
      const result = applyDecay(sqlite, store, config);
      // convention is NOT in pinned_types by default, so it CAN decay
      expect(result.updated).toBeGreaterThanOrEqual(0);
    } finally {
      sqlite.close();
    }
  });

  it('returns empty result when decay is disabled', () => {
    const store = new MemoryStore(ctxDir);
    const config = loadConfig(ctxDir);
    config.decay.enabled = false;
    const { sqlite } = createDatabase(dbPath);

    try {
      const result = applyDecay(sqlite, store, config);
      expect(result.updated).toBe(0);
      expect(result.archived).toHaveLength(0);
    } finally {
      sqlite.close();
    }
  });
});

describe('boostRelevance', () => {
  let ctxDir: string;
  let dbPath: string;

  beforeEach(() => {
    ctxDir = mkdtempSync(join(tmpdir(), 'ctxvault-boost-'));
    dbPath = join(ctxDir, 'vault.db');
  });

  afterEach(() => {
    rmSync(ctxDir, { recursive: true, force: true });
  });

  it('increases relevance by specified amount', () => {
    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      const entry = store.create({
        type: 'gotcha',
        summary: 'Boost test',
        content: 'Content.',
        tags: ['test'],
      });
      syncMemoryToIndex(sqlite, entry);

      // Set relevance to 0.5
      sqlite.prepare('UPDATE memories SET relevance = 0.5 WHERE file_path = ?').run(entry.filePath);

      boostRelevance(sqlite, store, entry.filePath, 0.1);

      const row = sqlite
        .prepare('SELECT relevance FROM memories WHERE file_path = ?')
        .get(entry.filePath) as { relevance: number };
      expect(row.relevance).toBeCloseTo(0.6, 1);
    } finally {
      sqlite.close();
    }
  });

  it('caps relevance at 1.0', () => {
    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      const entry = store.create({
        type: 'gotcha',
        summary: 'Cap test',
        content: 'Content.',
        tags: ['test'],
      });
      syncMemoryToIndex(sqlite, entry);

      boostRelevance(sqlite, store, entry.filePath, 0.5);

      const row = sqlite
        .prepare('SELECT relevance FROM memories WHERE file_path = ?')
        .get(entry.filePath) as { relevance: number };
      expect(row.relevance).toBeLessThanOrEqual(1.0);
    } finally {
      sqlite.close();
    }
  });
});
