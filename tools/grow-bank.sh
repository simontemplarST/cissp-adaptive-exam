#!/usr/bin/env bash
# ============================================================================
# Grow the CISSP question bank by a batch of N new questions, end to end:
#   generate (Nemotron, free) -> verify (Claude Sonnet, paid) -> merge/dedupe
#   -> validate -> commit -> push -> confirm GitHub Pages rebuild.
#
# Usage:
#   tools/grow-bank.sh [COUNT]
#   GEN_MODEL=... VERIFY_MODEL=... tools/grow-bank.sh [COUNT]   # override models
#
# Defaults: COUNT=300, GEN_MODEL=nemotron-3-ultra (free), VERIFY_MODEL=Sonnet (paid)
# Requires tools/.env with OPENROUTER_API_KEY set.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

COUNT="${1:-300}"
GEN_MODEL="${GEN_MODEL:-nvidia/nemotron-3-ultra-550b-a55b:free}"
VERIFY_MODEL="${VERIFY_MODEL:-anthropic/claude-sonnet-5}"
STAGING="tools/.batch-staging.js"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

echo "▶ growing question bank by ~${COUNT}  (generate: ${GEN_MODEL}  |  verify: ${VERIFY_MODEL})"

if [ ! -f tools/.env ]; then
  echo "✗ tools/.env not found (needs OPENROUTER_API_KEY)"; exit 1
fi
set -a; source tools/.env; set +a

rm -f tools/.progress.json "$STAGING"

GEN_COUNT="$COUNT" BATCH=8 CONCURRENCY=4 \
  OPENROUTER_MODEL="$GEN_MODEL" \
  VERIFY_MODEL="$VERIFY_MODEL" \
  OUT_FILE="$STAGING" \
  node tools/generate-questions.mjs 2>&1 | tee "tools/logs/grow-${TS}.log"

echo "▶ merging staged batch into assets/llm-bank.js"
BATCH_FILE="$STAGING" node tools/merge-batch.mjs

echo "▶ validating merged bank"
node tools/validate-bank.mjs

echo "▶ committing and pushing"
git add assets/llm-bank.js
if git diff --cached --quiet; then
  echo "  (no changes to commit — batch produced nothing new)"
else
  git commit -q -m "Grow question bank (+batch, target ${COUNT}, ${TS})

Generated via ${GEN_MODEL}, independently verified by ${VERIFY_MODEL},
deduped against the full existing pool before merge.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  git push -q origin main
  echo "  pushed"

  echo "▶ waiting for GitHub Pages rebuild"
  for i in $(seq 1 20); do
    st=$(gh api /repos/simontemplarST/cissp-adaptive-exam/pages/builds/latest --jq '.status' 2>/dev/null || echo "")
    echo "  attempt $i: ${st:-unknown}"
    [ "$st" = "built" ] && break
    sleep 8
  done
fi

rm -f "$STAGING"
echo "✓ done"
