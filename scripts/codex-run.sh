#!/usr/bin/env bash
# Usage: codex-run [--dry-run] <level> "<task>"
#   level: auto | trivial | standard | complex
# Example: codex-run trivial "fix lint errors in HoldingsTable.tsx"
#          codex-run auto "add tests for the CSV export"
#          codex-run complex "refactor MC engine to support retirement tool"

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dry_run=false

usage() {
  echo "Usage: scripts/codex-run.sh [--dry-run] <auto|trivial|standard|complex> \"<task>\"" >&2
}

if [[ ${1:-} == "--dry-run" ]]; then
  dry_run=true
  shift
fi

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

level=$1
shift

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

if [[ $level == "auto" ]]; then
  task_lower="$(printf '%s' "$*" | tr '[:upper:]' '[:lower:]')"

  case $task_lower in
    *"finance engine"*|*"financial model"*|*"methodology"*|*"monte carlo"*|*"glide-path"*|*"glide path"*|*"retirement engine"*|*"safe withdrawal"*|*"swr"*|*"utility model"*|*"block bootstrap"*|*"architecture"*|*"migration"*|*"security audit"*|*"security fix"*|*"security work"*|*"new tool"*)
      level="complex"
      ;;
    *"fix lint"*|*"lint error"*|*"run format"*|*"formatting only"*|*"fix typo"*|*"copy edit"*|*"update label"*|*"change label"*|*"rename variable"*|*"rename file"*|*"docs link"*)
      level="trivial"
      ;;
    *)
      level="standard"
      ;;
  esac
fi

case $level in
  trivial)  m="gpt-5.4-mini"; e="low"    ;;
  standard) m="gpt-5.4";      e="medium" ;;
  complex)  m="gpt-5.5";      e="high"   ;;
  *)
    echo "Unknown level '$level'. Use: auto | trivial | standard | complex" >&2
    exit 1
    ;;
esac

echo "→ tier=$level model=$m effort=$e"

if [[ $dry_run == true ]]; then
  exit 0
fi

codex exec -m "$m" -c model_reasoning_effort="$e" -s workspace-write -C "$REPO_ROOT" "$@" < /dev/null
