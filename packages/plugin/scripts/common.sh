#!/usr/bin/env bash
# Common utilities for CtxVault plugin scripts

# Check if ctx CLI is available
check_ctx() {
  if ! command -v ctx &> /dev/null; then
    echo "Error: ctx CLI not found. Install with: npm install -g ctxvault" >&2
    exit 1
  fi
}

# Check if .ctx directory exists
check_vault() {
  if [ ! -d ".ctx" ]; then
    echo "Error: No .ctx directory found. Run 'ctx init' first." >&2
    exit 1
  fi
}
