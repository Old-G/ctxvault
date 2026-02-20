import type { SimpleGit } from 'simple-git';
import type { Config } from '../config/schema.js';
import type { MemoryEntry } from '../memory/types.js';

/**
 * Creates a descriptive commit message from a memory entry.
 */
function buildCommitMessage(config: Config, entries: MemoryEntry[]): string {
  const prefix = config.git.commit_prefix;

  if (entries.length === 1) {
    const entry = entries[0];
    if (!entry) return `${prefix} update memories`;
    return `${prefix} ${entry.type} — ${entry.summary}`;
  }

  const typeCounts = new Map<string, number>();
  for (const entry of entries) {
    typeCounts.set(entry.type, (typeCounts.get(entry.type) ?? 0) + 1);
  }

  const parts = [...typeCounts.entries()].map(([type, count]) => `${String(count)} ${type}`);
  return `${prefix} ${parts.join(', ')}`;
}

/**
 * Auto-commits memory files with a descriptive message.
 * Returns the commit hash or null if nothing to commit.
 */
export async function smartAutoCommit(
  git: SimpleGit,
  config: Config,
  entries: MemoryEntry[],
): Promise<string | null> {
  if (!config.git.auto_commit || entries.length === 0) return null;

  const files = entries.map((e) => `.ctx/${e.filePath}`);
  const message = buildCommitMessage(config, entries);

  await git.add(files);

  const commitOptions = config.git.sign_commits ? { '-S': null } : {};
  const result = await git.commit(message, files, commitOptions);
  return result.commit || null;
}
