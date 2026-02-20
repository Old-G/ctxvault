/**
 * @ctxvault/core — Memory engine for AI coding agents.
 *
 * @packageDocumentation
 */

export const VERSION = '0.0.0';

// Types
export { MEMORY_TYPES } from './memory/types.js';
export type {
  MemoryType,
  MemoryEntry,
  CreateMemoryInput,
  UpdateMemoryInput,
  SearchOptions,
  ListOptions,
  Frontmatter,
} from './memory/types.js';

// Config
export { ConfigSchema, type Config } from './config/schema.js';
export { DEFAULT_CONFIG, DEFAULT_CONFIG_YAML } from './config/defaults.js';
export { loadConfig } from './config/loader.js';

// Memory Store
export { MemoryStore } from './memory/store.js';
export { parseMemoryFile, serializeMemoryFile } from './memory/frontmatter.js';

// Index / Search
export { createDatabase, type DbInstance } from './index/db.js';
export { searchMemories, findByRelatedFile, type SearchResult } from './index/search.js';

// Injection
export { countTokens, fitWithinBudget } from './injection/budget.js';
export { buildSessionPayload, type InjectionPayload } from './injection/injector.js';
export { getContextForFile, type FileContext } from './injection/context-for-file.js';

// Extraction
export { detectPatterns, type PatternMatch } from './extraction/patterns.js';
export { extractFromTranscript, type ExtractionResult } from './extraction/extractor.js';

// Git
export { createGit, autoCommitMemories, isGitRepo, getChangedFiles } from './git/ops.js';
export { ensureGitignore } from './git/ignore.js';
