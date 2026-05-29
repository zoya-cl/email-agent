#!/usr/bin/env bash
# Deploy to Vercel production.
#
# Usage:
#   ./scripts/deploy.sh             # sync env + push git + deploy + smoke-test
#   ./scripts/deploy.sh --no-git    # skip git push (deploy current working tree)
#   ./scripts/deploy.sh --preview   # preview deploy instead of production
#   ./scripts/deploy.sh --skip-env  # skip env-var sync (deploy as-is)
#
# Env-var sync logic:
#   - Reads .env.local for known keys (UPSTASH_*, WEBHOOK_URL, DASHBOARD_*).
#   - Lists keys present in Vercel production.
#   - For each REQUIRED key: if missing locally and in Vercel, prompts you.
#   - Saves any new value to .env.local AND pushes it to Vercel.
#   - Optional keys are only synced if you already have them locally.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PUSH_GIT=1
PROD_FLAG="--prod"
DO_ENV=1
ENV_FILE=".env.local"

for arg in "$@"; do
  case "$arg" in
    --no-git)   PUSH_GIT=0 ;;
    --preview)  PROD_FLAG="" ;;
    --skip-env) DO_ENV=0 ;;
    -h|--help)
      sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

# --- helpers -----------------------------------------------------------------

load_local() {
  [ -f "$ENV_FILE" ] || return 0
  while IFS='=' read -r key val; do
    [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
    val="${val%$'\r'}"
    export "$key=$val"
  done < "$ENV_FILE"
}

write_local() {
  local key=$1 value=$2
  touch "$ENV_FILE"
  if [ -s "$ENV_FILE" ] && grep -q "^$key=" "$ENV_FILE"; then
    grep -v "^$key=" "$ENV_FILE" > "$ENV_FILE.tmp" || true
    mv "$ENV_FILE.tmp" "$ENV_FILE"
  fi
  echo "$key=$value" >> "$ENV_FILE"
}

vercel_keys=""
load_vercel_keys() {
  vercel_keys="$(vercel env ls production 2>/dev/null || true)"
}

vercel_has() {
  echo "$vercel_keys" | awk '{print $1}' | grep -qxF "$1"
}

prompt_value() {
  local key=$1 desc=$2 secret=$3 val
  if ! [ -t 0 ]; then
    echo "stdin is not a TTY; cannot prompt for $key" >&2
    return 1
  fi
  if [ "$secret" = "1" ]; then
    read -rsp "  $key — $desc: " val < /dev/tty; echo
  else
    read -rp  "  $key — $desc: " val < /dev/tty
  fi
  printf '%s' "$val"
}

ensure_key() {
  local key=$1 desc=$2 required=$3 secret=$4
  local current="${!key:-}"
  local in_vercel=0
  vercel_has "$key" && in_vercel=1

  if [ -z "$current" ] && [ "$in_vercel" = "1" ]; then
    echo "  $key — present in Vercel ✓ (not stored locally)"
    return 0
  fi

  if [ -z "$current" ]; then
    if [ "$required" = "1" ]; then
      current="$(prompt_value "$key" "$desc" "$secret")" || exit 1
      [ -n "$current" ] || { echo "$key is required" >&2; exit 1; }
    else
      echo "  $key — not set, skipped (optional)"
      return 0
    fi
  fi

  write_local "$key" "$current"

  if [ "$in_vercel" = "1" ]; then
    echo "  $key — present in Vercel ✓"
  else
    echo "  $key — pushing to Vercel..."
    printf '%s' "$current" | vercel env add "$key" production >/dev/null 2>&1 \
      || { echo "    failed to add $key to Vercel" >&2; exit 1; }
    echo "    pushed ✓"
  fi
}

# --- preflight ---------------------------------------------------------------

echo "==> Preflight"
command -v vercel >/dev/null || { echo "vercel CLI not installed: npm i -g vercel" >&2; exit 1; }
[ -f package.json ] || { echo "not in project root" >&2; exit 1; }

# --- env sync ----------------------------------------------------------------

if [ "$DO_ENV" = "1" ]; then
  echo "==> Sync env vars (.env.local ↔ Vercel)"
  load_local
  load_vercel_keys

  ensure_key UPSTASH_REDIS_REST_URL   "Upstash Redis REST URL"           1 0
  ensure_key UPSTASH_REDIS_REST_TOKEN "Upstash Redis REST token"         1 1
  ensure_key WEBHOOK_URL              "fire-and-forget event receiver"   0 0
  ensure_key DASHBOARD_USER           "Basic-Auth username for /"        0 0
  ensure_key DASHBOARD_PASSWORD       "Basic-Auth password for /"        0 1
fi

# --- git push ----------------------------------------------------------------

if [ "$PUSH_GIT" = "1" ]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "uncommitted changes — commit or stash first, or rerun with --no-git" >&2
    git status --short
    exit 1
  fi
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  echo "==> git push origin $BRANCH"
  git push origin "$BRANCH"
fi

# --- deploy ------------------------------------------------------------------

echo "==> vercel deploy ${PROD_FLAG:-(preview)}"
DEPLOY_URL="$(vercel $PROD_FLAG --yes 2>&1 | tee /dev/stderr | grep -Eo 'https://[^[:space:]]+\.vercel\.app' | tail -1)"

if [ -z "${DEPLOY_URL:-}" ]; then
  echo "could not parse deploy URL from vercel output" >&2
  exit 1
fi

# --- smoke test (public endpoints only) --------------------------------------

echo
echo "==> Smoke test: $DEPLOY_URL  (public endpoints only)"
TRACK_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  "$DEPLOY_URL/api/track?id=deploy-smoke-test&campaign=ci")"
CLICK_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  "$DEPLOY_URL/api/click?id=deploy-smoke-test&campaign=ci&url=https%3A%2F%2Fexample.com")"

echo "  /api/track  → $TRACK_STATUS  (expect 200)"
echo "  /api/click  → $CLICK_STATUS  (expect 302)"

FAIL=0
[ "$TRACK_STATUS" = "200" ] || FAIL=1
[ "$CLICK_STATUS" = "302" ] || FAIL=1
if [ "$FAIL" = "1" ]; then
  echo "smoke test failed — investigate" >&2
  exit 1
fi

echo
echo "==> Deployed: $DEPLOY_URL"
