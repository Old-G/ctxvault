import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryStore } from './memory/store.js';
import { createDatabase } from './index/db.js';
import { syncMemoryToIndex, rebuildIndex } from './index/sync.js';
import { searchMemories } from './index/search.js';
import { loadConfig } from './config/loader.js';
import { buildSessionPayload } from './injection/injector.js';
import { countTokens } from './injection/budget.js';

describe('E2E: full workflow', () => {
  let ctxDir: string;
  let dbPath: string;

  beforeEach(() => {
    ctxDir = mkdtempSync(join(tmpdir(), 'ctxvault-e2e-'));
    dbPath = join(ctxDir, 'index.db');
  });

  afterEach(() => {
    rmSync(ctxDir, { recursive: true, force: true });
  });

  it('create → sync → search → find', () => {
    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      // Create memories
      const gotcha = store.create({
        type: 'gotcha',
        summary: 'ESM requires .js extensions in imports',
        content: 'TypeScript ESM projects must use .js in relative imports.',
        tags: ['esm', 'typescript'],
      });

      const decision = store.create({
        type: 'decision',
        summary: 'Use pnpm workspaces for monorepo',
        content: 'Chose pnpm over npm/yarn for strict dependency management.',
        tags: ['tooling', 'monorepo'],
      });

      // Sync to index
      syncMemoryToIndex(sqlite, gotcha);
      syncMemoryToIndex(sqlite, decision);

      // Search
      const esmResults = searchMemories(sqlite, 'ESM extensions');
      expect(esmResults.length).toBeGreaterThanOrEqual(1);
      expect(esmResults[0]?.type).toBe('gotcha');

      const pnpmResults = searchMemories(sqlite, 'pnpm workspaces monorepo');
      expect(pnpmResults.length).toBeGreaterThanOrEqual(1);
      expect(pnpmResults[0]?.type).toBe('decision');

      // Rebuild index
      const count = rebuildIndex(sqlite, store);
      expect(count).toBe(2);

      // Verify still searchable after rebuild
      const afterRebuild = searchMemories(sqlite, 'ESM');
      expect(afterRebuild.length).toBeGreaterThanOrEqual(1);
    } finally {
      sqlite.close();
    }
  });

  it('SessionStart injection payload is within budget', () => {
    const store = new MemoryStore(ctxDir);
    const config = loadConfig(ctxDir); // Will use defaults

    // Create several memories
    for (let i = 0; i < 10; i++) {
      store.create({
        type: 'gotcha',
        summary: `Test gotcha number ${String(i + 1)}`,
        content: `This is the content for gotcha ${String(i + 1)}.`,
        tags: ['test'],
      });
    }

    const payload = buildSessionPayload(store, config);
    expect(payload.tokenCount).toBeLessThanOrEqual(config.injection.max_tokens + 50); // Small tolerance for header
    expect(payload.memories.length).toBeGreaterThan(0);

    if (payload.markdown) {
      const actualTokens = countTokens(payload.markdown);
      expect(actualTokens).toBeLessThanOrEqual(config.injection.max_tokens + 50);
    }
  });

  it('list returns correct .md files', () => {
    const store = new MemoryStore(ctxDir);

    store.create({ type: 'gotcha', summary: 'G1', content: 'c1', tags: ['a'] });
    store.create({ type: 'decision', summary: 'D1', content: 'c2', tags: ['b'] });

    // Verify files exist
    const g1 = store.read('gotchas/g1.md');
    expect(g1).not.toBeNull();
    expect(existsSync(join(ctxDir, 'gotchas', 'g1.md'))).toBe(true);

    const d1 = store.read('decisions/d1.md');
    expect(d1).not.toBeNull();

    // List
    const all = store.list();
    expect(all).toHaveLength(2);
  });
});
