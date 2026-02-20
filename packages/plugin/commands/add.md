---
name: add
description: Add a new memory entry
arguments:
  - name: type
    description: "Memory type: gotcha, decision, solution, discovery, convention"
    required: true
---
Run: `ctx add $ARGUMENTS`

Guide the user through adding a new memory entry of the specified type.
Ask for summary, content, tags, and related files.
