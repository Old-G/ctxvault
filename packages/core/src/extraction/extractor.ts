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

/**
 * Async extraction that supports deep mode (LLM via Haiku).
 * Falls back to lightweight if ANTHROPIC_API_KEY is not set.
 */
export async function extractFromTranscriptAsync(
  transcript: string,
  config: Config,
  options?: { sourceAgent?: string; sourceSession?: string; db?: Database.Database },
): Promise<ExtractionResult> {
  if (!config.extract.enabled) {
    return { memories: [], raw: [], deduplicated: 0 };
  }

  let patterns: PatternMatch[];

  if (config.extract.mode === 'deep') {
    const { deepExtract } = await import('./deep-extract.js');
    const deepPatterns = await deepExtract(transcript);
    const lightPatterns = detectPatterns(transcript);
    // Merge, preferring deep patterns (higher confidence)
    const seenSummaries = new Set(deepPatterns.map((p) => p.summary.toLowerCase()));
    const uniqueLight = lightPatterns.filter((p) => !seenSummaries.has(p.summary.toLowerCase()));
    patterns = [...deepPatterns, ...uniqueLight];
  } else {
    patterns = detectPatterns(transcript);
  }

  const totalRaw = patterns.length;
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
