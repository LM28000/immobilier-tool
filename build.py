#!/usr/bin/env python3
"""Assemble la page à partir de src/ et data/, et refuse de produire une page cassée.
Sorties :
  dist/index.html     page autonome (GitHub Pages)
  dist/artifact.html  même page sans squelette (artifact Claude), annonces et fiches toujours incluses
  dist/test.html      copie locale pour les tests Playwright (comme l'artefact)
  index.html          copie de dist/index.html servie par GitHub Pages
  sw.js               numéro de version mis à jour (le téléphone installe la nouvelle version)
Réglage : publication.json → "annonces_publiques": false retire annonces, historique et fiches de la page publique ;
  la page les lit alors dans Supabase avec le code de groupe (tools/supabase_annonces.py les y envoie).
Ordre d'assemblage : données, puis src/js/00* et 01*, puis IRIS, annonces, src/ads-vue.js, historique, puis src/js/02* et la suite.
"""
import os, glob, sys, json, hashlib, shutil, subprocess, tempfile

R = os.path.dirname(os.path.abspath(__file__))
P = lambda p: os.path.join(R, p)
rd = lambda p: open(P(p), encoding="utf-8").read()
ERR = []

def need(p):
    if not os.path.exists(P(p)): ERR.append(f"fichier manquant : {p}"); return "{}"
    return rd(p)

def jdata(p):
    """un fichier JSON de data/, vérifié"""
    s = need(p)
    try: json.loads(s)
    except Exception as e: ERR.append(f"{p} n'est pas un JSON valide : {e}")
    return s

def jsobj(p, name):
    """un fichier data/*.js de la forme « const NAME={…}; », vérifié ; renvoie (texte, objet)"""
    s = need(p)
    if not s.lstrip().startswith(f"const {name}="): ERR.append(f"{p} doit commencer par « const {name}= »")
    try: return s, json.loads(s[s.index("{"):s.rindex("}") + 1])
    except Exception as e: ERR.append(f"{p} illisible : {e}"); return s, {}

conf = json.loads(rd("publication.json")) if os.path.exists(P("publication.json")) else {}
PUBLIC_ADS = conf.get("annonces_publiques", True)

js = sorted(glob.glob(P("src/js/*.js")))
names = [os.path.basename(p) for p in js]
before = [p for p, n in zip(js, names) if n < "02"]   # villes, calcul, fiche
after = [p for p, n in zip(js, names) if n >= "02"]   # carte et la suite
DATA = [("DVFALL", "dvf.json"), ("TTQ", "temps-trajets.json"), ("RISQ", "risques-quartiers.json"), ("TCQ", "transports.json"), ("LOYQ", "loyers-etat.json"),
        ("POIQ", "commerces.json"), ("TERQ", "territoire.json"), ("HABQ", "habitants.json"), ("REPQ", "reperes.json")]

ads_txt, ads = jsobj("data/annoncesdata.js", "ADS")
hist_txt, hist = jsobj("data/historique.js", "HIST")
# fiches des annonces (tools/fiches.py) : FICX = champs utiles au calcul pour les annonces du relevé ; FICHES = fiches complètes
FICH = {}
for p in sorted(glob.glob(P("data/fiches/*.json"))):
    try: FICH[os.path.basename(p)[:-5]] = json.load(open(p, encoding="utf-8"))
    except Exception as e: ERR.append(f"{os.path.relpath(p, R)} illisible : {e}")
ids = set()
for v in ads.values():
    if isinstance(v, dict):
        for b in [v] + list((v.get("t") or {}).values()):
            ids |= {str(a[3]).split("/")[-1] for a in b.get("ventes", [])} | {str(a[4]).split("/")[-1] for a in b.get("ads", [])}
sys.path.insert(0, P("tools")); from fiches import ficx_de
from fiches import doublons
FICX = {i: ficx_de(f) for c in FICH.values() for i, f in c.items() if i in ids}
for j, i in doublons(FICH, ids).items(): FICX.setdefault(j, {})["dup"] = i   # même bien chez une autre agence
FICX = {i: v for i, v in FICX.items() if v}
dumps = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
import math
def expt():
    """loyer ∝ surface^e à nombre de pièces égal : pente log-log des annonces de location, chaque ville centrée sur sa moyenne (colocations exclues)"""
    out = {}
    for ty in ("studio", "t2", "t3"):
        sxy = sxx = 0; n = 0
        for v in ads.values():
            if not isinstance(v, dict): continue
            b = v if ty == "studio" else (v.get("t") or {}).get(ty) or {}
            L = [(math.log(a[0]), math.log(a[2])) for a in b.get("ads", []) if a[0] > 0 and a[2] > 0 and not (FICX.get(str(a[4]).split("/")[-1]) or {}).get("coloc")]
            if len(L) < 8: continue
            mx = sum(x for x, _ in L) / len(L); my = sum(y for _, y in L) / len(L)
            sxy += sum((x - mx) * (y - my) for x, y in L); sxx += sum((x - mx) ** 2 for x, _ in L); n += len(L)
        out[ty] = round(min(0.9, max(0.15, sxy / sxx)), 3) if n >= 30 and sxx > 0 else 0.6
    return out
EXPT = expt()
def lrc0():
    """mêmes facteurs que loyerRecal() (src/ads-vue.js), calculés ici pour la page publique qui n'a pas les annonces"""
    src = rd("src/js/00-villes-calcul.js"); LOY = json.loads(rd("data/loyers-etat.json"))
    C = {m.group(1): (float(m.group(2)), float(m.group(3))) for m in re.finditer(r'\{k:"(\w+)".*?rent:([\d.]+),rentM2:([\d.]+)', src)}
    sref = LOY.get("sref", [37, 72]); SURF = {"studio": 22, "t2": 42, "t3": 62}
    def rexp(ck):
        if ck not in LOY.get("c3", {}) or ck not in LOY.get("c", {}): return 0.6
        return min(0.9, max(0.4, 1 + math.log(LOY["c3"][ck] / LOY["c"][ck][0]) / math.log(sref[1] / sref[0])))
    out = {}; med = statistics.median
    for ty in ("studio", "t2", "t3"):
        v, R = {}, {}
        for ck, V in ads.items():
            if not isinstance(V, dict) or ck not in C: continue
            b = V if ty == "studio" else (V.get("t") or {}).get(ty) or {}
            rent, m2 = C[ck]; T = SURF[ty]
            R[ck] = [(bool(a[3]), a[2] / (rent * (T / m2) ** rexp(ck) * (a[0] / T) ** EXPT[ty])) for a in b.get("ads", []) if a[0] > 0 and a[2] > 0 and not (FICX.get(str(a[4]).split("/")[-1]) or {}).get("coloc")]
        # meublé : une location vide compte pour son loyer × l'écart meublé / vide du type
        pm = [med([x for m, x in r if m]) / med([x for m, x in r if not m]) for r in R.values() if sum(m for m, _ in r) >= 5 and sum(not m for m, _ in r) >= 5]
        prime = round(med(pm), 3) if pm else 1.1
        for ck, r in R.items():
            if len(r) >= 15: v[ck] = round(min(1.2, max(0.7, med([x if m else x * prime for m, x in r]))), 3)
        out[ty] = {"v": v, "prime": prime, "tous": round(med(v.values()), 3) if v else 1}
    return out
import re, statistics
LRC0 = lrc0()

def code(public):
    """le script de la page ; public=False : annonces, historique et fiches incluses (artefact, tests)"""
    strip = public and not PUBLIC_ADS
    a = "const ADSRAW=" + dumps({"date": ads.get("date"), "iso": ads.get("iso"), "prive": True}) + ";" if strip else ads_txt.replace("const ADS=", "const ADSRAW=", 1)
    return "\n".join([
        need("data/mapdata.js"),
        *["const %s=%s;" % (n, jdata("data/" + f)) for n, f in DATA],
        "const CITYMAP=" + jdata("data/citymaps.json") + ";",
        *[open(p, encoding="utf-8").read() for p in before],
        need("data/irisdata.js"),
        a,
        "const FICX=" + ("{}" if strip else dumps(FICX)) + ";\nconst EXPT=" + dumps(EXPT) + ";\nconst LRC0=" + dumps(LRC0) + ";\nconst FICHES=" + ("null" if public else dumps(FICH)) + ";",
        need("src/ads-vue.js"),
        "const HIST={};" if strip else hist_txt,
        *[open(p, encoding="utf-8").read() for p in after],
    ])

def page(public, v2=False):
    """v2=True : la même page, réorganisée par src/v2 (onglets, carte d'abord, fiche en panneau) ; publiée à part dans v2.html"""
    css = need("src/styles.css") + ("\n" + need("src/v2/v2.css") if v2 else "")
    js = code(public) + ("\n" + need("src/v2/v2.js") if v2 else "")
    return need("src/head.html") + "<style>\n" + css + "</style>\n" + need("src/body.html") + "<script>\n" + js + "</script>\n"

pub, full = page(True), page(False)

# contrôles : déclarations en double, syntaxe, taille
import re
decl = re.findall(r"^(?:const|let|function|async function) ([A-Za-z_$][\w$]*)", code(False), re.M)
dup = sorted({n for n in decl if decl.count(n) > 1})
if dup: ERR.append("déclarations en double : " + ", ".join(dup))
if shutil.which("node"):
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t: t.write(code(False))
    r = subprocess.run(["node", "--check", t.name], capture_output=True, text=True); os.unlink(t.name)
    if r.returncode: ERR.append("erreur de syntaxe dans le script assemblé :\n" + "\n".join(r.stderr.splitlines()[:6]))
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t: t.write(code(False) + "\n" + need("src/v2/v2.js"))
    r = subprocess.run(["node", "--check", t.name], capture_output=True, text=True); os.unlink(t.name)
    if r.returncode: ERR.append("erreur de syntaxe dans le script de la v2 :\n" + "\n".join(r.stderr.splitlines()[:6]))
else: print("attention : node introuvable, syntaxe non vérifiée", file=sys.stderr)
if len(pub) > 3_000_000: ERR.append(f"page publique trop lourde ({len(pub)} octets)")
if ERR:
    print("BUILD REFUSÉ\n- " + "\n- ".join(ERR), file=sys.stderr); sys.exit(1)

def w(p, s):  # écriture atomique : jamais de fichier à moitié écrit (sync.sh surveille index.html)
    os.makedirs(os.path.dirname(P(p)) or R, exist_ok=True)
    tmp = P(p) + ".tmp"; open(tmp, "w", encoding="utf-8").write(s); os.replace(tmp, P(p))

w("dist/artifact.html", full)
w("dist/test.html", '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + full)
head = ('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="referrer" content="strict-origin-when-cross-origin">'
        '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
        + (rd("src/pwa-head.html") if os.path.exists(P("src/pwa-head.html")) else "")
        + '</head><body>')
html = head + pub + "</body></html>"
w("dist/index.html", html)
if not os.path.exists(P("index.html")) or rd("index.html") != html: w("index.html", html)   # pas de réécriture inutile (sync.sh surveille ce fichier)
# version 2 : même données et même calcul, organisation différente (src/v2) ; l'app actuelle reste à index.html
html2 = head + page(True, True) + "</body></html>"
if not os.path.exists(P("v2.html")) or rd("v2.html") != html2: w("v2.html", html2)
w("dist/v2-test.html", '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + page(False, True))
ver = hashlib.sha1(html.encode("utf-8")).hexdigest()[:10]
sw = rd("sw.js"); sw2 = re.sub(r'const VERSION = "[^"]*";', f'const VERSION = "{ver}";', sw, count=1)
if sw2 != sw: w("sw.js", sw2)
print("exposant loyer/surface par type :", EXPT); print("ok", len(pub), "octets (page publique,", "annonces incluses" if PUBLIC_ADS else "annonces dans Supabase", ") ;", len(FICX), "annonces avec fiche ;", len(full) - len(pub), "octets de plus dans l'artefact")
