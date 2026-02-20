import type Database from 'better-sqlite3';
import type { Config } from '../config/schema.js';
import type { MemoryStore } from '../memory/store.js';
import { removeFromIndex, rebuildIndex } from '../index/sync.js';

export interface DefragResult {
  merged: number;
  archived: string[];
  totalMemories: number;
}

interface DuplicateRow {
  id: string;
  file_path: string;
  summary: string;
  relevance: number;
  type: string;
}

/**
 * Defrags the memory vault:
 * 1. Finds duplicate memories via FTS5 similarity
 * 2. Merges duplicates (keeps highest relevance)
 * 3. Archives stale memories (relevance < archive_threshold)
 * 4. Rebuilds index
 */
export function defragMemories(
  store: MemoryStore,
  db: Database.Database,
  config: Config,
  options?: { dryRun?: boolean },
): DefragResult {
  const { archive_threshold } = config.decay;

  // Step 1: Find potential duplicates via FTS5
  const allMemories = db
    .prepare('SELECT id, file_path, summary, relevance, type FROM memories ORDER BY relevance DESC')
    .all() as DuplicateRow[];

  const merged = new Set<string>();
  let mergeCount = 0;

  for (const mem of allMemories) {
    if (merged.has(mem.id)) continue;

    // Search for similar memories
    const words = mem.summary
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 5);
    const query = words.join(' OR ');

    if (!query) continue;

    try {
      const similar = db
        .prepare(
          `SELECT m.id, m.file_path, m.summary, m.relevance
           FROM memories_fts
           JOIN memories m ON m.rowid = memories_fts.rowid
           WHERE memories_fts MATCH ?
             AND m.type = ?
             AND m.id != ?`,
        )
        .all(query, mem.type, mem.id) as DuplicateRow[];

      for (const dup of similar) {
        if (merged.has(dup.id)) continue;

        // Check word overlap for actual similarity
        const words1 = new Set(mem.summary.toLowerCase().split(/\s+/));
        const words2 = new Set(dup.summary.toLowerCase().split(/\s+/));
        const intersection = [...words1].filter((w) => words2.has(w));
        const overlap = intersection.length / Math.min(words1.size, words2.size);

        if (overlap >= 0.6) {
          // Merge: keep the one with higher relevance, delete the other
          if (!options?.dryRun) {
            removeFromIndex(db, dup.id);
            store.delete(dup.file_path);
          }
          merged.add(dup.id);
          mergeCount++;
        }
      }
    } catch {
      // FTS5 query error, skip
    }
  }

  // Step 2: Archive stale memories
  const stale = db
    .prepare('SELECT file_path FROM memories WHERE relevance < ?')
    .all(archive_threshold) as { file_path: string }[];

  const archived = stale.map((r) => r.file_path);

  // Step 3: Rebuild index
  if (!options?.dryRun && mergeCount > 0) {
    rebuildIndex(db, store);
  }

  return {
    merged: mergeCount,
    archived,
    totalMemories: allMemories.length - mergeCount,
  };
}
