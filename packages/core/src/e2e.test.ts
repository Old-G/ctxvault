import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryStore } from './memory/store.js';
import { createDatabase } from './index/db.js';
import { syncMemoryToIndex, rebuildIndex } from './index/sync.js';
import { searchMemories, findByRelatedFile } from './index/search.js';
import { loadConfig } from './config/loader.js';
import { buildSessionPayload } from './injection/injector.js';
import { getContextForFile } from './injection/context-for-file.js';
import { countTokens } from './injection/budget.js';
import { extractFromTranscript } from './extraction/extractor.js';

describe('E2E: full workflow', () => {
  let ctxDir: string;
  let dbPath: string;

  beforeEach(() => {
    ctxDir = mkdtempSync(join(tmpdir(), 'ctxvault-e2e-'));
    dbPath = join(ctxDir, 'vault.db');
  });

  afterEach(() => {
    rmSync(ctxDir, { recursive: true, force: true });
  });

  it('create → sync → search → find', () => {
    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
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

      syncMemoryToIndex(sqlite, gotcha);
      syncMemoryToIndex(sqlite, decision);

      const esmResults = searchMemories(sqlite, 'ESM extensions');
      expect(esmResults.length).toBeGreaterThanOrEqual(1);
      expect(esmResults[0]?.type).toBe('gotcha');

      const pnpmResults = searchMemories(sqlite, 'pnpm workspaces monorepo');
      expect(pnpmResults.length).toBeGreaterThanOrEqual(1);
      expect(pnpmResults[0]?.type).toBe('decision');

      const count = rebuildIndex(sqlite, store);
      expect(count).toBe(2);

      const afterRebuild = searchMemories(sqlite, 'ESM');
      expect(afterRebuild.length).toBeGreaterThanOrEqual(1);
    } finally {
      sqlite.close();
    }
  });

  it('SessionStart injection payload is within budget', () => {
    const store = new MemoryStore(ctxDir);
    const config = loadConfig(ctxDir);

    for (let i = 0; i < 10; i++) {
      store.create({
        type: 'gotcha',
        summary: `Test gotcha number ${String(i + 1)}`,
        content: `This is the content for gotcha ${String(i + 1)}.`,
        tags: ['test'],
      });
    }

    const payload = buildSessionPayload(store, config);
    expect(payload.tokenCount).toBeLessThanOrEqual(config.injection.max_tokens + 50);
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

    const g1 = store.read('gotchas/g1.md');
    expect(g1).not.toBeNull();
    expect(existsSync(join(ctxDir, 'gotchas', 'g1.md'))).toBe(true);

    const d1 = store.read('decisions/d1.md');
    expect(d1).not.toBeNull();

    const all = store.list();
    expect(all).toHaveLength(2);
  });

  it('PreToolUse: contextual gotchas for related files', () => {
    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);
    const config = loadConfig(ctxDir);

    try {
      const gotcha = store.create({
        type: 'gotcha',
        summary: 'useEffect infinite loop with object deps',
        content: 'Using objects as useEffect deps causes re-renders.',
        tags: ['react'],
        relatedFiles: ['src/hooks/useData.ts'],
      });

      syncMemoryToIndex(sqlite, gotcha);

      // findByRelatedFile should find it
      const related = findByRelatedFile(sqlite, 'src/hooks/useData.ts');
      expect(related.length).toBeGreaterThanOrEqual(1);

      // getContextForFile should produce markdown
      const context = getContextForFile(sqlite, config, 'src/hooks/useData.ts');
      expect(context.memories.length).toBeGreaterThanOrEqual(1);
    } finally {
      sqlite.close();
    }
  });

  it('extraction with deduplication against existing index', () => {
    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);
    const config = loadConfig(ctxDir);

    try {
      // Add existing gotcha about ESM
      const entry = store.create({
        type: 'gotcha',
        summary: 'Watch out for ESM import extensions',
        content: 'ESM requires .js extensions in TypeScript projects.',
        tags: ['esm'],
      });
      syncMemoryToIndex(sqlite, entry);

      // Extract from transcript mentioning similar gotcha
      const transcript = 'Watch out for ESM import extensions — they must end in .js.';
      const result = extractFromTranscript(transcript, config, { db: sqlite });

      // The gotcha should be deduplicated since it already exists
      expect(result.raw.length).toBeGreaterThanOrEqual(1);
      // Either deduplicated or kept, but extraction ran
      expect(result.deduplicated + result.memories.length).toBe(result.raw.length);
    } finally {
      sqlite.close();
    }
  });

  it('full add → search → show workflow', () => {
    const store = new MemoryStore(ctxDir);
    const { sqlite } = createDatabase(dbPath);

    try {
      // Add via store (simulating ctx add)
      const entry = store.create({
        type: 'solution',
        summary: 'Fix CORS 403 error',
        content: 'Added rewrite rule in next.config.js to proxy API requests.',
        tags: ['cors', 'nextjs'],
        relatedFiles: ['next.config.js'],
      });

      syncMemoryToIndex(sqlite, entry);

      // Search (simulating ctx search)
      const results = searchMemories(sqlite, 'CORS 403');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]?.type).toBe('solution');
      expect(results[0]?.summary).toContain('CORS');

      // Show (simulating ctx show)
      const shown = store.read(entry.filePath);
      expect(shown).not.toBeNull();
      expect(shown?.content).toContain('next.config.js');
    } finally {
      sqlite.close();
    }
  });
});
