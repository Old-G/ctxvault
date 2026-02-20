import type Database from 'better-sqlite3';
import type { MemoryEntry } from '../memory/types.js';
import { type MemoryStore } from '../memory/store.js';
import { uuidv7 } from '../memory/uuid.js';

export function syncMemoryToIndex(sqlite: Database.Database, entry: MemoryEntry): void {
  const id = entry.id || uuidv7();
  const tags = entry.tags.length > 0 ? JSON.stringify(entry.tags) : null;

  sqlite
    .prepare(
      `INSERT OR REPLACE INTO memories
       (id, type, file_path, summary, content, tags, relevance, created_at, updated_at, source_agent, source_session, access_count, last_accessed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      entry.type,
      entry.filePath,
      entry.summary,
      entry.content,
      tags,
      entry.relevance,
      entry.createdAt,
      entry.updatedAt,
      entry.sourceAgent ?? null,
      entry.sourceSession ?? null,
      entry.accessCount,
      entry.lastAccessed ?? null,
    );

  // Sync file relations
  if (entry.relatedFiles.length > 0) {
    const insertRel = sqlite.prepare(
      'INSERT OR IGNORE INTO file_relations (memory_id, file_path, relation) VALUES (?, ?, ?)',
    );
    for (const file of entry.relatedFiles) {
      insertRel.run(id, file, 'related');
    }
  }
}

export function removeFromIndex(sqlite: Database.Database, filePath: string): void {
  sqlite.prepare('DELETE FROM memories WHERE file_path = ?').run(filePath);
}

export function rebuildIndex(sqlite: Database.Database, store: MemoryStore): number {
  // Clear existing data
  sqlite.exec('DELETE FROM file_relations');
  sqlite.exec('DELETE FROM memories');

  const entries = store.list();
  const insert = sqlite.transaction(() => {
    for (const entry of entries) {
      syncMemoryToIndex(sqlite, { ...entry, id: uuidv7() });
    }
  });
  insert();

  return entries.length;
}
