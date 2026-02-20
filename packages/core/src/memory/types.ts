export const MEMORY_TYPES = ['gotcha', 'decision', 'solution', 'discovery', 'convention'] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

export const RELATION_TYPES = ['related', 'caused_by', 'fixes'] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export interface Frontmatter {
  type: MemoryType;
  tags: string[];
  relevance: number;
  created: string;
  updated: string;
  source_agent?: string | undefined;
  source_session?: string | undefined;
  related_files?: string[] | undefined;
  summary: string;
}

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  filePath: string;
  summary: string;
  content: string;
  tags: string[];
  relevance: number;
  createdAt: string;
  updatedAt: string;
  sourceAgent?: string | undefined;
  sourceSession?: string | undefined;
  relatedFiles: string[];
  accessCount: number;
  lastAccessed?: string | undefined;
}

export interface CreateMemoryInput {
  type: MemoryType;
  summary: string;
  content: string;
  tags: string[];
  relatedFiles?: string[] | undefined;
  sourceAgent?: string | undefined;
  sourceSession?: string | undefined;
}

export interface UpdateMemoryInput {
  summary?: string | undefined;
  content?: string | undefined;
  tags?: string[] | undefined;
  relatedFiles?: string[] | undefined;
  relevance?: number | undefined;
}

export interface SearchOptions {
  type?: MemoryType | undefined;
  relatedFile?: string | undefined;
  limit?: number | undefined;
}

export interface ListOptions {
  type?: MemoryType | undefined;
  sortBy?: 'relevance' | 'created' | 'updated' | undefined;
  limit?: number | undefined;
}
