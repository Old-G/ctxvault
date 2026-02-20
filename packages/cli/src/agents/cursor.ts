import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const CURSOR_RULE = `# CtxVault — Persistent Project Memory

**MANDATORY: You MUST actively use this system in every session. Save memories proactively, not only when asked.**

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

export function setupCursor(projectRoot: string): string[] {
  const rulesDir = join(projectRoot, '.cursor', 'rules');
  const rulePath = join(rulesDir, 'ctxvault.mdc');
  const actions: string[] = [];

  mkdirSync(rulesDir, { recursive: true });

  // Write .mdc rule file (Cursor rules format)
  const mdcContent = `---
description: "MANDATORY: Persistent project memory. You MUST use this in every session. Save memories proactively in the user's language."
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
