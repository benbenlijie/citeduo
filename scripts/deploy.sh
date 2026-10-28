#!/usr/bin/env bash
# One-command publish of the local tree to a host you own.
#
# Usage:
#   scripts/deploy.sh                 # build web + sync + bun install + restart + healthcheck
#   SKIP_WEB=1 scripts/deploy.sh      # backend/config-only change (no web build)
#   SKIP_INSTALL=1 scripts/deploy.sh  # dependencies unchanged (no bun install)
#   SKIP_RESTART=1 scripts/deploy.sh  # sync only
#
# Configuration lives in scripts/deploy.env, which is git-ignored on purpose: it
# names your host, paths and public URL, and those are nobody else's business.
# Copy scripts/deploy.env.example and fill it in. Anything can still be overridden
# from the environment, which wins over the file:
#
#   REMOTE=myhost                    ssh host/alias to deploy to (required)
#   DIR=/opt/citeduo                 remote install dir
#   VITE_BASE=/papers/               frontend base path (must match your proxy sub-path)
#   SERVICE=citeduo                  systemd unit name
#   PUBLIC_URL=https://example.com/papers/   healthcheck URL (skipped when empty)
#   REMOTE_BUN=/root/.bun/bin/bun    remote bun binary (used when not on PATH)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONF="${DEPLOY_CONF:-$ROOT/scripts/deploy.env}"
if [ -f "$CONF" ]; then
  # shellcheck disable=SC1090
  set -a
  . "$CONF"
  set +a
fi

REMOTE="${REMOTE:-}"
DIR="${DIR:-/opt/citeduo}"
VITE_BASE="${VITE_BASE:-/}"
SERVICE="${SERVICE:-citeduo}"
PUBLIC_URL="${PUBLIC_URL:-}"
REMOTE_BUN="${REMOTE_BUN:-bun}"

if [ -z "$REMOTE" ]; then
  echo "deploy: REMOTE is unset." >&2
  echo "        cp scripts/deploy.env.example scripts/deploy.env and fill it in," >&2
  echo "        or run: REMOTE=myhost scripts/deploy.sh" >&2
  exit 1
fi

cd "$ROOT"

if [ "${SKIP_WEB:-0}" != "1" ]; then
  echo "==> build frontend (VITE_BASE=$VITE_BASE)"
  VITE_BASE="$VITE_BASE" pnpm --dir academic-paper-explorer build
else
  echo "==> skip frontend build (SKIP_WEB=1)"
fi

echo "==> rsync -> $REMOTE:$DIR"
rsync -az --delete \
  --exclude '.git' \
  --exclude '.omo' \
  --exclude 'node_modules' \
  --exclude 'academic-paper-explorer/node_modules' \
  --exclude 'data' \
  --exclude 'server/.env' \
  --exclude 'server/.env.bak.*' \
  --exclude 'deploy/opencode.env' \
  --exclude 'sub_tasks' \
  --exclude 'user_input_files' \
  --exclude 'docs' \
  --exclude '.tmp' \
  --exclude 'scripts/deploy.env' \
  ./ "$REMOTE:$DIR/"

# The server has a runtime dependency (unpdf, for the PDF text fallback) and
# node_modules is excluded from the sync, so the remote installs it itself.
# bun is often missing from a non-interactive ssh PATH (the systemd unit uses an
# absolute path), so fall back to REMOTE_BUN.
if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  echo "==> bun install on $REMOTE"
  ssh "$REMOTE" "cd $DIR && bun_bin=\$(command -v bun || echo '$REMOTE_BUN') && \"\$bun_bin\" install --frozen-lockfile --production"
else
  echo "==> skip bun install (SKIP_INSTALL=1)"
fi

if [ "${SKIP_RESTART:-0}" != "1" ]; then
  echo "==> restart $SERVICE"
  ssh "$REMOTE" "systemctl restart $SERVICE && sleep 1 && systemctl is-active $SERVICE"
else
  echo "==> skip restart (SKIP_RESTART=1)"
fi

if [ -n "$PUBLIC_URL" ]; then
  echo "==> healthcheck"
  ssh "$REMOTE" "curl -s -o /dev/null -w '  $PUBLIC_URL -> %{http_code}\n' '$PUBLIC_URL' || true"
else
  echo "==> healthcheck skipped (PUBLIC_URL unset)"
fi
echo "done."
