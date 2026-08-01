#!/usr/bin/env bash
# Jobotic monorepo — first-time setup
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo ""
echo "🚀 Jobotic Setup"
echo "================"
echo ""

# ── Prerequisites ──────────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install Node 20+ from https://nodejs.org"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "❌ npm is required"; exit 1; }

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d'.' -f1)
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "⚠️  Node.js 20+ recommended (found $(node -v)). Continuing anyway..."
fi

echo "✓ Node $(node -v)"
echo "✓ npm  $(npm -v)"
echo ""

# ── Dependencies ─────────────────────────────────────────────────────────────
echo "📦 Installing dependencies..."
npm install
echo ""

# ── Environment file ─────────────────────────────────────────────────────────
if [[ ! -f .env.local ]]; then
  echo "📝 Creating .env.local from .env.example..."
  cp .env.example .env.local
  echo "   Created .env.local — you must fill in API keys before running."
else
  echo "✓ .env.local already exists (not overwritten)"
fi
echo ""

# ── Make scripts executable ──────────────────────────────────────────────────
chmod +x scripts/setup.sh scripts/check-env.sh scripts/sync-convex-env.sh 2>/dev/null || true

# ── Optional: env check (non-fatal on first run) ───────────────────────────────
echo "🔍 Checking environment..."
if bash scripts/check-env.sh; then
  ENV_OK=true
else
  ENV_OK=false
fi
echo ""

# ── Convex login hint ────────────────────────────────────────────────────────
if npx convex whoami >/dev/null 2>&1; then
  echo "✓ Logged in to Convex ($(npx convex whoami 2>/dev/null | head -1 || echo 'ok'))"
else
  echo "○ Not logged in to Convex yet — you'll need: npx convex login"
fi
echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════"
echo "✅ Setup script finished."
echo ""
echo "📖 Full guide:  SETUP.md"
echo ""
echo "Quick path to running locally:"
echo ""
echo "  1. Edit .env.local with your API keys (see SETUP.md §2)"
echo "  2. npx convex login"
echo "  3. npm run sync:convex-env    # push backend keys to Convex"
echo "  4. npm run dev:convex         # terminal 1 — Convex backend"
echo "  5. npm run dev                # terminal 2 — Next.js frontend"
echo ""
echo "Useful commands:"
echo "  npm run check:env             # validate .env.local"
echo "  npm run sync:convex-env       # re-push keys after edits"
echo "  npm run migrate:export        # export old Supabase data"
echo ""

if [[ "${ENV_OK:-false}" == "false" ]]; then
  echo "⚠️  Environment is incomplete — follow SETUP.md before starting dev servers."
fi

echo "Open http://localhost:3000 when both servers are running."
echo ""
