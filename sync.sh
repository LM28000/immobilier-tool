#!/bin/bash
# Pousse les changements (page, sources, données) sur GitHub.
cd "$(dirname "$0")" || exit 1
git pull --rebase --quiet origin main 2>/dev/null
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit --quiet -m "Mise à jour du $(date '+%Y-%m-%d %H:%M')"
  git push --quiet origin main && echo "$(date '+%F %T') poussé" || echo "$(date '+%F %T') échec du push"
fi
