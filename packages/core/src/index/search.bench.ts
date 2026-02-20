import { bench, describe } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryStore } from '../memory/store.js';
import { createDatabase } from './db.js';
import { rebuildIndex } from './sync.js';
import { searchMemories, findByRelatedFile } from './search.js';
import { loadConfig } from '../config/loader.js';
import { buildSessionPayload } from '../injection/injector.js';
import { getContextForFile } from '../injection/context-for-file.js';

const ctxDir = mkdtempSync(join(tmpdir(), 'ctxvault-bench-'));
const dbPath = join(ctxDir, 'index.db');
const store = new MemoryStore(ctxDir);
const { sqlite } = createDatabase(dbPath);

// Seed test data
const types = ['gotcha', 'decision', 'solution', 'discovery'] as const;
for (let i = 0; i < 50; i++) {
  store.create({
    type: types[i % types.length] ?? 'gotcha',
    summary: `Test memory entry number ${String(i + 1)} about ${types[i % types.length] ?? 'gotcha'}`,
    content: `Detailed content for memory ${String(i + 1)}. This is a test entry with enough text to be meaningful.`,
    tags: ['test', `tag-${String(i % 5)}`],
    relatedFiles: [`src/file-${String(i % 10)}.ts`],
  });
}
rebuildIndex(sqlite, store);

const config = loadConfig(ctxDir);

describe('Performance benchmarks', () => {
  bench('FTS5 search (target: < 50ms)', () => {
    searchMemories(sqlite, 'memory test entry');
  });

  bench('findByRelatedFile (PreToolUse lookup)', () => {
    findByRelatedFile(sqlite, 'src/file-3.ts');
  });

  bench('getContextForFile (PreToolUse full, target: < 10ms)', () => {
    getContextForFile(sqlite, config, 'src/file-3.ts');
  });

  bench('buildSessionPayload (SessionStart, target: < 200ms)', () => {
    buildSessionPayload(store, config);
  });
});

// Cleanup after benchmarks
afterAll(() => {
  sqlite.close();
  rmSync(ctxDir, { recursive: true, force: true });
});

function afterAll(fn: () => void) {
  // vitest handles cleanup
  process.on('beforeExit', fn);
}
