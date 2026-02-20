#!/usr/bin/env bash
# Common utilities for CtxVault plugin scripts

# Check if ctx CLI is available (returns 0 if found, 1 if not)
has_ctx() {
  command -v ctx &> /dev/null
}

# Check if .ctx directory exists
check_vault() {
  if [ ! -d ".ctx" ]; then
    echo "Error: No .ctx directory found. Run 'ctx init' first." >&2
    return 1
  fi
}
