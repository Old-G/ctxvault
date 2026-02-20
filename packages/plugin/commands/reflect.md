---
name: reflect
description: Analyze recent sessions and extract new memories
arguments:
  - name: mode
    description: "Extraction mode: --dry-run to preview"
    required: false
---
Run: `ctx reflect $ARGUMENTS`

Analyze recent session snapshots and extract new memories (gotchas, decisions, solutions, discoveries).
Show what was extracted and deduplicated.
