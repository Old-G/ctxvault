import type Database from 'better-sqlite3';

export function createFtsIndex(db: Database.Database): void {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      summary,
      content,
      tags,
      content=memories,
      content_rowid=rowid,
      tokenize='porter unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, summary, content, tags)
      VALUES (new.rowid, new.summary, new.content, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, summary, content, tags)
      VALUES ('delete', old.rowid, old.summary, old.content, old.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, summary, content, tags)
      VALUES ('delete', old.rowid, old.summary, old.content, old.tags);
      INSERT INTO memories_fts(rowid, summary, content, tags)
      VALUES (new.rowid, new.summary, new.content, new.tags);
    END;
  `);
}
