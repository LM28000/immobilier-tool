#!/usr/bin/env python3
"""Met à jour les annonces du jour et leur historique, puis affiche un résumé JSON.

Usage : python3 tools/maj_annonces.py releve.json [--date AAAA-MM-JJ]

releve.json = {"date": "AAAA-MM-JJ", "villes": {"lemans": {"ads": [...], "ventes": [...]}, ...}}
  ads    : [surface, secteur, loyer CC, meublé 0/1, lien après /annonce/location/, photo]
  ventes : [surface, secteur, prix, lien après /annonce/vente/, photo]
Une ville absente du relevé (page en échec) garde ses listes de la veille.

Fichiers modifiés : data/annoncesdata.js (const ADS) et data/historique.js (const HIST).
HIST[ville]["v" ventes | "l" locations][lien] = {f: 1re vue, s: dernière vue, p: [[date, prix], ...],
  m: [surface, secteur, photo], g: date de disparition (absente 2 jours de suite)}.
"""
import json, os, sys, datetime, statistics as st

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P_ADS, P_HIST, P_SEC = (os.path.join(R, "data", f) for f in ("annoncesdata.js", "historique.js", "secteurs-nouvelles-villes.json"))
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]

def load_js(path, name):
    if not os.path.exists(path): return {}
    s = open(path, encoding="utf-8").read(); a = s.index("{"); b = s.rindex("}")
    return json.loads(s[a:b + 1])

def save_js(path, name, obj):
    open(path, "w", encoding="utf-8").write(f"const {name}=" + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n")

def r22(a): return a[2] * (22 / a[0]) ** 0.6
def med(v): return round(st.median(v)) if v else None

def main():
    rel = json.load(open(sys.argv[1], encoding="utf-8"))
    today = rel.get("date") or datetime.date.today().isoformat()
    if "--date" in sys.argv: today = sys.argv[sys.argv.index("--date") + 1]
    d = datetime.date.fromisoformat(today)
    ADS = load_js(P_ADS, "ADS"); HIST = load_js(P_HIST, "HIST")
    SEC = json.load(open(P_SEC, encoding="utf-8")) if os.path.exists(P_SEC) else {}
    out = {"date": today, "villes": {}, "baisses": [], "affaires": [], "echecs": []}
    for ck, new in rel.get("villes", {}).items():
        if not new or (not new.get("ads") and not new.get("ventes")):
            out["echecs"].append(ck); continue
        A = ADS.setdefault(ck, {"ads": [], "ventes": [], "map": SEC.get(ck, {})})
        if ck in SEC:  # complète la carte des secteurs sans écraser l'existant
            for k, v in SEC[ck].items(): A["map"].setdefault(k, v)
        old_v = {a[3] for a in A.get("ventes", [])}; old_l = {a[4] for a in A.get("ads", [])}
        A["ads"] = new.get("ads", A.get("ads", [])); A["ventes"] = new.get("ventes", A.get("ventes", []))
        H = HIST.setdefault(ck, {"v": {}, "l": {}})
        for kind, lst, ip, il, meta in (("v", A["ventes"], 2, 3, lambda a: [a[0], a[1], a[4]]), ("l", A["ads"], 2, 4, lambda a: [a[0], a[1], a[5]])):
            seen = set()
            for a in lst:
                k = a[il]; seen.add(k); e = H[kind].get(k)
                if not e:
                    H[kind][k] = {"f": today, "s": today, "p": [[today, a[ip]]], "m": meta(a)}
                else:
                    if e["p"][-1][1] != a[ip]:
                        if kind == "v" and a[ip] < e["p"][-1][1]:
                            out["baisses"].append({"ville": ck, "lien": "https://www.bienici.com/annonce/vente/" + k, "avant": e["p"][-1][1], "apres": a[ip], "secteur": a[1]})
                        e["p"].append([today, a[ip]])
                    e["s"] = today; e["m"] = meta(a); e.pop("g", None)
            for k, e in H[kind].items():
                if k not in seen and "g" not in e and (d - datetime.date.fromisoformat(e["s"])).days >= 2:
                    e["g"] = today
        nv = [a for a in A["ventes"] if a[3] not in old_v]; nl = [a for a in A["ads"] if a[4] not in old_l]
        for a in nv:
            if 18 <= a[0] <= 30 and a[2] <= 65000:
                out["affaires"].append({"type": "vente", "ville": ck, "lien": "https://www.bienici.com/annonce/vente/" + a[3], "secteur": a[1], "prix": a[2], "m2": a[0], "prix_m2": round(a[2] / a[0])})
        for a in nl:
            if a[3] and 18 <= a[0] <= 26 and a[2] <= 470:
                out["affaires"].append({"type": "location", "ville": ck, "lien": "https://www.bienici.com/annonce/location/" + a[4], "secteur": a[1], "loyer": a[2], "m2": a[0]})
        meu = [r22(a) for a in A["ads"] if a[3] and not (ck == "lemans" and a[1] == "Université")]
        out["villes"][ck] = {"n": len(A["ads"]), "medianeRamenee22m2": med([r22(a) for a in A["ads"]]), "medianeMeubles": med(meu),
            "nouvelles": len(nl), "disparues": len(old_l - {a[4] for a in A["ads"]}), "ventes": len(A["ventes"]),
            "prixM2Median": med([a[2] / a[0] for a in A["ventes"]]), "ventesNouvelles": len(nv),
            "vendues": sum(1 for e in H["v"].values() if e.get("g") == today)}
    ADS["date"] = f"{d.day}{'er' if d.day == 1 else ''} {MOIS[d.month - 1]} {d.year}"; ADS["iso"] = today
    save_js(P_ADS, "ADS", ADS); save_js(P_HIST, "HIST", HIST)
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
