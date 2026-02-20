import { mkdirSync, writeFileSync, symlinkSync, existsSync, lstatSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chmodSync } from 'node:fs';

const SKILL_MD = `---
name: ctxvault
description: >
  MANDATORY: Persistent project memory. You MUST use this skill in every session.
  At session start: run inject.sh. During work: save every bug, decision, solution,
  discovery, and convention you encounter. At session end: save at least one memory.
  Write summaries in the same language the user speaks.
---

# CtxVault — Persistent Project Memory

**IMPORTANT: You MUST actively use this system. Save memories proactively, not only when asked.**

## 1. Session Start — ALWAYS run this first

\`\`\`bash
bash .agents/skills/ctxvault/scripts/inject.sh
\`\`\`

## 2. During Work — Save memories as you go

Every time you encounter one of these, IMMEDIATELY save it:

| Trigger | Type | Example |
|---------|------|---------|
| Bug found, unexpected behavior | gotcha | "SQLite WAL requires shared-memory" |
| Technology/architecture choice | decision | "Chose FTS5 over Elasticsearch" |
| Problem diagnosed and fixed | solution | "Fixed CORS by adding origin whitelist" |
| Learned something about codebase | discovery | "Config supports hot-reload" |
| Agreed on coding pattern | convention | "All API responses use camelCase" |

\`\`\`bash
bash .agents/skills/ctxvault/scripts/save.sh <type> "<summary>" "<description>"
\`\`\`

Write summary and description in the **same language the user speaks**.

## 3. Search Before Making Changes

\`\`\`bash
bash .agents/skills/ctxvault/scripts/search.sh "<query>"
\`\`\`

## 4. Read Full Memory

\`\`\`bash
bash .agents/skills/ctxvault/scripts/read.sh "<path>"
\`\`\`

## Rules

- **Save at least 1 memory per session** — if nothing notable happened, save a discovery
- **Write in the user's language** — not English unless the user speaks English
- **Be specific** — "React useEffect runs twice in StrictMode" not "useEffect issue"
- **Focus on WHY** — explain root cause, reasoning, context
- Memory is stored as Markdown in \`.ctx/\` — tracked by git, reviewable in PRs
`;

const MEMORY_TYPES_MD = `# Memory Types

| Type | When | Example |
|------|------|---------|
| gotcha | Surprising behavior, bug pattern | "Prisma migrate fails without --skip-seed in Docker" |
| decision | Architecture/tech choice + rationale | "Chose Zustand: simpler API for our needs" |
| solution | Problem → diagnosis → fix | "CORS 403 → added rewrite in next.config.js" |
| discovery | New knowledge about codebase | "Legacy endpoint /v1/users still called by mobile app" |
| convention | Coding standard, pattern | "All components use forwardRef" |

## Frontmatter Fields
- type: required (one of above)
- tags: required (array of keywords)
- summary: required (one-line, < 100 chars)
- related_files: recommended (project file paths this relates to)
- relevance, source_agent, source_session: auto-managed
`;

const INJECT_SH = `#!/usr/bin/env bash
ctx inject --format compact
`;

const SEARCH_SH = `#!/usr/bin/env bash
ctx search "$@"
`;

const SAVE_SH = `#!/usr/bin/env bash
ctx save --type "$1" --summary "$2" --content "$3"
`;

const READ_SH = `#!/usr/bin/env bash
ctx show "$1"
`;

const LIST_SH = `#!/usr/bin/env bash
ctx list --type "$1"
`;

const SCRIPTS: Record<string, string> = {
  'inject.sh': INJECT_SH,
  'search.sh': SEARCH_SH,
  'save.sh': SAVE_SH,
  'read.sh': READ_SH,
  'list.sh': LIST_SH,
};

export function generateSkill(projectRoot: string): string[] {
  const skillDir = join(projectRoot, '.agents', 'skills', 'ctxvault');
  const scriptsDir = join(skillDir, 'scripts');
  const refsDir = join(skillDir, 'references');

  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(refsDir, { recursive: true });

  const createdFiles: string[] = [];

  // SKILL.md
  const skillPath = join(skillDir, 'SKILL.md');
  writeFileSync(skillPath, SKILL_MD, 'utf-8');
  createdFiles.push(skillPath);

  // scripts/
  for (const [name, content] of Object.entries(SCRIPTS)) {
    const scriptPath = join(scriptsDir, name);
    writeFileSync(scriptPath, content, 'utf-8');
    chmodSync(scriptPath, 0o755);
    createdFiles.push(scriptPath);
  }

  // references/memory-types.md
  const refPath = join(refsDir, 'memory-types.md');
  writeFileSync(refPath, MEMORY_TYPES_MD, 'utf-8');
  createdFiles.push(refPath);

  // Symlink: .claude/skills/ctxvault → ../../.agents/skills/ctxvault
  const claudeSkillDir = join(projectRoot, '.claude', 'skills');
  mkdirSync(claudeSkillDir, { recursive: true });
  const symlinkPath = join(claudeSkillDir, 'ctxvault');
  const symlinkTarget = relative(claudeSkillDir, skillDir);

  if (existsSync(symlinkPath)) {
    // If it's already a symlink or exists, skip
    try {
      lstatSync(symlinkPath);
    } catch {
      // doesn't exist, create
      symlinkSync(symlinkTarget, symlinkPath);
    }
  } else {
    symlinkSync(symlinkTarget, symlinkPath);
  }
  createdFiles.push(symlinkPath);

  return createdFiles;
}
