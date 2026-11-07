#!/usr/bin/env python3
"""Fiches complètes des annonces Bien'ici (description, photos, charges, DPE, étage, position…), lues une seule fois par annonce.

Usage :
  python3 tools/fiches.py todo [data/releve-du-jour.json] [--max 60]
      Liste les annonces du relevé (ou, sans relevé, de data/annoncesdata.js) dont la fiche manque encore,
      ventes d'abord (studios, T2, T3), puis locations, par lots de 10 à passer à tools/fiches-bienici.js.
      Affiche {"manquantes": n, "lots": [[[id, ville, "v"|"l"], …], …]}.
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
        st.setdefault(ck, {})[i] = rec
        res["ajoutees"] += 1; res["par_ville"][ck] = res["par_ville"].get(ck, 0) + 1
    # oubli des fiches d'annonces disparues depuis plus de GARDE_JOURS jours
    hist = load_js(os.path.join(R, "data", "historique.js")); lim = (datetime.date.today() - datetime.timedelta(days=GARDE_JOURS)).isoformat()
    gone = {ad_id(s): e.get("g") for v in hist.values() for kind in ("v", "l") for s, e in (v.get(kind) or {}).items() if e.get("g")}
    res["oubliees"] = 0
    for ck, c in st.items():
        for i in [i for i in c if gone.get(i) and gone[i] < lim]:
            del c[i]; res["oubliees"] += 1
    for ck, c in st.items(): save_city(ck, c)
    res["total"] = {ck: len(c) for ck, c in sorted(st.items())}
    print(json.dumps(res, ensure_ascii=False, indent=1))
    # un refus n'empêche pas la suite : les fiches déjà lues sont gardées, les autres seront relues demain


if __name__ == "__main__":
    cmd, rest = (sys.argv[1] if len(sys.argv) > 1 else ""), sys.argv[2:]
    if cmd == "todo": todo(rest)
    elif cmd == "merge" and rest: merge(rest)
    else: print(__doc__); sys.exit(1)
