#!/usr/bin/env bash
# Validates .env.local — reports missing or placeholder values.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env.local}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

is_placeholder() {
  local val="$1"
  [[ -z "$val" ]] && return 0
  [[ "$val" == *"..."* ]] && return 0
  [[ "$val" == "your_"* ]] && return 0
  [[ "$val" == "pk_test_..." ]] && return 0
  [[ "$val" == "sk_test_..." ]] && return 0
  [[ "$val" == "sk-or-..." ]] && return 0
  [[ "$val" == "whsec_..." ]] && return 0
  [[ "$val" == "price_..." ]] && return 0
  [[ "$val" == "dev:your-deployment" ]] && return 0
  [[ "$val" == "https://your-deployment.convex.cloud" ]] && return 0
  [[ "$val" == "https://your-instance.clerk.accounts.dev" ]] && return 0
  return 1
}

read_env_var() {
  local key="$1"
  if [[ ! -f "$ENV_FILE" ]]; then
    echo ""
    return
  fi
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2- | sed 's/^["'\'']//;s/["'\'']$//' || true
}

check_var() {
  local key="$1"
  local label="$2"
  local required="$3"
  local val
  val="$(read_env_var "$key")"

  if is_placeholder "$val"; then
    if [[ "$required" == "required" ]]; then
      echo -e "  ${RED}✗${NC} $label ($key)"
      MISSING_REQUIRED=$((MISSING_REQUIRED + 1))
    else
      echo -e "  ${YELLOW}○${NC} $label ($key) — optional, not set"
      MISSING_OPTIONAL=$((MISSING_OPTIONAL + 1))
    fi
  else
    echo -e "  ${GREEN}✓${NC} $label ($key)"
    OK=$((OK + 1))
  fi
}

OK=0
MISSING_REQUIRED=0
MISSING_OPTIONAL=0

echo ""
echo "Environment check: ${ENV_FILE}"
echo "────────────────────────────────────────"

if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}No .env.local found.${NC} Run: npm run setup"
  exit 1
fi

echo ""
echo "Required — app will not work without these:"
check_var "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "Clerk publishable key" required
check_var "CLERK_SECRET_KEY" "Clerk secret key" required
check_var "CLERK_FRONTEND_API_URL" "Clerk Frontend API URL (Convex auth)" required
check_var "NEXT_PUBLIC_CONVEX_URL" "Convex deployment URL" required
check_var "OPENROUTER_API_KEY" "OpenRouter API key (Convex backend)" required

echo ""
echo "Required for job search:"
JSEARCH_VAL="$(read_env_var JSEARCH_API_KEY)"
RAPID_VAL="$(read_env_var RAPIDAPI_KEY)"
if ! is_placeholder "$JSEARCH_VAL"; then
  echo -e "  ${GREEN}✓${NC} JSearch API key (JSEARCH_API_KEY)"
  OK=$((OK + 1))
elif ! is_placeholder "$RAPID_VAL"; then
  echo -e "  ${GREEN}✓${NC} JSearch API key (RAPIDAPI_KEY — rename to JSEARCH_API_KEY or sync will map it)"
  OK=$((OK + 1))
else
  echo -e "  ${RED}✗${NC} JSearch API key (JSEARCH_API_KEY or RAPIDAPI_KEY)"
  MISSING_REQUIRED=$((MISSING_REQUIRED + 1))
fi

echo ""
echo "Optional — billing (app runs without paywall if unset):"
check_var "NEXT_PUBLIC_CLERK_PAID_PLAN" "Clerk Billing plan slug" optional
check_var "CLERK_BILLING_ENFORCED" "Enforce paywall server-side (Convex)" optional

echo ""
echo "Optional — migration from old Supabase app:"
check_var "SUPABASE_URL" "Supabase URL" optional
check_var "SUPABASE_SERVICE_ROLE_KEY" "Supabase service role key" optional

echo ""
echo "────────────────────────────────────────"
echo -e "Configured: ${GREEN}${OK}${NC}  |  Required missing: ${RED}${MISSING_REQUIRED}${NC}  |  Optional missing: ${YELLOW}${MISSING_OPTIONAL}${NC}"
echo ""

if [[ "$MISSING_REQUIRED" -gt 0 ]]; then
  echo -e "${YELLOW}Tip:${NC} Copy .env.example → .env.local and fill in values."
  echo "     See SETUP.md for step-by-step instructions."
  echo ""
  echo -e "${YELLOW}Remember:${NC} Backend keys (OpenRouter, JSearch, CLERK_FRONTEND_API_URL)"
  echo "     must also be set in Convex: npm run sync:convex-env"
  exit 1
fi

echo -e "${GREEN}Core environment looks good.${NC} Run npm run sync:convex-env if you changed backend keys."
exit 0
