import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import type {
  MemoryEntry,
  CreateMemoryInput,
  UpdateMemoryInput,
  ListOptions,
  Frontmatter,
} from './types.js';
import { parseMemoryFile, serializeMemoryFile } from './frontmatter.js';
import { CreateMemoryInputSchema } from './validator.js';
import { slugify } from './slugify.js';
import { uuidv7 } from './uuid.js';

const TYPE_DIRS: Record<string, string> = {
  gotcha: 'gotchas',
  decision: 'decisions',
  solution: 'solutions',
  discovery: 'discoveries',
  convention: 'system',
};

export class MemoryStore {
  constructor(private readonly ctxDir: string) {}

  create(input: CreateMemoryInput): MemoryEntry {
    const validated = CreateMemoryInputSchema.parse(input);
    const id = uuidv7();
    const now = new Date().toISOString();
    const slug = slugify(validated.summary);
    const dir = TYPE_DIRS[validated.type] ?? validated.type;
    const dirPath = join(this.ctxDir, dir);
    const filePath = join(dirPath, `${slug}.md`);
    const relPath = relative(this.ctxDir, filePath);

    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    const frontmatter: Frontmatter = {
      type: validated.type,
      tags: validated.tags,
      relevance: 1.0,
      created: now,
      updated: now,
      summary: validated.summary,
      ...(validated.sourceAgent && { source_agent: validated.sourceAgent }),
      ...(validated.sourceSession && { source_session: validated.sourceSession }),
      ...(validated.relatedFiles?.length && { related_files: validated.relatedFiles }),
    };

    const fileContent = serializeMemoryFile(frontmatter, validated.content);
    writeFileSync(filePath, fileContent, 'utf-8');

    return {
      id,
      type: validated.type,
      filePath: relPath,
      summary: validated.summary,
      content: validated.content,
      tags: validated.tags,
      relevance: 1.0,
      createdAt: now,
      updatedAt: now,
      sourceAgent: validated.sourceAgent,
      sourceSession: validated.sourceSession,
      relatedFiles: validated.relatedFiles ?? [],
      accessCount: 0,
    };
  }

  read(relPath: string): MemoryEntry | null {
    const absPath = join(this.ctxDir, relPath);
    if (!existsSync(absPath)) return null;

    const raw = readFileSync(absPath, 'utf-8');
    const { frontmatter, body } = parseMemoryFile(raw);

    return {
      id: '',
      type: frontmatter.type,
      filePath: relPath,
      summary: frontmatter.summary,
      content: body,
      tags: frontmatter.tags,
      relevance: frontmatter.relevance,
      createdAt: frontmatter.created,
      updatedAt: frontmatter.updated,
      sourceAgent: frontmatter.source_agent,
      sourceSession: frontmatter.source_session,
      relatedFiles: frontmatter.related_files ?? [],
      accessCount: 0,
    };
  }

  update(relPath: string, changes: UpdateMemoryInput): MemoryEntry | null {
    const existing = this.read(relPath);
    if (!existing) return null;

    const absPath = join(this.ctxDir, relPath);
    const raw = readFileSync(absPath, 'utf-8');
    const { frontmatter, body } = parseMemoryFile(raw);

    const now = new Date().toISOString();
    const updatedFrontmatter: Frontmatter = {
      ...frontmatter,
      updated: now,
      ...(changes.summary !== undefined && { summary: changes.summary }),
      ...(changes.tags !== undefined && { tags: changes.tags }),
      ...(changes.relatedFiles !== undefined && { related_files: changes.relatedFiles }),
      ...(changes.relevance !== undefined && { relevance: changes.relevance }),
    };

    const updatedBody = changes.content ?? body;
    const fileContent = serializeMemoryFile(updatedFrontmatter, updatedBody);
    writeFileSync(absPath, fileContent, 'utf-8');

    return {
      ...existing,
      ...(changes.summary !== undefined && { summary: changes.summary }),
      ...(changes.content !== undefined && { content: changes.content }),
      ...(changes.tags !== undefined && { tags: changes.tags }),
      ...(changes.relevance !== undefined && { relevance: changes.relevance }),
      updatedAt: now,
      relatedFiles: changes.relatedFiles ?? existing.relatedFiles,
    };
  }

  delete(relPath: string): boolean {
    const absPath = join(this.ctxDir, relPath);
    if (!existsSync(absPath)) return false;
    unlinkSync(absPath);
    return true;
  }

  list(options?: ListOptions): MemoryEntry[] {
    const dirs = Object.values(TYPE_DIRS);
    const entries: MemoryEntry[] = [];

    for (const dir of dirs) {
      const dirPath = join(this.ctxDir, dir);
      if (!existsSync(dirPath)) continue;

      const files = readdirSync(dirPath).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const relPath = join(dir, file);
        const entry = this.read(relPath);
        if (!entry) continue;
        if (options?.type && entry.type !== options.type) continue;
        entries.push(entry);
      }
    }

    const sortBy = options?.sortBy ?? 'relevance';
    entries.sort((a, b) => {
      if (sortBy === 'relevance') return b.relevance - a.relevance;
      if (sortBy === 'created') return b.createdAt.localeCompare(a.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    if (options?.limit) {
      return entries.slice(0, options.limit);
    }

    return entries;
  }
}
