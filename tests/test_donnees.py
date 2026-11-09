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
# plafond des ventes : les ventes plus chères quittent la liste sans être comptées vendues, et la liste plafonnée n'est pas prise pour un relevé partiel
def runp(villes, d, cap):
    json.dump({"date": d, "plafond": cap, "villes": villes}, open(T + "/data/r.json", "w"))
    p = subprocess.run([sys.executable, "tools/maj_annonces.py", "data/r.json", "--date", d], cwd=T, capture_output=True, text=True)
    return p.returncode, json.loads(p.stdout)
run(villes, "2030-02-01"); cap = sorted(a[2] for a in V)[len(V) // 3]; dessous = [a for a in V if a[2] <= cap]
pl = json.loads(json.dumps(villes)); pl[ck]["ventes"] = dessous
c, o = runp(pl, "2030-02-02", cap); runp(pl, "2030-02-03", cap); H2 = L(T + "/data/historique.js")[ck]["v"]
cher = [a[3] for a in V if a[2] > cap]
ok("plafond : liste plafonnée acceptée, ventes plus chères ni gardées ni vendues", not o.get("gardes") and len(L(T + "/data/annoncesdata.js")[ck]["ventes"]) == len(dessous) and cher and all("g" not in H2[x] for x in cher) and L(T + "/data/annoncesdata.js")[ck].get("plafond") == cap, (o.get("gardes"), len(cher)))
shutil.rmtree(T)

# --- signaux des descriptions
spec = importlib.util.spec_from_file_location("fiches", R + "/tools/fiches.py"); F = importlib.util.module_from_spec(spec); spec.loader.exec_module(F)
ok("signal : vendu loué", F.signaux({"d": "Studio vendu loué 450 € par mois, locataire en place depuis 2022"}) == ["loue"])
ok("signal : non louable (insalubre, moins de 9 m²)", "nonloc" in F.signaux({"d": "GRENIER classé insalubre par la ville (non louable et non habitable), pièce principale d'une surface inférieure à 9m²"}))
ok("pas de « non louable » pour les seuils du DPE ni la courte durée", not any("nonloc" in F.signaux({"d": t}) for t in ("Ce studio est bien au-dessus des seuils d'interdiction de location liés à la performance énergétique.", "Le règlement prévoit que le bien ne peut pas être loué en courte durée.", "Arrêté d'insalubrité levé en 2021, appartement rénové.")))
ok("signal : résidence de services", "serv" in F.signaux({"d": "Studio en résidence étudiante avec gestionnaire, bail commercial"}))
ok("signal : appart'hôtel", "serv" in F.signaux({"d": "Ce studio (appart'hôtel) bénéficie d'un emplacement idéal"}))
ok("signal : travaux", F.signaux({"d": "Appartement à rénover entièrement"}) == ["trav"])
ok("pas de signal sur une description ordinaire", F.signaux({"d": "Beau studio lumineux proche gare, cuisine équipée"}) == [])

# --- une fiche relue garde la lecture de sa description
T2 = tempfile.mkdtemp(); os.makedirs(T2 + "/tools"); os.makedirs(T2 + "/data/fiches"); shutil.copy(R + "/tools/fiches.py", T2 + "/tools/")
json.dump({"x1": {"k": "v", "d": "Studio vendu loué 400 €", "ia": {"loue": True, "loyer_mensuel": 400}}}, open(T2 + "/data/fiches/lemans.json", "w"))
json.dump({"fiches": [{"id": "x1", "ck": "lemans", "k": "v", "d": "Studio vendu loué 400 €"}]}, open(T2 + "/f.json", "w"))
subprocess.run([sys.executable, "tools/fiches.py", "merge", "f.json"], cwd=T2, capture_output=True)
ok("fiche relue : la lecture par Claude est gardée", json.load(open(T2 + "/data/fiches/lemans.json"))["x1"].get("ia", {}).get("loyer_mensuel") == 400)
shutil.rmtree(T2)

# --- cohérence des villes entre fichiers
villes_json = set(json.load(open(R + "/tools/villes.json")))
code_C = set(re.findall(r'\{k:"([a-z]+)"', open(R + "/src/js/00-villes-calcul.js", encoding="utf-8").read()))
ok("mêmes villes dans tools/villes.json et src/js/00-villes-calcul.js", villes_json == code_C, villes_json ^ code_C)
for f in ("temps-trajets.json", "risques-quartiers.json", "commerces.json", "transports.json", "reperes.json"):
    keys = set(json.load(open(R + "/data/" + f, encoding="utf-8")))
    ok(f"toutes les villes dans data/{f}", code_C <= keys, code_C - keys)
ok("toutes les villes dans data/irisdata.js", code_C <= set(L(R + "/data/irisdata.js")), code_C - set(L(R + "/data/irisdata.js")))
lig = open(R + "/data/lignes.js", encoding="utf-8").read(); lig = json.loads(lig[lig.index("=") + 1:lig.rstrip().rindex(";")])["villes"]
ok("lignes de bus et tram pour toutes les villes (data/lignes.js)", code_C <= {k for k, v in lig.items() if v.get("l")}, code_C - set(lig))
bi = json.load(open(R + "/tools/bienici.json", encoding="utf-8"))["villes"]
ok("adresse Bien'ici pour toutes les villes (tools/bienici.json)", villes_json <= set(bi), villes_json - set(bi))
pl = subprocess.run([sys.executable, R + "/tools/releve_plan.py", "--budget", "90000"], capture_output=True, text=True)
try: PL = json.loads(pl.stdout)
except Exception: PL = {}
ok("plan du relevé : toutes les villes, 6 listes chacune, ventes plafonnées à 120 000 €", PL.get("plafond") == 120000 and {l["ville"] for l in PL.get("listes", [])} == villes_json and len(PL["listes"]) == 6 * len(villes_json) and all("prix-max=120000" in l["pages"][-1] for l in PL["listes"] if l["quoi"] == "ventes"), pl.stderr[-300:])
dvf = json.load(open(R + "/data/dvf.json", encoding="utf-8"))
ok("ventes DVF studio pour toutes les villes", code_C <= set(dvf["t"]["studio"]), code_C - set(dvf["t"]["studio"]))

pt = json.load(open(R + "/data/prix-tendance.json", encoding="utf-8"))["villes"]
ok("prix des appartements depuis 2014 pour toutes les villes (data/prix-tendance.json)", code_C <= set(pt) and all("2025" in pt[k]["p"] for k in code_C), code_C - set(pt))
ok("hausse sur 10 ans connue pour 15 villes au moins", sum(1 for k in code_C if pt[k]["g"] is not None) >= 15)

# --- DPE à jour (1er janvier 2027) : électricité comptée 1,7 fois, seuils des petites surfaces, jamais plus mauvais
DA = F.dpe_a_jour
ok("DPE : F électrique de 2023, 22 m², 440 kWh → E (1,7 au lieu de 2,3)", DA({"dpe": "F", "kwh": 440, "surf": 22, "dpeDate": "2023-05-02", "chauf": "radiateur électrique individuel", "ges": "B"}) == ("E", "elec+petit"), DA({"dpe": "F", "kwh": 440, "surf": 22, "dpeDate": "2023-05-02", "chauf": "radiateur électrique individuel", "ges": "B"}))
ok("DPE : F électrique de 2026, 60 m², 360 kWh → E (1,7 au lieu de 1,9)", DA({"dpe": "F", "kwh": 360, "surf": 60, "dpeDate": "2026-03-01", "chauf": "électrique", "ges": "A"}) == ("E", "elec"))
ok("DPE : chauffage au gaz, grand logement : inchangé", DA({"dpe": "F", "kwh": 400, "surf": 60, "dpeDate": "2023-03-01", "chauf": "gaz individuel", "ges": "E"}) is None)
ok("DPE : petit logement au gaz diagnostiqué avant juillet 2024 → seuils des petites surfaces", DA({"dpe": "F", "kwh": 380, "surf": 20, "dpeDate": "2023-03-01", "chauf": "gaz individuel", "ges": "D"}) == ("E", "petit"))
ok("DPE : la classe GES annoncée limite le gain", DA({"dpe": "F", "kwh": 440, "surf": 22, "dpeDate": "2023-05-02", "chauf": "électrique", "ges": "F"}) is None)
ok("DPE : diagnostic d'avant juillet 2021 (ancienne méthode) ou déjà à 1,7 : inchangé", DA({"dpe": "F", "kwh": 440, "surf": 22, "dpeDate": "2020-05-02", "chauf": "électrique"}) is None and DA({"dpe": "E", "kwh": 300, "surf": 60, "dpeDate": "2027-02-01", "chauf": "électrique"}) is None)
ok("DPE : chauffage mixte gaz et électricité : pas de coefficient", DA({"dpe": "F", "kwh": 400, "surf": 60, "dpeDate": "2023-03-01", "chauf": "Individuel électrique Radiateur Gaz", "ges": "C"}) is None)
x = F.ficx_de({"k": "v", "dpe": "F", "kwh": 440, "surf": 22, "dpeDate": "2023-05-02", "chauf": "électrique", "ges": "B"})
ok("DPE : la page reçoit la classe à jour et la classe annoncée", x.get("dpe") == "E" and x.get("dpe0") == "F" and x.get("dpeW") == "elec+petit", x)

rl = json.load(open(R + "/data/rail.json", encoding="utf-8"))
ok("grandes lignes de train (data/rail.json) : grande vitesse et lignes rapides, dans l'Ouest", sum(f["properties"]["v"] == "lgv" for f in rl["features"]) >= 4 and sum(f["properties"]["v"] == "gl" for f in rl["features"]) >= 20 and all(len(f["geometry"]["coordinates"]) >= 2 for f in rl["features"]))

print(f"\n{n - bad}/{n} tests de données réussis"); sys.exit(1 if bad else 0)
