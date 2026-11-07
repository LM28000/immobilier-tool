#!/bin/bash
# Pousse les changements (page, sources, données) sur GitHub, après vérification, et relance un push resté en échec.
# Lancé par launchd (install-sync.sh) toutes les heures et quand index.html change.
# Ne publie rien si : un fichier de données n'est pas un JSON valide, le script de la page ne se lit pas, ou la synchronisation avec GitHub est en conflit.
# En cas de refus : ligne dans sync.log et notification macOS.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
now() { date '+%F %T'; }
# un seul passage à la fois (launchd peut relancer pendant qu'un passage tourne) ; verrou de plus de 30 min = abandonné
L=.git/sync.lock
if ! mkdir "$L" 2>/dev/null; then
  if [ -n "$(find "$L" -maxdepth 0 -mmin +30 2>/dev/null)" ]; then rmdir "$L"; mkdir "$L" || exit 0; else exit 0; fi
fi
trap 'rmdir "$L" 2>/dev/null' EXIT
fail() { echo "$(now) NON PUBLIÉ : $1"; osascript -e "display notification \"$1\" with title \"Notre studio : publication bloquée\"" >/dev/null 2>&1; exit 1; }

# 1. reprendre une synchronisation interrompue plutôt que de committer par-dessus
[ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] && { git rebase --abort >/dev/null 2>&1; fail "rebase interrompu annulé, à vérifier à la main"; }

# 2. vérifications avant tout commit
if [ -n "$(git status --porcelain)" ]; then
  python3 - <<'PY' || fail "données ou page invalides (détail ci-dessus)"
import json, glob, sys
bad = []
for p in sorted(glob.glob("data/*.json") + glob.glob("data/fiches/*.json")):
    try: json.load(open(p, encoding="utf-8"))
    except Exception as e: bad.append(f"{p} : {e}")
for p, name in (("data/annoncesdata.js", "ADS"), ("data/historique.js", "HIST"), ("data/irisdata.js", "IRIS")):
    try: s = open(p, encoding="utf-8").read(); json.loads(s[s.index("{"):s.rindex("}") + 1])
    except Exception as e: bad.append(f"{p} : {e}")
h = open("index.html", encoding="utf-8").read(); i, j = h.rfind("<script>"), h.rfind("</script>")
if i < 0 or j < i or len(h) < 200_000: bad.append("index.html incomplet")
else: open(".sync-check.js", "w", encoding="utf-8").write(h[i + 8:j])
for b in bad: print(b)
sys.exit(1 if bad else 0)
PY
  if command -v node >/dev/null; then
    node --check .sync-check.js 2>.sync-err || { head -5 .sync-err; rm -f .sync-check.js .sync-err; fail "le script de index.html contient une erreur de syntaxe"; }
  else echo "$(now) node introuvable : syntaxe de la page non vérifiée"; fi
  rm -f .sync-check.js .sync-err
  # tests rapides, sans navigateur (calcul, nettoyage des biens, scripts de données, cohérence des villes)
  if command -v node >/dev/null; then node tests/unit.js >.sync-err 2>&1 || { grep "✗" .sync-err | head -5; rm -f .sync-err; fail "tests du calcul en échec"; }; fi
  python3 tests/test_donnees.py >.sync-err 2>&1 || { grep "✗" .sync-err | head -5; rm -f .sync-err; fail "tests des données en échec"; }
  rm -f .sync-err

  # 3. commit avec un message qui dit ce qui a changé
  git add -A
  files=$(git diff --cached --name-only)
  if [ "$(echo "$files" | grep -vcE '^(data/|index\.html$)')" = "0" ] && echo "$files" | grep -q '^data/annoncesdata\.js$'; then
    msg="Annonces du $(date '+%Y-%m-%d')"
    echo "$files" | grep -q '^data/fiches/' && msg="$msg, avec fiches"
  else
    msg="Mise à jour : $(echo "$files" | grep -v '^index\.html$' | head -6 | paste -sd ',' - | sed 's/,/, /g')"
    [ "$(echo "$files" | grep -vc '^index\.html$')" -gt 6 ] && msg="${msg}…"
  fi
  git commit --quiet -m "$msg" || fail "commit impossible"
fi

# 4. récupérer GitHub puis pousser ; un conflit bloque la publication au lieu d'être masqué
git pull --rebase --quiet origin main || { git rebase --abort >/dev/null 2>&1; fail "conflit avec GitHub : à résoudre à la main"; }
if [ -n "$(git log --oneline origin/main..HEAD 2>/dev/null)" ]; then
  git push --quiet origin main && echo "$(now) poussé : $(git log -1 --format=%s)" || echo "$(now) échec du push (nouvel essai au prochain passage)"
fi
