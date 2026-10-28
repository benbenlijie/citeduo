#!/bin/sh
set -eu

: "${LLM_PROVIDERS:?LLM_PROVIDERS is required}"
: "${PAPER_INTERNAL_TOKEN:?PAPER_INTERNAL_TOKEN is required}"
: "${OPENCODE_SERVER_PASSWORD:?OPENCODE_SERVER_PASSWORD is required}"

export HOME=/runtime
export XDG_CONFIG_HOME=/runtime/config
export XDG_DATA_HOME=/runtime/data
export XDG_CACHE_HOME=/runtime/cache
export XDG_STATE_HOME=/runtime/state
export PAPER_API_BASE="${PAPER_API_BASE:-http://127.0.0.1:8787/api}"

mkdir -p "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$XDG_CACHE_HOME" "$XDG_STATE_HOME"
chmod 700 "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$XDG_CACHE_HOME" "$XDG_STATE_HOME"

bun /app/prepare.ts
exec opencode serve --pure --hostname 127.0.0.1 --port "${OPENCODE_PORT:-4096}"
