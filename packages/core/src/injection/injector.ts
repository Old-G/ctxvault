import type { Config } from '../config/schema.js';
import type { MemoryEntry } from '../memory/types.js';
import { type MemoryStore } from '../memory/store.js';
import { countTokens, fitWithinBudget } from './budget.js';

export interface InjectionPayload {
  memories: MemoryEntry[];
  markdown: string;
  tokenCount: number;
}

function formatMemory(entry: MemoryEntry): string {
  const tags = entry.tags.length > 0 ? ` [${entry.tags.join(', ')}]` : '';
  return `### ${entry.type}: ${entry.summary}${tags}\n${entry.content}`;
}

export function buildSessionPayload(store: MemoryStore, config: Config): InjectionPayload {
  if (!config.injection.enabled) {
    return { memories: [], markdown: '', tokenCount: 0 };
  }

  const allMemories = store.list({ sortBy: 'relevance' });

  const filtered = allMemories.filter((m) => {
    if (!config.injection.include_types.includes(m.type)) return false;
    if (config.injection.exclude_tags.some((t) => m.tags.includes(t))) return false;
    return true;
  });

  // System/convention memories always first if configured
  const system: MemoryEntry[] = [];
  const rest: MemoryEntry[] = [];

  for (const m of filtered) {
    if (config.injection.always_include_system && m.type === 'convention') {
      system.push(m);
    } else {
      rest.push(m);
    }
  }

  const ordered = [...system, ...rest];
  const formatted = ordered.map(formatMemory);
  const budgeted = fitWithinBudget(formatted, config.injection.max_tokens);

  const includedMemories = ordered.slice(0, budgeted.length);
  const markdown =
    budgeted.length > 0 ? `## Project Memory (CtxVault)\n\n${budgeted.join('\n\n')}` : '';

  return {
    memories: includedMemories,
    markdown,
    tokenCount: markdown ? countTokens(markdown) : 0,
  };
}
