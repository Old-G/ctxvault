import type Database from 'better-sqlite3';
import type { Config } from '../config/schema.js';
import type { MemoryEntry } from '../memory/types.js';
import { findByRelatedFile } from '../index/search.js';
import { countTokens, fitWithinBudget } from './budget.js';

export interface FileContext {
  filePath: string;
  memories: MemoryEntry[];
  markdown: string;
  tokenCount: number;
}

function formatMemory(entry: MemoryEntry): string {
  return `- **${entry.type}**: ${entry.summary}`;
}

export function getContextForFile(
  sqlite: Database.Database,
  config: Config,
  filePath: string,
): FileContext {
  if (!config.contextual.enabled) {
    return { filePath, memories: [], markdown: '', tokenCount: 0 };
  }

  const results = findByRelatedFile(sqlite, filePath, {
    types: [...config.contextual.types],
    limit: 10,
  });

  const formatted = results.map(formatMemory);
  const budgeted = fitWithinBudget(formatted, config.contextual.max_tokens);

  const includedMemories = results.slice(0, budgeted.length);
  const markdown =
    budgeted.length > 0 ? `**Relevant memories for \`${filePath}\`:**\n${budgeted.join('\n')}` : '';

  return {
    filePath,
    memories: includedMemories,
    markdown,
    tokenCount: markdown ? countTokens(markdown) : 0,
  };
}
