import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryStore } from './store.js';

describe('MemoryStore', () => {
  let ctxDir: string;
  let store: MemoryStore;

  beforeEach(() => {
    ctxDir = mkdtempSync(join(tmpdir(), 'ctxvault-test-'));
    store = new MemoryStore(ctxDir);
  });

  afterEach(() => {
    rmSync(ctxDir, { recursive: true, force: true });
  });

  it('creates a memory entry and reads it back', () => {
    const entry = store.create({
      type: 'gotcha',
      summary: 'Test gotcha entry',
      content: 'This is a test gotcha.',
      tags: ['test', 'gotcha'],
    });

    expect(entry.type).toBe('gotcha');
    expect(entry.summary).toBe('Test gotcha entry');
    expect(entry.filePath).toMatch(/^gotchas\/test-gotcha-entry\.md$/);

    const read = store.read(entry.filePath);
    expect(read).not.toBeNull();
    expect(read?.summary).toBe('Test gotcha entry');
    expect(read?.content).toBe('This is a test gotcha.');
    expect(read?.tags).toEqual(['test', 'gotcha']);
  });

  it('updates a memory entry', () => {
    const entry = store.create({
      type: 'decision',
      summary: 'Use SQLite',
      content: 'We decided to use SQLite for indexing.',
      tags: ['db'],
    });

    const updated = store.update(entry.filePath, {
      content: 'We decided to use SQLite with FTS5.',
      tags: ['db', 'fts5'],
    });

    expect(updated).not.toBeNull();
    expect(updated?.content).toBe('We decided to use SQLite with FTS5.');
    expect(updated?.tags).toEqual(['db', 'fts5']);
  });

  it('deletes a memory entry', () => {
    const entry = store.create({
      type: 'solution',
      summary: 'Fix import paths',
      content: 'Add .js extension to all imports.',
      tags: ['esm'],
    });

    expect(store.delete(entry.filePath)).toBe(true);
    expect(store.read(entry.filePath)).toBeNull();
    expect(store.delete(entry.filePath)).toBe(false);
  });

  it('lists memories filtered by type', () => {
    store.create({ type: 'gotcha', summary: 'G1', content: 'c', tags: [] });
    store.create({ type: 'decision', summary: 'D1', content: 'c', tags: [] });
    store.create({ type: 'gotcha', summary: 'G2', content: 'c', tags: [] });

    const gotchas = store.list({ type: 'gotcha' });
    expect(gotchas).toHaveLength(2);
    expect(gotchas.every((e) => e.type === 'gotcha')).toBe(true);

    const all = store.list();
    expect(all).toHaveLength(3);
  });

  it('lists with limit and sorting', () => {
    store.create({ type: 'gotcha', summary: 'First', content: 'c', tags: [] });
    store.create({ type: 'gotcha', summary: 'Second', content: 'c', tags: [] });
    store.create({ type: 'gotcha', summary: 'Third', content: 'c', tags: [] });

    const limited = store.list({ limit: 2 });
    expect(limited).toHaveLength(2);
  });
});
