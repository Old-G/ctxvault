#!/usr/bin/env bash
# Read a memory file — uses ctx if available, falls back to cat
FILE="$1"

if [ -z "$FILE" ]; then
  echo "Usage: read.sh <path>" >&2
  exit 1
fi

if command -v ctx &> /dev/null; then
  ctx show "$FILE"
else
  # Fallback: directly cat the file
  if [ ! -f "$FILE" ]; then
    echo "File not found: $FILE" >&2
    exit 1
  fi
  cat "$FILE"
fi
