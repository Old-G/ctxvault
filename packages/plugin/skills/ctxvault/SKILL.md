---
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

```bash
bash .agents/skills/ctxvault/scripts/inject.sh
```

## 2. During Work — Save memories as you go

Every time you encounter one of these, IMMEDIATELY save it:

| Trigger | Type | Example |
|---------|------|---------|
| Bug found, unexpected behavior | gotcha | "SQLite WAL requires shared-memory" |
| Technology/architecture choice | decision | "Chose FTS5 over Elasticsearch" |
| Problem diagnosed and fixed | solution | "Fixed CORS by adding origin whitelist" |
| Learned something about codebase | discovery | "Config supports hot-reload" |
| Agreed on coding pattern | convention | "All API responses use camelCase" |

```bash
bash .agents/skills/ctxvault/scripts/save.sh <type> "<summary>" "<description>"
```

Write summary and description in the **same language the user speaks**.

## 3. Search Before Making Changes

```bash
bash .agents/skills/ctxvault/scripts/search.sh "<query>"
```

## 4. Read Full Memory

```bash
bash .agents/skills/ctxvault/scripts/read.sh "<path>"
```

## Rules

- **Save at least 1 memory per session** — if nothing notable happened, save a discovery
- **Write in the user's language** — not English unless the user speaks English
- **Be specific** — "React useEffect runs twice in StrictMode" not "useEffect issue"
- **Focus on WHY** — explain root cause, reasoning, context
- Memory is stored as Markdown in `.ctx/` — tracked by git, reviewable in PRs
