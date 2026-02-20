import type Database from 'better-sqlite3';
import type { Config } from '../config/schema.js';
import type { CreateMemoryInput } from '../memory/types.js';
import { detectPatterns, type PatternMatch } from './patterns.js';
import { deduplicatePatterns } from './dedup.js';

export interface ExtractionResult {
  memories: CreateMemoryInput[];
  raw: PatternMatch[];
  deduplicated: number;
}

export function extractFromTranscript(
  transcript: string,
  config: Config,
  options?: { sourceAgent?: string; sourceSession?: string; db?: Database.Database },
): ExtractionResult {
  if (!config.extract.enabled) {
    return { memories: [], raw: [], deduplicated: 0 };
  }

  const patterns = detectPatterns(transcript);
  const totalRaw = patterns.length;

  // Deduplicate against existing index if db is provided
  const unique = options?.db ? deduplicatePatterns(options.db, patterns) : patterns;

  const memories: CreateMemoryInput[] = unique.map((p) => ({
    type: p.type,
    summary: p.summary,
    content: p.content,
    tags: p.tags,
    sourceAgent: options?.sourceAgent,
    sourceSession: options?.sourceSession,
  }));

  return { memories, raw: patterns, deduplicated: totalRaw - unique.length };
}
