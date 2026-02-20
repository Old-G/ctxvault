# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CtxVault is a CLI tool that provides persistent, intelligent memory for AI coding agents (Claude Code, Cursor, Codex, Windsurf). It stores project knowledge as Markdown files in `.ctx/`, indexed via SQLite with FTS5, and integrates through three layers: Hooks (deterministic auto-injection), Skills (LLM-guided), and MCP (universal protocol).

**Status:** Phase 0 complete (infrastructure). Monorepo scaffold ready, no feature code yet.

## Tech Stack

- **Runtime:** TypeScript 5.7+, Node.js ≥ 22 LTS, ESM only
- **CLI:** Commander.js, tsup (bundler), pnpm workspaces (monorepo)
- **Data:** better-sqlite3, Drizzle ORM, SQLite FTS5, gray-matter (YAML frontmatter), js-tiktoken
- **MCP:** @modelcontextprotocol/sdk
- **Testing:** Vitest, ESLint 9.x (flat config), Prettier 3.x
- **CI:** GitHub Actions (Node 22+24, Ubuntu/macOS/Windows matrix)
- **Release:** changesets (semantic versioning + npm publish)

## Build Commands

```bash
pnpm install          # Install dependencies
pnpm build            # tsup bundling all packages (core first, then cli/mcp)
pnpm dev              # Watch mode (all packages in parallel)
pnpm test             # Vitest run
pnpm test:watch       # Vitest watch mode
pnpm test:bench       # Performance benchmarks
pnpm typecheck        # tsc --noEmit (all packages)
pnpm lint             # ESLint (flat config)
pnpm format           # Prettier write
pnpm format:check     # Prettier check
pnpm clean            # Remove dist/ from all packages
```

## Architecture (Three-Layer Integration)

**Layer 1 — Hooks (Deterministic, 100% execution guarantee):**
- `SessionStart` → inject project context (< 200ms)
- `PreToolUse` → show contextual gotchas before file edits (< 10ms, critical path)
- `PostToolUse` → track file changes (< 20ms)
- `PreCompact` → snapshot memory before compaction
- `Stop` → auto-extract learnings from session

**Layer 2 — Skill (Intelligent):**
- SKILL.md + scripts (search.sh, save.sh, read.sh) for manual memory operations
- Progressive disclosure: ~50 tokens metadata overhead until needed

**Layer 3 — MCP (Universal):**
- Tools: `ctx_search`, `ctx_save`, `ctx_read`, `ctx_update`, `ctx_deprecate`
- Resource: `ctx://project-context`
- Works across all supported agents

## Monorepo Structure

```
packages/
  core/       @ctxvault/core — memory CRUD, SQLite+FTS5 index, injection, extraction, decay
  cli/        ctxvault — CLI commands, hooks, agent detection, skill generation
  mcp/        @ctxvault/mcp — MCP server (standalone process)
```

## Memory Types (stored in `.ctx/`)

| Directory | Purpose |
|-----------|---------|
| `system/` | Always-on context: architecture, conventions, stack |
| `gotchas/` | Surprises and traps encountered |
| `decisions/` | Architecture Decision Records |
| `solutions/` | Problem → Diagnosis → Fix patterns |
| `discoveries/` | Codebase insights |

Memory files use YAML frontmatter (type, tags, relevance, summary, related_files) + Markdown body.

## Key Design Constraints

- **Performance:** PreToolUse hook < 10ms (indexed file_path lookup, exit 0 if no matches). SessionStart < 200ms. FTS5 search < 50ms.
- **Progressive disclosure:** L1 summary (~50 tokens), L2 context (~100-300 tokens), L3 full (~300-1000 tokens).
- **Relevance decay:** `relevance(t) = base × e^(-λ × days_since_access)`, archive at < 0.2, delete at < 0.05 after 90 days.
- **Security:** Regex filters exclude sensitive data (API keys, tokens) from auto-extraction. `vault.db` and `sessions/` are gitignored; `.ctx/` memory files are committed and code-reviewable.
- **Database:** SQLite FTS5 with BM25 ranking (porter tokenizer, unicode61). Drizzle ORM for type-safe queries.

## Key Files

- `docs/CtxVault-PRD-v2.md` — Product Requirements Document (~1,450 lines)
- `docs/CtxVault-Architecture.md` — Technical architecture (~1,030 lines)
- `docs/IMPLEMENTATION-PLAN.md` — Step-by-step implementation checklist

## ESM Conventions

- All relative imports must use `.js` extension (`import { foo } from './bar.js'`)
- tsup externals: cli and mcp packages do NOT bundle `@ctxvault/core`
- `verbatimModuleSyntax: true` — explicit `import type` required
