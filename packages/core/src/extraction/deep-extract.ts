import { createRequire } from 'node:module';
import type { PatternMatch } from './patterns.js';
import type { Config } from '../config/schema.js';

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

interface OpenAIClient {
  chat: {
    completions: {
      create: (params: {
        model: string;
        max_tokens: number;
        messages: { role: string; content: string }[];
      }) => Promise<{
        choices: { message: { content: string } }[];
      }>;
    };
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

function resolveApiKey(config: Config): string | undefined {
  const envVar = config.extract.api_key_env;
  return process.env[envVar];
}

function parseResponse(text: string): PatternMatch[] {
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
}

async function extractViaAnthropic(
  transcript: string,
  config: Config,
  apiKey: string,
): Promise<PatternMatch[]> {
  const require = createRequire(import.meta.url);
  const sdk = require('@anthropic-ai/sdk') as {
    default?: new (opts: { apiKey: string; baseURL?: string }) => AnthropicClient;
  } & (new (opts: { apiKey: string; baseURL?: string }) => AnthropicClient);
  const Ctor = sdk.default ?? sdk;

  const opts: { apiKey: string; baseURL?: string } = { apiKey };
  if (config.extract.base_url) {
    opts.baseURL = config.extract.base_url;
  }

  const client = new Ctor(opts);
  const response = await client.messages.create({
    model: config.extract.model,
    max_tokens: 4000,
    messages: [{ role: 'user', content: PROMPT + transcript.slice(0, 12000) }],
  });

  const text = response.content.find((c) => c.type === 'text')?.text;
  if (!text) return [];

  return parseResponse(text);
}

async function extractViaOpenAICompatible(
  transcript: string,
  config: Config,
  apiKey: string,
): Promise<PatternMatch[]> {
  const baseUrl = config.extract.base_url;
  if (!baseUrl) return [];

  const require = createRequire(import.meta.url);

  try {
    // Try using openai SDK if available
    const sdk = require('openai') as {
      default?: new (opts: { apiKey: string; baseURL: string }) => OpenAIClient;
    } & (new (opts: { apiKey: string; baseURL: string }) => OpenAIClient);
    const Ctor = sdk.default ?? sdk;

    const client = new Ctor({ apiKey, baseURL: baseUrl });
    const response = await client.chat.completions.create({
      model: config.extract.model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: PROMPT + transcript.slice(0, 12000) }],
    });

    const text = response.choices[0].message.content;
    if (!text) return [];

    return parseResponse(text);
  } catch {
    // Fallback: raw fetch to OpenAI-compatible endpoint
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.extract.model,
        max_tokens: 4000,
        messages: [{ role: 'user', content: PROMPT + transcript.slice(0, 12000) }],
      }),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) return [];

    return parseResponse(text);
  }
}

/**
 * Deep extraction using LLM.
 *
 * Supports two providers:
 * - `anthropic` (default): Uses @anthropic-ai/sdk. Supports custom base_url for Claude Max/Pro.
 * - `openai-compatible`: Any OpenAI-compatible API (OpenRouter, Together, etc.)
 *
 * Configure in .ctx/config.yaml:
 * ```yaml
 * extract:
 *   mode: deep
 *   provider: anthropic          # or openai-compatible
 *   model: claude-haiku-4-5-20251001
 *   base_url: https://api.anthropic.com  # optional
 *   api_key_env: ANTHROPIC_API_KEY       # env var name
 * ```
 */
export async function deepExtract(transcript: string, config?: Config): Promise<PatternMatch[]> {
  // Legacy: if no config, use env var directly (backward compat)
  const apiKey = config ? resolveApiKey(config) : process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  if (!config) {
    // Backward compat: no config → use Anthropic defaults
    const { DEFAULT_CONFIG } = await import('../config/defaults.js');
    config = DEFAULT_CONFIG;
  }

  const provider = config.extract.provider;

  try {
    if (provider === 'openai-compatible') {
      return await extractViaOpenAICompatible(transcript, config, apiKey);
    }
    return await extractViaAnthropic(transcript, config, apiKey);
  } catch {
    return [];
  }
}
