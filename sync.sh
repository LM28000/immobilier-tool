#!/bin/bash
# Pousse index.html sur GitHub s'il a changé.
cd "$(dirname "$0")" || exit 1
git pull --rebase --quiet origin main 2>/dev/null
if [ -n "$(git status --porcelain index.html)" ]; then
  git add index.html
  git commit --quiet -m "Mise à jour du $(date '+%Y-%m-%d %H:%M')"
  git push --quiet origin main && echo "$(date '+%F %T') poussé" || echo "$(date '+%F %T') échec du push"
fi
