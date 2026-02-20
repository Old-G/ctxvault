import type { Config } from '../config/schema.js';
import type { CreateMemoryInput } from '../memory/types.js';
import { detectPatterns, type PatternMatch } from './patterns.js';

export interface ExtractionResult {
  memories: CreateMemoryInput[];
  raw: PatternMatch[];
}

export function extractFromTranscript(
  transcript: string,
  config: Config,
  options?: { sourceAgent?: string; sourceSession?: string },
): ExtractionResult {
  if (!config.extract.enabled) {
    return { memories: [], raw: [] };
  }

  const patterns = detectPatterns(transcript);

  const memories: CreateMemoryInput[] = patterns.map((p) => ({
    type: p.type,
    summary: p.summary,
    content: p.content,
    tags: p.tags,
    sourceAgent: options?.sourceAgent,
    sourceSession: options?.sourceSession,
  }));

  return { memories, raw: patterns };
}
