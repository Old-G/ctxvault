import { describe, it, expect } from 'vitest';
import { detectPatterns } from './patterns.js';

describe('detectPatterns', () => {
  it('detects gotcha patterns', () => {
    const text = 'Watch out for circular imports when using barrel files.';
    const matches = detectPatterns(text);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0]?.type).toBe('gotcha');
  });

  it('detects solution patterns', () => {
    const text = 'Fix: add .js extension to all relative imports for ESM compatibility.';
    const matches = detectPatterns(text);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0]?.type).toBe('solution');
  });

  it('detects decision patterns', () => {
    const text = 'We decided to use SQLite instead of PostgreSQL for local storage.';
    const matches = detectPatterns(text);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0]?.type).toBe('decision');
  });

  it('detects discovery patterns', () => {
    const text = 'Turns out the FTS5 tokenizer supports porter stemming by default.';
    const matches = detectPatterns(text);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0]?.type).toBe('discovery');
  });

  it('returns empty for unmatched text', () => {
    const text = 'The weather is nice today.';
    const matches = detectPatterns(text);
    expect(matches).toHaveLength(0);
  });
});
