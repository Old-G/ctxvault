import type { MemoryType } from '../memory/types.js';

export interface PatternMatch {
  type: MemoryType;
  summary: string;
  content: string;
  tags: string[];
  confidence: number;
}

interface PatternRule {
  type: MemoryType;
  regex: RegExp;
  tagHints: string[];
}

const RULES: PatternRule[] = [
  // Gotchas — common "watch out" / "don't" / "careful" patterns
  {
    type: 'gotcha',
    regex:
      /(?:gotcha|watch\s+out|careful|beware|pitfall|trap|caveat|don'?t\s+(?:use|forget|do))\b/i,
    tagHints: ['gotcha'],
  },
  // Decisions — "decided to", "we chose", "approach:"
  {
    type: 'decision',
    regex: /(?:decided?\s+(?:to|on)|we\s+chose|approach\s*:|decision\s*:)/i,
    tagHints: ['decision'],
  },
  // Solutions — "fix:", "solved by", "solution:", "workaround:"
  {
    type: 'solution',
    regex: /(?:fix(?:ed)?\s*:|solv(?:ed|tion)\s*(?:by|:)|workaround\s*:)/i,
    tagHints: ['solution'],
  },
  // Discoveries — "found that", "discovered", "turns out", "TIL"
  {
    type: 'discovery',
    regex: /(?:found\s+(?:that|out)|discover(?:ed|y)|turns?\s+out|TIL\b)/i,
    tagHints: ['discovery'],
  },
];

export function detectPatterns(text: string): PatternMatch[] {
  const matches: PatternMatch[] = [];

  for (const rule of RULES) {
    const match = rule.regex.exec(text);
    if (!match) continue;

    // Extract surrounding context (the sentence containing the match)
    const start = text.lastIndexOf('.', match.index);
    const end = text.indexOf('.', match.index + match[0].length);
    const sentence = text
      .slice(start >= 0 ? start + 1 : 0, end >= 0 ? end + 1 : text.length)
      .trim();

    if (sentence.length < 10) continue;

    matches.push({
      type: rule.type,
      summary: sentence.slice(0, 120),
      content: sentence,
      tags: rule.tagHints,
      confidence: 0.6,
    });
  }

  return matches;
}
