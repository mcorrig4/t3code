#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <branch>" >&2
  exit 1
fi

branch="$1"

if [[ "$branch" == "production" ]]; then
  echo "refusing to delete protected branch: production" >&2
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" == "$current_branch" ]]; then
  echo "refusing to delete currently checked out branch: $branch" >&2
  exit 1
fi

if git worktree list --porcelain | awk '/^branch refs\/heads\//{print $2}' | grep -Fxq "refs/heads/$branch"; then
  echo "refusing to delete branch attached to a worktree: $branch" >&2
  exit 1
fi

git branch -d "$branch"
