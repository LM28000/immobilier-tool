#!/usr/bin/env python3
"""Tests des scripts de données, sur une copie temporaire : python3 tests/test_donnees.py
- tools/maj_annonces.py : relevé partiel ignoré, disparition après deux relevés, relance le même jour, date par ville, relevé vide refusé
- tools/fiches.py : signaux tirés des descriptions
- cohérence : les mêmes villes dans tools/villes.json, src/js/00-villes-calcul.js et les fichiers de data/
"""
import json, os, re, shutil, subprocess, sys, tempfile, importlib.util

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
n = bad = 0
def ok(name, cond, info=""):
    global n, bad
    n += 1; bad += 0 if cond else 1
    print(("✓ " if cond else "✗ ") + name + ("" if cond or not info else "  → " + str(info)))
L = lambda p: (lambda s: json.loads(s[s.index("{"):s.rindex("}") + 1]))(open(p, encoding="utf-8").read())

# --- maj_annonces.py sur une copie, avec un relevé fabriqué à partir des annonces actuelles
T = tempfile.mkdtemp(); os.makedirs(T + "/tools"); os.makedirs(T + "/data")
shutil.copy(R + "/tools/maj_annonces.py", T + "/tools/")
for f in ("annoncesdata.js", "historique.js", "secteurs-nouvelles-villes.json"):
    if os.path.exists(R + "/data/" + f): shutil.copy(R + "/data/" + f, T + "/data/")
A0 = L(T + "/data/annoncesdata.js")
villes = {ck: {"ads": v["ads"], "ventes": v["ventes"]} for ck, v in A0.items() if isinstance(v, dict) and v.get("ventes") and v.get("ads")}
def run(villes, d, *a):
    json.dump({"date": d, "villes": villes}, open(T + "/data/r.json", "w"))
    p = subprocess.run([sys.executable, "tools/maj_annonces.py", "data/r.json", "--date", d, *a], cwd=T, capture_output=True, text=True)
    try: return p.returncode, json.loads(p.stdout)
    except Exception: return p.returncode, {"sortie": p.stdout + p.stderr}
ck = next(iter(villes)); V = villes[ck]["ventes"]; k = V[0][3]
c, o = run(villes, "2030-01-01"); ok("relevé complet accepté", c == 0 and not o.get("gardes"), o.get("gardes"))
part = json.loads(json.dumps(villes)); part[ck]["ventes"] = V[:2]
c, o = run(part, "2030-01-02"); ok("relevé partiel : liste de la veille gardée", len(o.get("gardes", [])) == 1 and len(L(T + "/data/annoncesdata.js")[ck]["ventes"]) == len(V), o.get("gardes"))
sans = json.loads(json.dumps(villes)); sans[ck]["ventes"] = V[1:]
run(sans, "2030-01-03"); e = L(T + "/data/historique.js")[ck]["v"][k]
ok("une absence : pas encore disparue", e.get("a") == 1 and "g" not in e, e)
run(sans, "2030-01-03"); e = L(T + "/data/historique.js")[ck]["v"][k]
ok("relance le même jour : rien ne change", e.get("a") == 1 and "g" not in e, e)
run(sans, "2030-01-04"); e = L(T + "/data/historique.js")[ck]["v"][k]
ok("deux absences : disparue", e.get("g") == "2030-01-04", e)
c, o = run({}, "2030-01-05"); ok("relevé vide refusé, date inchangée", c == 1 and L(T + "/data/annoncesdata.js")["iso"] == "2030-01-04")
shutil.rmtree(T)

# --- signaux des descriptions
spec = importlib.util.spec_from_file_location("fiches", R + "/tools/fiches.py"); F = importlib.util.module_from_spec(spec); spec.loader.exec_module(F)
ok("signal : vendu loué", F.signaux({"d": "Studio vendu loué 450 € par mois, locataire en place depuis 2022"}) == ["loue"])
ok("signal : résidence de services", "serv" in F.signaux({"d": "Studio en résidence étudiante avec gestionnaire, bail commercial"}))
ok("signal : appart'hôtel", "serv" in F.signaux({"d": "Ce studio (appart'hôtel) bénéficie d'un emplacement idéal"}))
ok("signal : travaux", F.signaux({"d": "Appartement à rénover entièrement"}) == ["trav"])
ok("pas de signal sur une description ordinaire", F.signaux({"d": "Beau studio lumineux proche gare, cuisine équipée"}) == [])

# --- cohérence des villes entre fichiers
villes_json = set(json.load(open(R + "/tools/villes.json")))
code_C = set(re.findall(r'\{k:"([a-z]+)"', open(R + "/src/js/00-villes-calcul.js", encoding="utf-8").read()))
ok("mêmes villes dans tools/villes.json et src/js/00-villes-calcul.js", villes_json == code_C, villes_json ^ code_C)
for f in ("temps-trajets.json", "risques-quartiers.json", "commerces.json", "transports.json", "reperes.json"):
    keys = set(json.load(open(R + "/data/" + f, encoding="utf-8")))
    ok(f"toutes les villes dans data/{f}", code_C <= keys, code_C - keys)
ok("toutes les villes dans data/irisdata.js", code_C <= set(L(R + "/data/irisdata.js")), code_C - set(L(R + "/data/irisdata.js")))
dvf = json.load(open(R + "/data/dvf.json", encoding="utf-8"))
ok("ventes DVF studio pour toutes les villes", code_C <= set(dvf["t"]["studio"]), code_C - set(dvf["t"]["studio"]))

print(f"\n{n - bad}/{n} tests de données réussis"); sys.exit(1 if bad else 0)
