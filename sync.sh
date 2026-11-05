#!/bin/bash
# Pousse les changements (page, sources, données) sur GitHub, et relance un push resté en échec.
cd "$(dirname "$0")" || exit 1
git pull --rebase --quiet origin main 2>/dev/null
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit --quiet -m "Mise à jour du $(date '+%Y-%m-%d %H:%M')"
fi
git fetch --quiet origin main 2>/dev/null
if [ -n "$(git log --oneline origin/main..HEAD 2>/dev/null)" ]; then
  git push --quiet origin main && echo "$(date '+%F %T') poussé" || echo "$(date '+%F %T') échec du push (nouvel essai au prochain passage)"
fi
