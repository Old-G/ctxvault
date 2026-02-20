#!/usr/bin/env bash
# List memories — uses ctx if available, falls back to find
TYPE="$1"

if command -v ctx &> /dev/null && [ -d ".ctx" ]; then
  if [ -n "$TYPE" ]; then
    ctx list --type "$TYPE"
  else
    ctx list
  fi
else
  # Fallback: find .md files in .ctx/
  if [ ! -d ".ctx" ]; then
    echo "No .ctx directory found." >&2
    exit 1
  fi

  if [ -n "$TYPE" ]; then
    SEARCH_DIR=".ctx/${TYPE}s"
  else
    SEARCH_DIR=".ctx"
  fi

  if [ ! -d "$SEARCH_DIR" ]; then
    echo "No memories of type '$TYPE' found."
    exit 0
  fi

  find "$SEARCH_DIR" -name "*.md" | sort | while read -r file; do
    type=$(grep -m1 "^type:" "$file" 2>/dev/null | sed 's/^type: *//')
    summary=$(grep -m1 "^summary:" "$file" 2>/dev/null | sed 's/^summary: *//')
    relevance=$(grep -m1 "^relevance:" "$file" 2>/dev/null | sed 's/^relevance: *//')
    echo "[$type] $file (relevance: ${relevance:-?}) — $summary"
  done
fi
