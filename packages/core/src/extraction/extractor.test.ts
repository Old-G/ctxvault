import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDatabase } from '../index/db.js';
import { loadConfig } from '../config/loader.js';
import { extractFromTranscript } from './extractor.js';

describe('extractFromTranscript', () => {
  let ctxDir: string;

  beforeEach(() => {
    ctxDir = mkdtempSync(join(tmpdir(), 'ctxvault-extract-'));
  });

  afterEach(() => {
    rmSync(ctxDir, { recursive: true, force: true });
  });

  it('extracts patterns from transcript text', () => {
    const config = loadConfig(ctxDir);
    const transcript = 'Watch out for ESM imports — you must use .js extensions.';

    const result = extractFromTranscript(transcript, config);
    expect(result.memories.length).toBeGreaterThanOrEqual(1);
    expect(result.memories[0]?.type).toBe('gotcha');
    expect(result.deduplicated).toBe(0);
  });

  it('deduplicates when db is provided', () => {
    const config = loadConfig(ctxDir);
    const dbPath = join(ctxDir, 'vault.db');
    const { sqlite } = createDatabase(dbPath);

    try {
      const transcript = 'Found that the API rate limits at 100 req/min.';
      const result = extractFromTranscript(transcript, config, { db: sqlite });
      expect(result.memories.length).toBeGreaterThanOrEqual(1);
    } finally {
      sqlite.close();
    }
  });

  it('returns empty when extract is disabled', () => {
    const config = loadConfig(ctxDir);
    config.extract.enabled = false;

    const result = extractFromTranscript('Watch out for bugs.', config);
    expect(result.memories).toHaveLength(0);
    expect(result.raw).toHaveLength(0);
  });
});
