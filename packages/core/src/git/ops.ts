import { simpleGit, type SimpleGit } from 'simple-git';
import type { Config } from '../config/schema.js';

export function createGit(projectRoot: string): SimpleGit {
  return simpleGit(projectRoot);
}

export async function autoCommitMemories(
  git: SimpleGit,
  config: Config,
  files: string[],
  message: string,
): Promise<string | null> {
  if (!config.git.auto_commit || files.length === 0) return null;

  await git.add(files);

  const commitMsg = `${config.git.commit_prefix} ${message}`;
  const commitOptions = config.git.sign_commits ? { '-S': null } : {};

  const result = await git.commit(commitMsg, files, commitOptions);
  return result.commit || null;
}

export async function isGitRepo(projectRoot: string): Promise<boolean> {
  try {
    const git = simpleGit(projectRoot);
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

export async function getChangedFiles(git: SimpleGit): Promise<string[]> {
  const status = await git.status();
  return [...status.modified, ...status.not_added, ...status.created];
}
