#!/usr/bin/env python3
"""Fiches complètes des annonces Bien'ici (description, photos, charges, DPE, étage, position…), lues une seule fois par annonce.

Usage :
  python3 tools/fiches.py todo [data/releve-du-jour.json] [--max 60]
      Liste les annonces du relevé (ou, sans relevé, de data/annoncesdata.js) dont la fiche manque encore,
      ventes d'abord (studios, T2, T3), puis locations, par lots de 10 à passer à tools/fiches-bienici.js.
      Affiche {"manquantes": n, "lots": [[[id, ville, "v"|"l"], …], …]}.
  python3 tools/fiches.py a-lire [--max 40]
      Ventes dont la description n'a pas encore été lue par Claude : {"lots": [[{id, ville, titre, prix, surface, description}, …], …]} (lots de 10),
      celles qui parlent de loyer, bail, taxe foncière, travaux chiffrés ou résidence gérée d'abord.
  python3 tools/fiches.py lu data/lecture-du-jour.json
      Range ce que Claude a lu dans chaque description (champ « ia » de la fiche), après contrôle des bornes. Entrée : liste d'objets
      {id, loue, loyer_mensuel, loyer_charges_comprises, fin_bail, travaux_a_prevoir, travaux_votes, taxe_fonciere, surface_carrez,
       residence_geree, etat, exposition, points} (null quand la description ne dit rien), ou {"lectures": [...]}.
  python3 tools/fiches.py merge data/fiches-du-jour.json
      Range les fiches lues dans data/fiches/<ville>.json et affiche un résumé JSON.
      Le fichier d'entrée est la sortie de fiches-bienici.js, une liste de ces sorties, ou {"lots": [...]}.

Stockage : data/fiches/<ville>.json = {id: {d: description, ph: [photos], la, lo, r (rayon de flou en m, 0 = exact), dpe, kwh, ges,
  cop (charges de copropriété par an), lots, et (étage), ets (étages), asc (ascenseur), an (année), chauf, meu, coloc, chg (charges locatives),
  …, k: "v"|"l", lu: date de lecture}}. Une ligne par annonce pour des différences lisibles.
Une fiche n'est relue que si on la supprime. Elle est gardée 180 jours après la disparition de l'annonce (utile pour les biens suivis).
"""
import json, os, sys, glob, datetime

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(R, "data", "fiches")
TYPES = ("studio", "t2", "t3")
GARDE_JOURS = 180
import re
# ce que dit la description et qui change la décision ; textes affichés : src/js/24-fiches-annonces.js (DFL)
SIGNAUX = {
    "loue": r"locataire en place|vendu lou[ée]|bail en cours|actuellement lou[ée]|lou[ée] actuellement|lou[ée] depuis|occup[ée] par (?:un|une) locataire|loyer actuel",
    "serv": r"r[ée]sidence (?:de |avec )?services|r[ée]sidence[- ](?:[ée]tudiante|seniors?|g[ée]r[ée]e|de tourisme|h[ôo]teli[eè]re|d[’']affaires|de standing avec services)|appart[’' ]?h[ôo]tel|apparth[ôo]tel|bail commercial|gestionnaire|exploitant|loyers? garantis?|ne vous occupez de rien|sans souci de gestion|lmnp en r[ée]sidence",
    "viager": r"viager|nue[- ]propri[ée]t[ée]",
    "trav": r"(?:à|a) r[ée]nover|travaux (?:à|a) pr[ée]voir|(?:à|a) rafra[iî]chir|(?:à|a) r[ée]habiliter|gros travaux|(?:à|a) remettre au go[uû]t",
    "vote": r"travaux vot[ée]s|ravalement",
    # sous offre : le bien n'est sans doute plus disponible (titre ou description) ; pas « offre de prêt » ni « faire une offre »
    "offre": r"sous offre|offre (?:d'achat )?accept[ée]e|sous compromis|compromis (?:sign[ée]|en cours)|d[ée]j[àa] vendu|\bvendu par (?:notre|l'agence)",
    "meub": r"vendu meubl[ée]|enti[eè]rement meubl[ée]|(?:livr[ée]|c[ée]d[ée]) meubl[ée]|meubl[ée] et [ée]quip[ée]",
    # non louable : insalubre, non habitable, interdit à la location, moins de 9 m² habitables (pas les seuils du DPE, ni la courte durée)
    "nonloc": r"insalubr(?![^.]{0,30}lev[ée])|non[- ]habitable|inhabitable|impropre [àa] l[’']habitation|non[- ]louable|pas louable|ne (?:peut|pourra) (?:pas )?(?:[êe]tre )?(?:lou[ée]|mis en location)(?!\s+(?:en\s+)?(?:courte|saisonni|meubl[ée]s? de tourisme|airbnb|tourisme))|interdit(?:e)? de louer|interdit(?:e)? [àa] la location|arr[êe]t[ée] de p[ée]ril|p[ée]ril imminent|non d[ée]cent|logement ind[ée]cent|(?:surface habitable|pi[èe]ce principale|surface)[^.]{0,40}(?:inf[ée]rieure? [àa]|moins de) 9 ?m",
}
def signaux(f):
    d = (f.get("d") or "") + " " + (f.get("titre") or "")
    fl = [k for k, rx in SIGNAUX.items() if re.search(rx, d, re.I)]
    ia = f.get("ia") or {}
    if ia.get("residence_geree") and "serv" not in fl: fl.append("serv")
    if ia.get("loue") is True and "loue" not in fl: fl.append("loue")
    if ia.get("loue") is False and "loue" in fl and not ia.get("loyer_mensuel"): fl.remove("loue")   # « possibilité de vendre loué » n'est pas « loué »
    if ia.get("etat") in ("à rénover", "à rafraîchir") and "trav" not in fl: fl.append("trav")
    return fl


def load_js(path):
    if not os.path.exists(path): return {}
    s = open(path, encoding="utf-8").read(); return json.loads(s[s.index("{"):s.rindex("}") + 1])


def load_store():
    st = {}
    for p in glob.glob(os.path.join(D, "*.json")):
        st[os.path.basename(p)[:-5]] = json.load(open(p, encoding="utf-8"))
    return st


def save_city(ck, fiches):
    os.makedirs(D, exist_ok=True)
    p = os.path.join(D, ck + ".json"); tmp = p + ".tmp"
    lines = [json.dumps(k, ensure_ascii=False) + ":" + json.dumps(fiches[k], ensure_ascii=False, separators=(",", ":"), sort_keys=True) for k in sorted(fiches)]
    open(tmp, "w", encoding="utf-8").write("{\n" + ",\n".join(lines) + "\n}\n")
    os.replace(tmp, p)


def ad_id(suf): return str(suf).split("?")[0].rstrip("/").split("/")[-1]


def listes(villes):
    """(ville, type, "v"|"l", lignes) dans l'ordre de priorité : ventes puis locations, studios puis T2 puis T3."""
    out = []
    for kind, key, col in (("v", "ventes", 3), ("l", "ads", 4)):
        for ty in TYPES:
            for ck, v in villes.items():
                if not isinstance(v, dict): continue
                blk = v if ty == "studio" else ((v.get("t") or {}).get(ty) or v.get(ty) or {})
                out.append((ck, ty, kind, [ad_id(a[col]) for a in (blk.get(key) or []) if len(a) > col]))
    return out


def todo(args):
    mx = int(args[args.index("--max") + 1]) if "--max" in args else 60
    src = [a for a in args if a.endswith(".json") and not a.startswith("--")]
    villes = json.load(open(src[0], encoding="utf-8")).get("villes", {}) if src else {k: v for k, v in load_js(os.path.join(R, "data", "annoncesdata.js")).items() if isinstance(v, dict)}
    st = load_store(); have = {i for c in st.values() for i in c}
    seen, todo_ = set(), []
    for ck, ty, kind, ids in listes(villes):
        for i in ids:
            if i in have or i in seen: continue
            seen.add(i); todo_.append([i, ck, kind])
    pick = todo_[:mx]
    print(json.dumps({"manquantes": len(todo_), "ventes_manquantes": sum(1 for t in todo_ if t[2] == "v"),
                      "lots": [pick[i:i + 10] for i in range(0, len(pick), 10)]}, ensure_ascii=False))


IA_CHAMPS = {  # nom: (type, min, max)
    "loue": (bool,), "loyer_mensuel": (float, 150, 2500), "loyer_charges_comprises": (bool,), "fin_bail": (str,),
    "travaux_a_prevoir": (float, 0, 200000), "travaux_votes": (float, 0, 100000), "taxe_fonciere": (float, 50, 5000),
    "surface_carrez": (float, 5, 200), "residence_geree": (bool,), "etat": (str,), "exposition": (str,), "points": (list,)}
ETATS = {"neuf", "très bon", "bon", "à rafraîchir", "à rénover"}

def valide_ia(x):
    out = {}
    for k, spec in IA_CHAMPS.items():
        v = x.get(k)
        if v is None: continue
        t = spec[0]
        if t is bool and isinstance(v, bool): out[k] = v
        elif t is float and isinstance(v, (int, float)) and not isinstance(v, bool) and spec[1] <= v <= spec[2]: out[k] = round(float(v), 2)
        elif t is str and isinstance(v, str) and v.strip():
            v = v.strip()[:60]
            if k == "fin_bail" and not re.fullmatch(r"\d{4}(-\d{2})?", v): continue
            if k == "etat" and v not in ETATS: continue
            out[k] = v
        elif t is list and isinstance(v, list): out[k] = [str(p)[:120] for p in v if isinstance(p, str) and p.strip()][:4]
    return out

IA_CALC = ("loue", "loyer_mensuel", "loyer_charges_comprises", "fin_bail", "etat", "taxe_fonciere", "travaux_a_prevoir", "travaux_votes", "surface_carrez")

# DPE à jour : la classe que le même diagnostic aura au 1er janvier 2027, avant l'interdiction de louer les F (2028) et les E (2034).
# - électricité : énergie primaire = énergie finale × 2,3 jusqu'au 31 décembre 2025, × 1,9 en 2026 (arrêté du 13 août 2025),
#   × 1,7 dès le 1er janvier 2027 (arrêté du 19 août 2026, NOR VLOL2617030A) ; un logement chauffé à l'électricité voit sa consommation
#   ramenée à 1,7 (eau chaude supposée électrique aussi : c'est le cas courant, sinon l'estimation est un peu trop favorable) ;
# - petites surfaces : seuils des classes selon la surface de référence (arrêté du 25 mars 2024, annexe 1, 1.2.2.1, en vigueur le 1er juillet 2024),
#   valeurs intermédiaires par interpolation linéaire ; au-delà de 40 m², les seuils ordinaires ;
# - la classe GES annoncée est gardée (pas de valeur chiffrée dans les annonces) ; la classe ne se dégrade jamais (règle des deux arrêtés) ;
# - diagnostics d'avant le 1er juillet 2021 : ancienne méthode, plus valables, laissés tels quels.
# Les propriétaires obtiennent l'étiquette à jour gratuitement (attestation de l'Observatoire DPE de l'ADEME) : c'est à faire confirmer.
CEP_PETIT = {   # surface de référence (m²) : limites hautes des classes A à F en kWh d'énergie primaire/m²/an (G au-delà)
    8: (146, 186, 386, 505, 622, 739), 9: (134, 174, 355, 464, 574, 685), 10: (124, 164, 329, 428, 533, 640), 11: (117, 157, 311, 403, 503, 607),
    12: (112, 152, 296, 381, 478, 578), 13: (108, 148, 283, 363, 456, 554), 14: (104, 144, 273, 348, 437, 532), 15: (100, 140, 263, 333, 421, 514),
    16: (97, 137, 255, 325, 412, 504), 17: (95, 135, 248, 318, 404, 496), 18: (92, 132, 241, 311, 397, 489), 19: (90, 130, 235, 305, 390, 482),
    20: (88, 128, 230, 300, 385, 476), 21: (87, 127, 225, 295, 380, 471), 22: (85, 125, 221, 291, 375, 466), 23: (84, 124, 217, 287, 371, 462),
    24: (82, 122, 214, 284, 367, 458), 25: (81, 121, 210, 280, 363, 454), 26: (80, 120, 207, 277, 360, 451), 27: (79, 119, 204, 274, 357, 447),
    28: (78, 118, 202, 272, 354, 444), 29: (77, 117, 199, 269, 351, 442), 30: (76, 116, 197, 267, 349, 439), 31: (76, 116, 195, 265, 346, 437),
    32: (75, 115, 193, 263, 344, 434), 33: (74, 114, 191, 261, 342, 432), 34: (74, 114, 189, 259, 340, 430), 35: (73, 113, 188, 258, 338, 428),
    36: (72, 112, 186, 256, 337, 427), 37: (72, 112, 185, 255, 335, 425), 38: (71, 111, 183, 253, 333, 423), 39: (71, 111, 182, 252, 332, 422),
    40: (70, 110, 180, 250, 330, 420)}
COEF_CIBLE = 1.7
ELEC = re.compile(r"[ée]lectri|pompe [àa] chaleur", re.I)

def cep_seuils(s):
    import math
    s = max(8.0, float(s))
    if s >= 40: return CEP_PETIT[40]
    a = int(math.floor(s)); b = min(40, a + 1); t = s - a
    return tuple(x + (y - x) * t for x, y in zip(CEP_PETIT[a], CEP_PETIT[b]))

def dpe_a_jour(f):
    """(classe à jour, raison) si le même diagnostic donne une meilleure classe au 1er janvier 2027, sinon None ; raison : "elec", "petit" ou "elec+petit" """
    import math
    a, kwh, s, d = f.get("dpe"), f.get("kwh"), f.get("surf"), str(f.get("dpeDate") or "")
    if a not in tuple("ABCDEFG") or not d or d < "2021-07-01": return None
    try: kwh, s = float(kwh), float(s)
    except (TypeError, ValueError): return None
    if not (kwh > 0 and 8 <= s <= 400): return None
    ch = str(f.get("chauf") or "")
    elec = bool(ELEC.search(ch)) and not re.search(r"gaz|fioul|fuel|bois|r[ée]seau", ch, re.I)
    coef = 2.3 if d < "2026-01-01" else 1.9 if d < "2027-01-01" else COEF_CIBLE
    cep = kwh * COEF_CIBLE / coef if elec else kwh
    sl = cep_seuils(s); c = "G"
    for i, L in enumerate("ABCDEF"):
        if math.floor(cep) < sl[i]: c = L; break
    g = f.get("ges")
    if g in tuple("ABCDEFG"): c = max(c, g)
    if c >= a: return None
    why = [w for w, ok in (("elec", elec and coef > COEF_CIBLE), ("petit", s < 40 and d < "2024-07-01")) if ok]
    # sans l'une des deux réformes, une classe meilleure ne vient que d'un écart de saisie (surface, kWh) : on n'y touche pas
    if not why: return None
    return c, "+".join(why)

def ficx_de(f):
    """champs d'une fiche utiles au calcul, inclus dans la page (FICX)"""
    x = {k: f[k] for k in ("la", "lo", "r", "dpe", "cop", "coloc", "proc", "fl") if k in f}
    u = dpe_a_jour(f)
    if u: x["dpe0"], x["dpe"], x["dpeW"] = f["dpe"], u[0], u[1]   # DPE à jour (1er janvier 2027) ; dpe0 = classe annoncée
    if f.get("k") == "v" and f.get("pub"): x["pub"] = str(f["pub"])[:10]   # date de publication (ancienneté de l'annonce)
    ia = {k: v for k, v in (f.get("ia") or {}).items() if k in IA_CALC}
    if ia: x["ia"] = ia
    return x

def doublons(st, ids):
    """même bien publié par plusieurs agences : ventes de la même ville, même surface (0,1 m²), même étage connu,
    positions à moins de 100 m et prix à 6 % près. On garde la moins chère ; renvoie {id doublon: id gardé}."""
    import math
    out = {}
    for ck, c in st.items():
        L = [(i, f) for i, f in c.items() if i in ids and f.get("k") == "v" and f.get("surf") and f.get("et") is not None and f.get("la") is not None and (f.get("r") or 0) <= 300 and f.get("prix")]
        L.sort(key=lambda x: x[1]["prix"])
        for a in range(len(L)):
            i, f = L[a]
            if i in out: continue
            for b in range(a + 1, len(L)):
                j, g = L[b]
                if j in out or abs(f["surf"] - g["surf"]) > 0.1 or f["et"] != g["et"] or g["prix"] > f["prix"] * 1.06: continue
                d = 6371000 * math.hypot(math.radians(g["lo"] - f["lo"]) * math.cos(math.radians(f["la"])), math.radians(g["la"] - f["la"]))
                if d <= 100: out[j] = i
    return out

# description qui peut changer le calcul (loyer d'un bien loué, taxe foncière, travaux chiffrés, résidence gérée) : lue en premier
UTILE = re.compile(r"loyer|lou[ée]e?s?\b|locataire|bail\b|baux|taxe fonci|r[ée]sidence (?:de )?services|[ée]tudiante|gestionnaire|exploitant|travaux[^.]{0,80}\d", re.I)

def a_lire(args):
    mx = int(args[args.index("--max") + 1]) if "--max" in args else 40
    st = load_store(); L = []
    for ck, c in st.items():
        for i, f in c.items():
            if f.get("k") == "v" and "ia" not in f and f.get("d"):
                L.append({"id": i, "ville": ck, "titre": f.get("titre"), "prix": f.get("prix"), "surface": f.get("surf"), "description": f["d"][:3000]})
    L.sort(key=lambda x: (not UTILE.search(x["description"]), x["id"])); pick = L[:mx]   # d'abord celles qui peuvent changer le calcul
    print(json.dumps({"restantes": len(L), "lots": [pick[i:i + 10] for i in range(0, len(pick), 10)]}, ensure_ascii=False))

def lu(args):
    raw = json.load(open(args[0], encoding="utf-8")); L = raw.get("lectures", raw) if isinstance(raw, dict) else raw
    st = load_store(); where = {i: ck for ck, c in st.items() for i in c}; today = datetime.date.today().isoformat(); n = 0; inconnues = []
    for x in L:
        if not isinstance(x, dict) or x.get("id") not in where: inconnues.append(str(x.get("id") if isinstance(x, dict) else x)); continue
        ia = valide_ia(x); ia["lu"] = today; st[where[x["id"]]][x["id"]]["ia"] = ia; n += 1
    for ck, c in st.items():
        for f in c.values():
            fl = signaux(f)
            if fl: f["fl"] = fl
            else: f.pop("fl", None)
        save_city(ck, c)
    print(json.dumps({"lues": n, "inconnues": inconnues[:10]}, ensure_ascii=False))

def merge(args):
    raw = json.load(open(args[0], encoding="utf-8"))
    runs = raw.get("lots") if isinstance(raw, dict) and "lots" in raw else raw if isinstance(raw, list) else [raw]
    fiches, stops = [], []
    for r in runs:
        if isinstance(r, str): r = json.loads(r)
        if isinstance(r, dict) and "fiches" in r:
            fiches += r["fiches"]
            if r.get("stop"): stops.append(r["stop"])
        elif isinstance(r, dict) and "id" in r: fiches.append(r)
    today = datetime.date.today().isoformat()
    st = load_store(); res = {"ajoutees": 0, "erreurs": [], "refus": stops, "par_ville": {}}
    for f in fiches:
        i, ck = f.get("id"), f.get("ck")
        if not i or not ck: continue
        if f.get("err"): res["erreurs"].append(f"{ck} {i} : {f['err']}"); continue
        rec = {k: v for k, v in f.items() if k not in ("id", "ck") and v not in (None, "", [])}
        rec["lu"] = today
        old = st.setdefault(ck, {}).get(i) or {}
        if "ia" in old: rec["ia"] = old["ia"]   # une fiche relue garde ce que Claude a lu dans sa description
        st[ck][i] = rec
        res["ajoutees"] += 1; res["par_ville"][ck] = res["par_ville"].get(ck, 0) + 1
    # oubli des fiches d'annonces disparues depuis plus de GARDE_JOURS jours
    hist = load_js(os.path.join(R, "data", "historique.js")); lim = (datetime.date.today() - datetime.timedelta(days=GARDE_JOURS)).isoformat()
    gone = {ad_id(s): e.get("g") for v in hist.values() for kind in ("v", "l") for s, e in (v.get(kind) or {}).items() if e.get("g")}
    res["oubliees"] = 0
    for ck, c in st.items():
        for i in [i for i in c if gone.get(i) and gone[i] < lim]:
            del c[i]; res["oubliees"] += 1
    for ck, c in st.items():
        for f in c.values():
            fl = signaux(f)
            if fl: f["fl"] = fl
            else: f.pop("fl", None)
        save_city(ck, c)
    res["total"] = {ck: len(c) for ck, c in sorted(st.items())}
    print(json.dumps(res, ensure_ascii=False, indent=1))
    # un refus n'empêche pas la suite : les fiches déjà lues sont gardées, les autres seront relues demain


if __name__ == "__main__":
    cmd, rest = (sys.argv[1] if len(sys.argv) > 1 else ""), sys.argv[2:]
    if cmd == "todo": todo(rest)
    elif cmd == "a-lire": a_lire(rest)
    elif cmd == "lu" and rest: lu(rest)
    elif cmd == "merge" and rest: merge(rest)
    else: print(__doc__); sys.exit(1)
