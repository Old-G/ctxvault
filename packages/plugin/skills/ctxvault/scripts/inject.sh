#!/usr/bin/env bash
# Inject project context — uses ctx if available, falls back to cat
if command -v ctx &> /dev/null && [ -d ".ctx" ]; then
  ctx inject --format compact
else
  # Fallback: concatenate .ctx/ markdown files
  if [ ! -d ".ctx" ]; then
    echo "No .ctx directory found." >&2
    exit 1
  fi
  echo "# Project Memory Context"
  echo ""
  find .ctx -name "*.md" -not -name "config.yaml" -not -name "SKILL.md" | sort | while read -r file; do
    type=$(grep -m1 "^type:" "$file" 2>/dev/null | sed 's/^type: *//')
    summary=$(grep -m1 "^summary:" "$file" 2>/dev/null | sed 's/^summary: *//')
    if [ -n "$summary" ]; then
      echo "## [$type] $summary"
      # Print content after frontmatter (after second ---)
      awk '/^---$/{c++;next} c>=2' "$file"
      echo ""
    fi
  done
fi
