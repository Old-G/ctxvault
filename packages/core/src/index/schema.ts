import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

export const memories = sqliteTable(
  'memories',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    filePath: text('file_path').notNull().unique(),
    summary: text('summary').notNull(),
    content: text('content').notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    relevance: real('relevance').default(1.0).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    sourceAgent: text('source_agent'),
    sourceSession: text('source_session'),
    accessCount: integer('access_count').default(0).notNull(),
    lastAccessed: text('last_accessed'),
  },
  (table) => [
    index('idx_memories_type').on(table.type),
    index('idx_memories_relevance').on(table.relevance),
  ],
);

export const fileRelations = sqliteTable(
  'file_relations',
  {
    memoryId: text('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    filePath: text('file_path').notNull(),
    relation: text('relation').default('related').notNull(),
  },
  (table) => [index('idx_file_relations_path').on(table.filePath)],
);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  agent: text('agent').notNull(),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  summary: text('summary'),
  memoriesCreated: integer('memories_created').default(0),
  transcriptPath: text('transcript_path'),
});
