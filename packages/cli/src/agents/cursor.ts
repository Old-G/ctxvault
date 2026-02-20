import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const CURSOR_RULE = `# CtxVault — Persistent Project Memory

This project uses CtxVault for persistent memory across sessions.
Memory is stored as Markdown files in \`.ctx/\` and tracked by git.

## At Session Start

Read the project context:
\`\`\`bash
bash .agents/skills/ctxvault/scripts/inject.sh
\`\`\`

## When to Save Memory

Save a memory when you encounter something important:

- **gotcha** — surprising or counterintuitive behavior
- **decision** — architecture or technology choice
- **solution** — problem diagnosed and solved
- **discovery** — new knowledge about the codebase
- **convention** — coding standard or project pattern

\`\`\`bash
bash .agents/skills/ctxvault/scripts/save.sh <type> "<summary>" "<description>"
\`\`\`

## When to Search Memory

Before making changes or when you need context:
\`\`\`bash
bash .agents/skills/ctxvault/scripts/search.sh "<query>"
\`\`\`

## Read a Specific Memory
\`\`\`bash
bash .agents/skills/ctxvault/scripts/read.sh ".ctx/gotchas/example.md"
\`\`\`
`;

export function setupCursor(projectRoot: string): string[] {
  const rulesDir = join(projectRoot, '.cursor', 'rules');
  const rulePath = join(rulesDir, 'ctxvault.mdc');
  const actions: string[] = [];

  mkdirSync(rulesDir, { recursive: true });

  // Write .mdc rule file (Cursor rules format)
  const mdcContent = `---
description: Persistent project memory — save gotchas, decisions, solutions
globs:
alwaysApply: true
---

${CURSOR_RULE}`;

  if (existsSync(rulePath)) {
    const existing = readFileSync(rulePath, 'utf-8');
    if (existing === mdcContent) {
      actions.push('Cursor rule already up to date');
      return actions;
    }
  }

  writeFileSync(rulePath, mdcContent, 'utf-8');
  actions.push('Created .cursor/rules/ctxvault.mdc');

  return actions;
}
