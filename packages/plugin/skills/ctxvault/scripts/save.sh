#!/usr/bin/env bash
# Save a memory — uses ctx if available, falls back to direct file creation
TYPE="$1"
SUMMARY="$2"
CONTENT="$3"

if [ -z "$TYPE" ] || [ -z "$SUMMARY" ]; then
  echo "Usage: save.sh <type> <summary> <content>" >&2
  exit 1
fi

if command -v ctx &> /dev/null && [ -d ".ctx" ]; then
  ctx save --type "$TYPE" --summary "$SUMMARY" --content "$CONTENT"
else
  # Fallback: create .md file directly in .ctx/<type>s/
  if [ ! -d ".ctx" ]; then
    echo "No .ctx directory found. Run 'ctx init' or create .ctx/ manually." >&2
    exit 1
  fi

  # Generate slug from summary
  SLUG=$(echo "$SUMMARY" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' | head -c 60)
  DIR=".ctx/${TYPE}s"
  mkdir -p "$DIR"
  FILE="$DIR/${SLUG}.md"

  DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  cat > "$FILE" <<EOF
---
type: $TYPE
summary: $SUMMARY
created: $DATE
relevance: 0.8
tags: []
---

$CONTENT
EOF

  echo "Saved: $FILE"
fi
