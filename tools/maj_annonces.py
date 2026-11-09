#!/usr/bin/env python3
"""Met à jour les annonces du jour et leur historique, puis affiche un résumé JSON.

Usage : python3 tools/maj_annonces.py releve.json [--date AAAA-MM-JJ]

releve.json = {"date": "AAAA-MM-JJ", "villes": {"lemans": {"ads": [...], "ventes": [...], "t2": {"ads": [...], "ventes": [...]}, "t3": {...}}, ...}}
  ads / ventes au premier niveau : studios ; "t2" / "t3" : mêmes listes pour les T2 et les T3 (facultatives).
  ads    : [surface, secteur, loyer CC, meublé 0/1, lien après /annonce/location/, photo]
  ventes : [surface, secteur, prix, lien après /annonce/vente/, photo]
Une liste absente du relevé (page en échec) garde celle de la veille, sans compter ses annonces comme vues ce jour-là.
« plafond » (facultatif, tools/releve_plan.py) : prix au-delà duquel les ventes ne sont pas relevées ; elles quittent la liste sans être
comptées vendues, et le garde-fou ci-dessous compare avec la liste de la veille ramenée au même plafond.
Garde-fou : une liste qui perd plus de la moitié de ses annonces (6 au moins la veille) est tenue pour un relevé partiel et gardée telle quelle,
sauf avec --force. Disparue = absente de 2 relevés de suite où sa liste a bien été relevée.

Fichiers modifiés : data/annoncesdata.js (const ADS) et data/historique.js (const HIST).
ADS[ville] = {ads, ventes (studios), map, t: {t2: {ads, ventes}, t3: {ads, ventes}}}.
HIST[ville]["v" ventes | "l" locations][lien] = {f: 1re vue, s: dernière vue, p: [[date, prix], ...],
  m: [surface, secteur, photo(, type si ce n'est pas un studio)], g: date de disparition (absente 2 jours de suite)}.
Règle « affaire » (vente nouvelle) : prix au m² au moins 20 % sous la médiane des annonces du même type de la ville (5 annonces au moins),
et pour un studio aussi : 18 à 30 m² et 65 000 € au plus. Location (studio) : meublé de 18 à 26 m² à 470 € CC au plus.
"""
import json, os, sys, datetime, statistics as st

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P_ADS, P_HIST, P_SEC = (os.path.join(R, "data", f) for f in ("annoncesdata.js", "historique.js", "secteurs-nouvelles-villes.json"))
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
TYPES = ("studio", "t2", "t3")
SURF = {"studio": 22, "t2": 42, "t3": 62}   # surfaces de référence de l'app (src/js/00a-types-bien.js)

def load_js(path, name):
    if not os.path.exists(path): return {}
    s = open(path, encoding="utf-8").read(); a = s.index("{"); b = s.rindex("}")
    return json.loads(s[a:b + 1])

def save_js(path, name, obj):
    open(path, "w", encoding="utf-8").write(f"const {name}=" + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n")

def rref(a, ty): return a[2] * (SURF[ty] / a[0]) ** 0.6
def med(v): return round(st.median(v)) if v else None

def main():
    rel = json.load(open(sys.argv[1], encoding="utf-8"))
    today = rel.get("date") or datetime.date.today().isoformat()
    if "--date" in sys.argv: today = sys.argv[sys.argv.index("--date") + 1]
    d = datetime.date.fromisoformat(today)
    ADS = load_js(P_ADS, "ADS"); HIST = load_js(P_HIST, "HIST")
    SEC = json.load(open(P_SEC, encoding="utf-8")) if os.path.exists(P_SEC) else {}
    force = "--force" in sys.argv
    out = {"date": today, "villes": {}, "baisses": [], "affaires": [], "echecs": [], "gardes": []}
    cap = rel.get("plafond") if isinstance(rel.get("plafond"), (int, float)) and rel.get("plafond") > 0 else None
    sous = lambda key, a: key != "ventes" or not cap or a[2] <= cap   # annonce dans le champ du relevé
    maj = 0
    for ck, new in rel.get("villes", {}).items():
        if not new or not any((new if ty == "studio" else new.get(ty) or {}).get(k) for ty in TYPES for k in ("ads", "ventes")):
            out["echecs"].append(ck); continue
        A = ADS.setdefault(ck, {"ads": [], "ventes": [], "map": SEC.get(ck, {})})
        if ck in SEC:  # complète la carte des secteurs sans écraser l'existant
            for k, v in SEC[ck].items(): A["map"].setdefault(k, v)
        H = HIST.setdefault(ck, {"v": {}, "l": {}})
        stats = {}
        for ty in TYPES:
            N = new if ty == "studio" else new.get(ty)
            if not N or (not N.get("ads") and not N.get("ventes")): continue
            B = A if ty == "studio" else A.setdefault("t", {}).setdefault(ty, {"ads": [], "ventes": []})
            old_v = {a[3] for a in B.get("ventes", [])}; old_l = {a[4] for a in B.get("ads", [])}
            fresh = {}
            for key in ("ads", "ventes"):
                nw, od = [a for a in (N.get(key) or []) if a and a[0] and a[0] > 0 and a[2] and a[2] > 0], B.get(key) or []
                if not nw: continue
                od = [a for a in od if sous(key, a)]
                if not force and len(od) >= 6 and len(nw) < len(od) / 2:
                    out["gardes"].append(f"{ck} {ty} {key} : {len(nw)} annonces au lieu de {len(od)}, liste de la veille gardée (--force pour accepter)"); continue
                B[key] = nw; fresh[key] = True
            if fresh:
                maj += 1; A["iso"] = today
                if cap: A["plafond"] = cap   # affiché dans l'app : ventes de la ville relevées jusqu'à ce prix
                else: A.pop("plafond", None)
            tag = [] if ty == "studio" else [ty]
            for kind, lst, ip, il, meta in (("v", B["ventes"] if fresh.get("ventes") else [], 2, 3, lambda a: [a[0], a[1], a[4]] + tag), ("l", B["ads"] if fresh.get("ads") else [], 2, 4, lambda a: [a[0], a[1], a[5]] + tag)):
                if not lst: continue
                seen = set()
                for a in lst:
                    k = a[il]; seen.add(k); e = H[kind].get(k)
                    if not e:
                        H[kind][k] = {"f": today, "s": today, "p": [[today, a[ip]]], "m": meta(a)}
                    else:
                        if e["p"][-1][1] != a[ip]:
                            if kind == "v" and a[ip] < e["p"][-1][1]:
                                out["baisses"].append({"type": ty, "ville": ck, "lien": "https://www.bienici.com/annonce/vente/" + k, "avant": e["p"][-1][1], "apres": a[ip], "secteur": a[1]})
                            e["p"].append([today, a[ip]])
                        e["s"] = today; e["m"] = meta(a); e.pop("g", None); e.pop("a", None); e.pop("ad", None)
                for k, e in H[kind].items():
                    if (e["m"][3] if len(e["m"]) > 3 else "studio") != ty: continue
                    if kind == "v" and cap and e["p"][-1][1] > cap: continue   # au-dessus du plafond : plus relevée, pas vendue
                    if k not in seen and "g" not in e and e["s"] != today and e.get("ad") != today:
                        e["a"] = e.get("a", 0) + 1; e["ad"] = today   # absente d'un relevé de plus (une fois par jour)
                        if e["a"] >= 2: e["g"] = today; e.pop("a", None); e.pop("ad", None)
            nv = [a for a in B["ventes"] if a[3] not in old_v]; nl = [a for a in B["ads"] if a[4] not in old_l]
            pm = [a[2] / a[0] for a in B["ventes"]]; pmed = st.median(pm) if len(pm) >= 5 else None
            for a in nv:
                cheap = pmed and a[2] / a[0] <= 0.8 * pmed
                if (ty == "studio" and 18 <= a[0] <= 30 and a[2] <= 65000) or (ty != "studio" and cheap):
                    out["affaires"].append({"type": ty, "ville": ck, "lien": "https://www.bienici.com/annonce/vente/" + a[3], "secteur": a[1], "prix": a[2], "m2": a[0], "prix_m2": round(a[2] / a[0])})
            if ty == "studio":
                for a in nl:
                    if a[3] and 18 <= a[0] <= 26 and a[2] <= 470:
                        out["affaires"].append({"type": "studio", "ville": ck, "lien": "https://www.bienici.com/annonce/location/" + a[4], "secteur": a[1], "loyer": a[2], "m2": a[0], "location": True})
            meu = [rref(a, ty) for a in B["ads"] if a[3]]
            stats[ty] = {"n": len(B["ads"]), "medianeLoyerRamene": med([rref(a, ty) for a in B["ads"]]), "medianeMeubles": med(meu),
                "nouvelles": len(nl), "disparues": len(old_l - {a[4] for a in B["ads"]}), "ventes": len(B["ventes"]),
                "prixM2Median": med(pm), "ventesNouvelles": len(nv),
                "vendues": sum(1 for e in H["v"].values() if e.get("g") == today and (e["m"][3] if len(e["m"]) > 3 else "studio") == ty)}
        out["villes"][ck] = stats
    if maj:   # la date affichée n'avance que si au moins une liste a vraiment été relevée
        ADS["date"] = f"{d.day}{'er' if d.day == 1 else ''} {MOIS[d.month - 1]} {d.year}"; ADS["iso"] = today
    else:
        out["echecs"].append("aucune liste relevée : date et fichiers inchangés"); print(json.dumps(out, ensure_ascii=False, indent=1)); sys.exit(1)
    save_js(P_ADS, "ADS", ADS); save_js(P_HIST, "HIST", HIST)
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
