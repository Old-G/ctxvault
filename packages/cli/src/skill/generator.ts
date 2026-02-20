import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SKILL_MD = `# /ctx — CtxVault Memory Skill

Use this skill to interact with project memory (CtxVault).

## Available Commands

### Search memories
\`\`\`bash
ctx search "<query>" [--type <type>] [--limit <n>]
\`\`\`

### Add a memory
\`\`\`bash
ctx add <type> "<summary>" --content "<body>" --tags "tag1,tag2" [--related "file1,file2"]
\`\`\`
Types: gotcha, decision, solution, discovery, convention

### List memories
\`\`\`bash
ctx list [--type <type>] [--sort relevance|created|updated] [--limit <n>]
\`\`\`

### Show a specific memory
\`\`\`bash
ctx show <path>
\`\`\`

### Remove a memory
\`\`\`bash
ctx remove <path>
\`\`\`

### Check project memory status
\`\`\`bash
ctx status
\`\`\`

## Memory Types

| Type | Purpose | Example |
|------|---------|---------|
| **gotcha** | Pitfalls, traps, "watch out" | "Don't use \`fs.watch\` on macOS — use chokidar" |
| **decision** | Architecture/design decisions | "Using SQLite+FTS5 instead of Elasticsearch" |
| **solution** | Proven fixes to problems | "Fix ESM imports by adding .js extensions" |
| **discovery** | Learned facts about the codebase | "The API rate-limits at 100 req/min" |
| **convention** | Project conventions, always-on rules | "All errors must use AppError class" |

## When to Save Memories

- After solving a tricky bug → **solution**
- After making a design choice → **decision**
- After discovering a gotcha → **gotcha**
- After learning something about the codebase → **discovery**
`;

export function generateSkill(projectRoot: string): string[] {
  const skillDir = join(projectRoot, '.claude', 'skills', 'ctxvault');
  mkdirSync(skillDir, { recursive: true });

  const skillPath = join(skillDir, 'SKILL.md');
  writeFileSync(skillPath, SKILL_MD, 'utf-8');

  return [skillPath];
}
