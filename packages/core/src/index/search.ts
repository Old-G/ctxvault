import type Database from 'better-sqlite3';
import type { MemoryEntry } from '../memory/types.js';

export interface SearchResult extends MemoryEntry {
  rank: number;
}

export function searchMemories(
  db: Database.Database,
  query: string,
  options?: { type?: string; limit?: number },
): SearchResult[] {
  const limit = options?.limit ?? 10;

  let sql = `
    SELECT
      m.*,
      bm25(memories_fts, 5.0, 1.0, 2.0) AS rank
    FROM memories_fts
    JOIN memories m ON m.rowid = memories_fts.rowid
    WHERE memories_fts MATCH ?
  `;
  const params: unknown[] = [query];

  if (options?.type) {
    sql += ' AND m.type = ?';
    params.push(options.type);
  }

  sql += ' ORDER BY rank LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    type: row.type as MemoryEntry['type'],
    filePath: row.file_path as string,
    summary: row.summary as string,
    content: row.content as string,
    tags: row.tags ? (JSON.parse(row.tags as string) as string[]) : [],
    relevance: row.relevance as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    sourceAgent: row.source_agent as string | undefined,
    sourceSession: row.source_session as string | undefined,
    relatedFiles: [],
    accessCount: row.access_count as number,
    lastAccessed: row.last_accessed as string | undefined,
    rank: row.rank as number,
  }));
}

export function findByRelatedFile(
  db: Database.Database,
  filePath: string,
  options?: { types?: string[]; limit?: number },
): SearchResult[] {
  const types = options?.types ?? ['gotcha', 'solution'];
  const limit = options?.limit ?? 5;
  const placeholders = types.map(() => '?').join(',');

  const sql = `
    SELECT m.*, 0.0 AS rank
    FROM file_relations fr
    JOIN memories m ON m.id = fr.memory_id
    WHERE fr.file_path = ?
      AND m.type IN (${placeholders})
    ORDER BY m.relevance DESC
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(filePath, ...types, limit) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    type: row.type as MemoryEntry['type'],
    filePath: row.file_path as string,
    summary: row.summary as string,
    content: row.content as string,
    tags: row.tags ? (JSON.parse(row.tags as string) as string[]) : [],
    relevance: row.relevance as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    sourceAgent: row.source_agent as string | undefined,
    sourceSession: row.source_session as string | undefined,
    relatedFiles: [],
    accessCount: row.access_count as number,
    lastAccessed: row.last_accessed as string | undefined,
    rank: row.rank as number,
  }));
}
