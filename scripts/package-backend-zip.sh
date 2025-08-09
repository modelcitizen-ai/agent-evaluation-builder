#!/usr/bin/env bash
# Build a production zip for the backend (PostgreSQL) without deploying.
# Output: deployment-backend-built.zip in the repo root.

set -euo pipefail

echo "⏳ Building backend release zip (no deploy)…"

# Prereqs
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js not found (need v18+)." >&2
  exit 1
fi

node_major=$(node -v | sed -E 's/^v([0-9]+).*/\1/')
if [ "${node_major}" -lt 18 ]; then
  echo "❌ Node.js v18+ required. Current: $(node -v)" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

echo "📦 Installing deps…"
npm install --legacy-peer-deps --no-fund --no-audit

echo "🏗️  Building Next.js app…"
npm run build

tmpdir=$(mktemp -d)
echo "📁 Staging in: ${tmpdir}"

cp -R . "${tmpdir}/"
cd "${tmpdir}"

# Keep .next and app sources; drop dev-only clutter
rm -rf node_modules .git *.log .env* __tests__ docs *.md deployment_*.zip || true

if [ ! -d .next ]; then
  echo "❌ .next build missing; build may have failed." >&2
  exit 1
fi

echo "🛠️  Setting production start…"
sed -i '' 's/"dev": "next dev"/"start": "node server.js"/' package.json 2>/dev/null || true
sed -i '' 's/"start": "next start"/"start": "node server.js"/' package.json 2>/dev/null || true
sed -i 's/"dev": "next dev"/"start": "node server.js"/' package.json 2>/dev/null || true
sed -i 's/"start": "next start"/"start": "node server.js"/' package.json 2>/dev/null || true

echo "📦 Installing production deps into package…"
npm install --legacy-peer-deps --no-fund --no-audit

cd - >/dev/null

out_zip="${repo_root}/deployment-backend-built.zip"
echo "🗜️  Creating ${out_zip}…"
cd "${tmpdir}"
zip -r "${out_zip}" . -x "*.DS_Store" ".git/*" "*.log" "node_modules/.cache/*" >/dev/null
cd - >/dev/null

rm -rf "${tmpdir}"
echo "✅ Done: ${out_zip}"
