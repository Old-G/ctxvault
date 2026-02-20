import matter from 'gray-matter';
import type { Frontmatter } from './types.js';

export function parseMemoryFile(raw: string): { frontmatter: Frontmatter; body: string } {
  const { data, content } = matter(raw);
  return {
    frontmatter: data as Frontmatter,
    body: content.trim(),
  };
}

export function serializeMemoryFile(frontmatter: Frontmatter, body: string): string {
  return matter.stringify(`\n${body}\n`, frontmatter);
}
