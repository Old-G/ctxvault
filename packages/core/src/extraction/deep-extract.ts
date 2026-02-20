import { createRequire } from 'node:module';
import type { PatternMatch } from './patterns.js';

interface AnthropicClient {
  messages: {
    create: (params: {
      model: string;
      max_tokens: number;
      messages: { role: string; content: string }[];
    }) => Promise<{
      content: { type: string; text?: string }[];
    }>;
  };
}

const PROMPT = `You are a knowledge extractor for a coding session memory system.

Analyze this coding session transcript and extract knowledge worth preserving.
The transcript may be in ANY language (English, Russian, Chinese, etc.) — extract knowledge regardless of language.
Write summaries and content in the SAME language as the transcript.

Return a JSON array of objects with these fields:
- type: "gotcha" | "decision" | "solution" | "discovery" | "convention"
- summary: one-line summary (< 100 chars)
- content: detailed description (2-5 sentences explaining WHY, not just WHAT)
- tags: array of keywords (in English for searchability)
- confidence: 0.0-1.0

What to extract:
- Bugs found and their root causes (gotcha)
- Architecture/technology choices and reasoning (decision)
- Problems solved and how (solution)
- New knowledge about the codebase or tools (discovery)
- Coding patterns or standards discussed (convention)

Rules:
- Skip trivial findings (typos, formatting, imports)
- Focus on WHY, not just WHAT happened
- Each summary must be unique and specific to this session
- Minimum confidence 0.5
- Only return the JSON array, no other text

Transcript:
`;

/**
 * Deep extraction using LLM (Anthropic Haiku).
 * Requires ANTHROPIC_API_KEY environment variable and @anthropic-ai/sdk installed.
 *
 * Falls back to empty array if API key is not set or SDK is not available.
 */
export async function deepExtract(transcript: string): Promise<PatternMatch[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  let client: AnthropicClient;

  try {
    // Use createRequire to avoid TypeScript static analysis of the module name
    const require = createRequire(import.meta.url);
    const sdk = require('@anthropic-ai/sdk') as {
      default?: new (opts: { apiKey: string }) => AnthropicClient;
    } & (new (opts: { apiKey: string }) => AnthropicClient);
    const Ctor = sdk.default ?? sdk;
    client = new Ctor({ apiKey });
  } catch {
    return [];
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: PROMPT + transcript.slice(0, 12000) }],
    });

    const text = response.content.find((c) => c.type === 'text')?.text;
    if (!text) return [];

    const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(jsonStr) as PatternMatch[];

    return parsed.filter(
      (p) =>
        typeof p.type === 'string' &&
        typeof p.summary === 'string' &&
        typeof p.content === 'string' &&
        Array.isArray(p.tags) &&
        typeof p.confidence === 'number' &&
        p.confidence >= 0.5,
    );
  } catch {
    return [];
  }
}
