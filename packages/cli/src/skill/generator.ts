import { mkdirSync, writeFileSync, symlinkSync, existsSync, lstatSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chmodSync } from 'node:fs';

const SKILL_MD = `---
name: ctxvault
description: >
  Persistent project memory system. Use when:
  (1) Starting a new session — run inject.sh to load project context.
  (2) You discover a bug, gotcha, or unexpected behavior — save as gotcha.
  (3) You make an architecture or technology choice — save as decision.
  (4) You solve a non-trivial problem — save as solution.
  (5) You learn something new about the codebase — save as discovery.
  (6) You need to recall project history — run search.sh.
  Triggers: new session, error found, architecture discussion, "remember this",
  "what do we know about", debugging session, surprising behavior, technology choice.
---

# CtxVault — Persistent Project Memory

## Quick Start

At the beginning of a session, load project context:
\`\`\`bash
bash .agents/skills/ctxvault/scripts/inject.sh
\`\`\`

## When to Save Memory

### Gotcha — surprising/counterintuitive behavior
\`\`\`bash
bash .agents/skills/ctxvault/scripts/save.sh gotcha "summary" "full description"
\`\`\`

### Decision — architecture or technology choice
\`\`\`bash
bash .agents/skills/ctxvault/scripts/save.sh decision "summary" "full description"
\`\`\`

### Solution — problem diagnosed and solved
\`\`\`bash
bash .agents/skills/ctxvault/scripts/save.sh solution "summary" "full description"
\`\`\`

### Discovery — new knowledge about the codebase
\`\`\`bash
bash .agents/skills/ctxvault/scripts/save.sh discovery "summary" "full description"
\`\`\`

### Convention — coding standard or project pattern
\`\`\`bash
bash .agents/skills/ctxvault/scripts/save.sh convention "summary" "full description"
\`\`\`

## When to Search Memory

Before making changes or when you need context:
\`\`\`bash
bash .agents/skills/ctxvault/scripts/search.sh "query"
\`\`\`

## Read Full Details
\`\`\`bash
bash .agents/skills/ctxvault/scripts/read.sh ".ctx/gotchas/react-useeffect.md"
\`\`\`

## Important
- Memory is stored as Markdown in \`.ctx/\` — tracked by git, reviewed in PRs
- Always include \`--related-files\` when saving for better context injection
- In Claude Code: hooks auto-inject context and extract memories
- In other agents: run inject.sh at session start, save when you discover something
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
