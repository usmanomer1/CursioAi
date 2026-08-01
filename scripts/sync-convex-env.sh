#!/usr/bin/env bash
# Push backend environment variables from .env.local into your Convex deployment.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env.local not found. Run: npm run setup"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

is_placeholder() {
  local val="$1"
  [[ -z "$val" ]] && return 0
  [[ "$val" == *"..."* ]] && return 0
  [[ "$val" == "your_"* ]] && return 0
  [[ "$val" == "https://placeholder."* ]] && return 0
  [[ "$val" == "https://your-"* ]] && return 0
  return 1
}

# ── Legacy / alias names in .env.local → names Convex code reads ─────────────
if [[ -z "${JSEARCH_API_KEY:-}" && -n "${RAPIDAPI_KEY:-}" ]]; then
  JSEARCH_API_KEY="$RAPIDAPI_KEY"
  echo "ℹ️  Mapped RAPIDAPI_KEY → JSEARCH_API_KEY (Convex expects JSEARCH_API_KEY)"
fi

if [[ -z "${CLERK_FRONTEND_API_URL:-}" && -n "${CLERK_JWT_ISSUER_DOMAIN:-}" ]]; then
  if ! is_placeholder "$CLERK_JWT_ISSUER_DOMAIN"; then
    CLERK_FRONTEND_API_URL="$CLERK_JWT_ISSUER_DOMAIN"
    echo "ℹ️  Mapped CLERK_JWT_ISSUER_DOMAIN → CLERK_FRONTEND_API_URL"
  fi
fi

# Optional: mirror frontend billing flag to Convex if only NEXT_PUBLIC_ is set
if [[ -z "${CLERK_BILLING_ENFORCED:-}" && -n "${NEXT_PUBLIC_BILLING_ENFORCED:-}" ]]; then
  CLERK_BILLING_ENFORCED="$NEXT_PUBLIC_BILLING_ENFORCED"
fi
if [[ -z "${CLERK_PAID_PLAN:-}" && -n "${NEXT_PUBLIC_CLERK_PAID_PLAN:-}" ]]; then
  CLERK_PAID_PLAN="$NEXT_PUBLIC_CLERK_PAID_PLAN"
fi

# Variables read by Convex functions (see convex/auth.config.ts, lib/jsearch, etc.)
CONVEX_VARS=(
  CLERK_FRONTEND_API_URL
  OPENROUTER_API_KEY
  OPENROUTER_MODEL
  JSEARCH_API_KEY
  JSEARCH_BASE_URL
  CLERK_BILLING_ENFORCED
  CLERK_PAID_PLAN
  MIGRATION_SECRET
)

echo ""
echo "🔄 Syncing backend env vars to Convex..."
echo "   Source: .env.local → npx convex env set"
echo ""

SYNCED=0
SKIPPED=0

for var in "${CONVEX_VARS[@]}"; do
  val="${!var:-}"
  if is_placeholder "$val"; then
    echo "   ○ skip $var (not set or placeholder)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  echo "   → set $var"
  npx convex env set "$var" "$val"
  SYNCED=$((SYNCED + 1))
done

echo ""
echo "✅ Synced $SYNCED variable(s), skipped $SKIPPED optional/unset."
echo ""
echo "These stay in .env.local only (Next.js / scripts — NOT pushed to Convex):"
echo "   NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,"
echo "   SUPABASE_*, EXPORT_FILE, etc."
echo ""
if [[ -z "${JSEARCH_API_KEY:-}" ]] || is_placeholder "${JSEARCH_API_KEY:-}"; then
  echo "⚠️  Job search needs JSEARCH_API_KEY in .env.local"
  echo "   (or RAPIDAPI_KEY — we auto-map that name on sync)"
  echo ""
fi
echo "Next: restart or keep running  npm run dev:convex"
echo ""
