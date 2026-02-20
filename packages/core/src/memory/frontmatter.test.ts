import { describe, it, expect } from 'vitest';
import { parseMemoryFile, serializeMemoryFile } from './frontmatter.js';
import type { Frontmatter } from './types.js';

describe('frontmatter', () => {
  it('round-trips frontmatter + body', () => {
    const fm: Frontmatter = {
      type: 'gotcha',
      tags: ['test'],
      relevance: 0.8,
      created: '2024-01-01T00:00:00.000Z',
      updated: '2024-01-01T00:00:00.000Z',
      summary: 'Test summary',
    };
    const body = 'This is the body content.';

    const serialized = serializeMemoryFile(fm, body);
    const parsed = parseMemoryFile(serialized);

    expect(parsed.frontmatter.type).toBe('gotcha');
    expect(parsed.frontmatter.summary).toBe('Test summary');
    expect(parsed.frontmatter.tags).toEqual(['test']);
    expect(parsed.frontmatter.relevance).toBe(0.8);
    expect(parsed.body).toBe(body);
  });
});
