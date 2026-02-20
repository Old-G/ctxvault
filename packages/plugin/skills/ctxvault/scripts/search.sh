#!/usr/bin/env bash
# Search memories — uses ctx if available, falls back to grep
QUERY="$*"

if [ -z "$QUERY" ]; then
  echo "Usage: search.sh <query>" >&2
  exit 1
fi

if command -v ctx &> /dev/null && [ -d ".ctx" ]; then
  ctx search "$QUERY"
else
  # Fallback: grep through .ctx/ markdown files
  if [ ! -d ".ctx" ]; then
    echo "No .ctx directory found." >&2
    exit 1
  fi
  echo "# Search results for: $QUERY"
  echo ""
  grep -rl --include="*.md" "$QUERY" .ctx/ 2>/dev/null | while read -r file; do
    # Extract summary from frontmatter
    summary=$(grep -m1 "^summary:" "$file" 2>/dev/null | sed 's/^summary: *//')
    type=$(grep -m1 "^type:" "$file" 2>/dev/null | sed 's/^type: *//')
    echo "- [$type] $file — $summary"
  done
fi
