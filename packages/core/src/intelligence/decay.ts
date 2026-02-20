import type Database from 'better-sqlite3';
import type { Config } from '../config/schema.js';
import type { MemoryStore } from '../memory/store.js';

export interface DecayResult {
  updated: number;
  archived: string[];
  suggestDelete: string[];
}

interface MemoryRow {
  id: string;
  file_path: string;
  type: string;
  relevance: number;
  last_accessed: string | null;
  created_at: string;
}

/**
 * Applies exponential decay to memory relevance scores.
 * relevance(t) = relevance × e^(-lambda × days_since_last_access)
 */
export function applyDecay(db: Database.Database, store: MemoryStore, config: Config): DecayResult {
  if (!config.decay.enabled) {
    return { updated: 0, archived: [], suggestDelete: [] };
  }

  const { lambda, archive_threshold, delete_threshold, delete_min_age_days, pinned_types } =
    config.decay;

  const pinnedSet = new Set(pinned_types);
  const now = Date.now();

  const rows = db
    .prepare('SELECT id, file_path, type, relevance, last_accessed, created_at FROM memories')
    .all() as MemoryRow[];

  const updateStmt = db.prepare('UPDATE memories SET relevance = ? WHERE id = ?');

  let updated = 0;
  const archived: string[] = [];
  const suggestDelete: string[] = [];

  for (const row of rows) {
    if (pinnedSet.has(row.type)) continue;

    const lastAccess = row.last_accessed ?? row.created_at;
    const daysSince = (now - new Date(lastAccess).getTime()) / (1000 * 60 * 60 * 24);
    const newRelevance = Math.max(0, row.relevance * Math.exp(-lambda * daysSince));

    if (Math.abs(newRelevance - row.relevance) < 0.001) continue;

    updateStmt.run(newRelevance, row.id);
    store.update(row.file_path, { relevance: newRelevance });
    updated++;

    if (newRelevance < archive_threshold) {
      archived.push(row.file_path);
    }

    const ageDays = (now - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (newRelevance < delete_threshold && ageDays > delete_min_age_days) {
      suggestDelete.push(row.file_path);
    }
  }

  return { updated, archived, suggestDelete };
}

/**
 * Boosts a memory's relevance score (e.g. on search hit or read).
 */
export function boostRelevance(
  db: Database.Database,
  store: MemoryStore,
  filePath: string,
  amount: number,
): void {
  const row = db.prepare('SELECT id, relevance FROM memories WHERE file_path = ?').get(filePath) as
    | { id: string; relevance: number }
    | undefined;

  if (!row) return;

  const newRelevance = Math.min(1.0, row.relevance + amount);
  const now = new Date().toISOString();

  db.prepare(
    'UPDATE memories SET relevance = ?, last_accessed = ?, access_count = access_count + 1 WHERE id = ?',
  ).run(newRelevance, now, row.id);

  store.update(filePath, { relevance: newRelevance });
}
