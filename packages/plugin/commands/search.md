---
name: search
description: Search project memory for gotchas, decisions, solutions
arguments:
  - name: query
    description: Search query
    required: true
---
Search CtxVault project memory for: $ARGUMENTS

Run: `bash ${CLAUDE_PLUGIN_ROOT}/skills/ctxvault/scripts/search.sh "$ARGUMENTS"`

Present results grouped by type (gotcha, decision, solution, discovery).
If no results found, suggest broadening the search query.
