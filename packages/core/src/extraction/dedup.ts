import type Database from 'better-sqlite3';
import type { PatternMatch } from './patterns.js';

/**
 * Deduplicates extracted patterns against existing memories in the FTS5 index.
 * Returns only patterns that don't have a close match in the database.
 */
export function deduplicatePatterns(
  db: Database.Database,
  patterns: PatternMatch[],
  threshold = 1,
): PatternMatch[] {
  if (patterns.length === 0) return [];

  const unique: PatternMatch[] = [];

  for (const pattern of patterns) {
    // Search FTS5 for similar summaries
    const words = pattern.summary
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 5);
    const query = words.join(' OR ');

    if (!query) {
      unique.push(pattern);
      continue;
    }

    try {
      const rows = db
        .prepare(
          `SELECT COUNT(*) as cnt
           FROM memories_fts
           JOIN memories m ON m.rowid = memories_fts.rowid
           WHERE memories_fts MATCH ?
             AND m.type = ?`,
        )
        .get(query, pattern.type) as { cnt: number } | undefined;

      // If fewer than threshold matches found, it's unique enough
      if (!rows || rows.cnt < threshold) {
        unique.push(pattern);
      }
    } catch {
      // FTS5 query syntax error (e.g. special chars) — keep the pattern
      unique.push(pattern);
    }
  }

  return unique;
}
