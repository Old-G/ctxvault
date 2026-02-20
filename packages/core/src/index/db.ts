import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { createFtsIndex } from './fts.js';

export type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export function createDatabase(dbPath: string): { db: DbInstance; sqlite: Database.Database } {
  const sqlite = new Database(dbPath);

  // Performance pragmas
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('mmap_size = 268435456');
  sqlite.pragma('cache_size = -64000');
  sqlite.pragma('foreign_keys = ON');

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id             TEXT PRIMARY KEY,
      type           TEXT NOT NULL,
      file_path      TEXT NOT NULL UNIQUE,
      summary        TEXT NOT NULL,
      content        TEXT NOT NULL,
      tags           TEXT,
      relevance      REAL NOT NULL DEFAULT 1.0,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL,
      source_agent   TEXT,
      source_session TEXT,
      access_count   INTEGER NOT NULL DEFAULT 0,
      last_accessed  TEXT
    );

    CREATE TABLE IF NOT EXISTS file_relations (
      memory_id   TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      file_path   TEXT NOT NULL,
      relation    TEXT NOT NULL DEFAULT 'related',
      PRIMARY KEY (memory_id, file_path)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id              TEXT PRIMARY KEY,
      agent           TEXT NOT NULL,
      started_at      TEXT NOT NULL,
      ended_at        TEXT,
      summary         TEXT,
      memories_created INTEGER DEFAULT 0,
      transcript_path TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
    CREATE INDEX IF NOT EXISTS idx_memories_relevance ON memories(relevance DESC);
    CREATE INDEX IF NOT EXISTS idx_file_relations_path ON file_relations(file_path);
  `);

  // Create FTS5 index
  createFtsIndex(sqlite);

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}
