import type Database from 'better-sqlite3';
import type { Config } from '../config/schema.js';
import type { MemoryStore } from '../memory/store.js';
import type { CreateMemoryInput } from '../memory/types.js';
import { detectPatterns } from '../extraction/patterns.js';
import { deduplicatePatterns } from '../extraction/dedup.js';
import { syncMemoryToIndex } from '../index/sync.js';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ReflectResult {
  created: number;
  deduplicated: number;
  skipped: number;
  memories: CreateMemoryInput[];
}

/**
 * Reflects on session snapshots to extract new memories.
 * Reads .ctx/sessions/snapshot-*.md files and extracts patterns.
 */
export function reflectOnSessions(
  store: MemoryStore,
  db: Database.Database,
  _config: Config,
  options?: { dryRun?: boolean; sessionsDir?: string },
): ReflectResult {
  const sessionsDir = options?.sessionsDir ?? join(store.ctxDir, 'sessions');

  if (!existsSync(sessionsDir)) {
    return { created: 0, deduplicated: 0, skipped: 0, memories: [] };
  }

  const files = readdirSync(sessionsDir)
    .filter((f) => f.startsWith('snapshot-') && f.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, 10);

  if (files.length === 0) {
    return { created: 0, deduplicated: 0, skipped: 0, memories: [] };
  }

  // Combine session content
  let combined = '';
  for (const file of files) {
    const content = readFileSync(join(sessionsDir, file), 'utf-8');
    combined += content + '\n\n';
  }

  // Extract patterns using lightweight regex
  const patterns = detectPatterns(combined);
  const unique = deduplicatePatterns(db, patterns);
  const deduplicated = patterns.length - unique.length;

  if (options?.dryRun) {
    return {
      created: 0,
      deduplicated,
      skipped: files.length,
      memories: unique.map((p) => ({
        type: p.type,
        summary: p.summary,
        content: p.content,
        tags: p.tags,
      })),
    };
  }

  // Create memories
  let created = 0;
  const memories: CreateMemoryInput[] = [];

  for (const pattern of unique) {
    const input: CreateMemoryInput = {
      type: pattern.type,
      summary: pattern.summary,
      content: pattern.content,
      tags: pattern.tags,
      sourceAgent: 'ctxvault-reflect',
    };
    const entry = store.create(input);
    syncMemoryToIndex(db, entry);
    memories.push(input);
    created++;
  }

  return { created, deduplicated, skipped: 0, memories };
}
