import { describe, it, expect } from 'vitest';
import { countTokens, fitWithinBudget } from './budget.js';

describe('budget', () => {
  it('counts tokens for a simple string', () => {
    const count = countTokens('Hello, world!');
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10);
  });

  it('fits items within a token budget', () => {
    const items = [
      'Short item one.',
      'Short item two.',
      'Short item three.',
      'A'.repeat(500), // Long item that exceeds budget
    ];

    const result = fitWithinBudget(items, 50);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.length).toBeGreaterThanOrEqual(1);
    // Should not include the long item
    expect(result.every((i) => i.length < 500)).toBe(true);
  });

  it('returns empty if first item exceeds budget', () => {
    const items = ['A'.repeat(500)];
    const result = fitWithinBudget(items, 10);
    expect(result).toHaveLength(0);
  });
});
