#!/usr/bin/env bash
# Usage: codex-run <level> "<task>"
#   level: trivial | standard | complex
# Example: codex-run trivial "fix lint errors in HoldingsTable.tsx"
#          codex-run complex "refactor MC engine to support retirement tool"

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
level=${1:-standard}
shift

case $level in
  trivial)  m="gpt-5.4-mini"; e="low"    ;;
  standard) m="gpt-5.4";      e="medium" ;;
  complex)  m="gpt-5.5";      e="high"   ;;
  *)
    echo "Unknown level '$level'. Use: trivial | standard | complex" >&2
    exit 1
    ;;
esac

echo "→ codex exec -m $m effort=$e"
codex exec -m "$m" -c model_reasoning_effort="$e" -s workspace-write -C "$REPO_ROOT" "$@" < /dev/null
