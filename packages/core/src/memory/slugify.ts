/**
 * Generate a filesystem-safe slug from a summary string.
 * Example: "useEffect Infinite Loop with objects" → "useeffect-infinite-loop-with-objects"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
