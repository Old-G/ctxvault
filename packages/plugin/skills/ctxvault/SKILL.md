---
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
```bash
bash .agents/skills/ctxvault/scripts/inject.sh
```

## When to Save Memory

### Gotcha — surprising/counterintuitive behavior
```bash
bash .agents/skills/ctxvault/scripts/save.sh gotcha "summary" "full description"
```

### Decision — architecture or technology choice
```bash
bash .agents/skills/ctxvault/scripts/save.sh decision "summary" "full description"
```

### Solution — problem diagnosed and solved
```bash
bash .agents/skills/ctxvault/scripts/save.sh solution "summary" "full description"
```

### Discovery — new knowledge about the codebase
```bash
bash .agents/skills/ctxvault/scripts/save.sh discovery "summary" "full description"
```

### Convention — coding standard or project pattern
```bash
bash .agents/skills/ctxvault/scripts/save.sh convention "summary" "full description"
```

## When to Search Memory

Before making changes or when you need context:
```bash
bash .agents/skills/ctxvault/scripts/search.sh "query"
```

## Read Full Details
```bash
bash .agents/skills/ctxvault/scripts/read.sh ".ctx/gotchas/react-useeffect.md"
```

## Important
- Memory is stored as Markdown in `.ctx/` — tracked by git, reviewed in PRs
- Always include `--related-files` when saving for better context injection
- In Claude Code: hooks auto-inject context and extract memories
- In other agents: run inject.sh at session start, save when you discover something
