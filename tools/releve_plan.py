#!/usr/bin/env python3
"""Plan du relevé Bien'ici du soir : les pages à ouvrir, lues par la routine (tools/routine-releve.md).

Usage : python3 tools/releve_plan.py [--budget N]
Affiche {"date", "budget", "source_budget", "plafond", "listes": [{"liste": "nantes studio ventes", "ville", "type", "quoi": "ventes"|"ads",
         "pages": [adresse de la 1re page de chaque tranche]}]}.
Pour chaque adresse, la routine suit les pages suivantes (&page=2…) tant que le site en propose, pages_max au plus,
puis fusionne toutes les pages de toutes les adresses d'une même liste.

Règles (tools/bienici.json) :
- villes : celles de tools/villes.json, chacune avec son adresse Bien'ici dans tools/bienici.json (une ville sans adresse : erreur) ;
  ajouter une ville au relevé = ajouter son adresse, la routine n'a pas à changer ;
- ventes : jusqu'au plafond = budget des critères communs (liste commune, Supabase ; à défaut budget_defaut) × marge,
  arrondi aux 5 000 € supérieurs ; les ventes plus chères ne sont pas relevées (tools/maj_annonces.py ne les compte pas vendues) ;
- locations : toutes (elles servent à caler les loyers) ;
- tranches : une liste qui comptait la veille au moins 70 % de ce que tiennent pages_max pages est coupée en tranches de prix
  d'environ cible_par_tranche annonces, aux quantiles des prix de la veille. Une liste encore coupée par la limite de pages
  grandit le soir suivant et se recoupe d'elle-même.
"""
import json, math, os, sys, datetime, statistics
try: from zoneinfo import ZoneInfo
except ImportError: ZoneInfo = None

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, "tools"))


def load_js(p):
    if not os.path.exists(p): return {}
    s = open(p, encoding="utf-8").read(); return json.loads(s[s.index("{"):s.rindex("}") + 1])


def budget_commun():
    """budget des critères communs (ligne « reglages » de la liste commune), ou None"""
    try:
        from supabase_annonces import conf, call
        url, key, code = conf()
        if not code: return None
        rows = json.loads(call("GET", url + "/rest/v1/biens?select=data", key, code))
        R_ = sorted((r["data"] for r in rows if isinstance(r.get("data"), dict) and r["data"].get("kind") == "reglages"), key=lambda d: str(d.get("cree") or ""))
        b = R_ and (R_[0].get("crit") or {}).get("budget")
        return float(b) if b and float(b) > 0 else None
    except Exception:
        return None


def bornes(prix, k, pas):
    """k tranches aux quantiles des prix, arrondies au pas ; renvoie les limites hautes des k-1 premières"""
    P = sorted(prix); B = []
    for i in range(1, k):
        v = P[min(len(P) - 1, int(len(P) * i / k))]; v = int(round(v / pas) * pas)
        if not B or v > B[-1]: B.append(v)
    return B


def main():
    C = json.load(open(os.path.join(R, "tools/bienici.json"), encoding="utf-8"))
    villes = list(json.load(open(os.path.join(R, "tools/villes.json"), encoding="utf-8")))
    manque = [v for v in villes if v not in C["villes"]]
    if manque: sys.exit("adresse Bien'ici manquante dans tools/bienici.json pour : " + ", ".join(manque))
    budget, src = None, "défaut"
    if "--budget" in sys.argv: budget, src = float(sys.argv[sys.argv.index("--budget") + 1]), "option"
    else:
        b = budget_commun()
        if b: budget, src = b, "critères communs"
    if not budget: budget = float(C["budget_defaut"])
    cap = int(math.ceil(budget * C["marge"] / 5000) * 5000)
    capa = C["pages_max"] * C["par_page"]; cible = C["cible_par_tranche"]
    ADS = load_js(os.path.join(R, "data/annoncesdata.js"))
    out = []
    for ck in villes:
        slug = C["villes"][ck]; A = ADS.get(ck) if isinstance(ADS.get(ck), dict) else {}
        for ty, (chemin, filtre) in C["types"].items():
            B = A if ty == "studio" else (A.get("t") or {}).get(ty) or {}
            for quoi in ("ads", "ventes"):
                vente = quoi == "ventes"
                veille = [a[2] for a in (B.get(quoi) or []) if a and a[2] and (not vente or a[2] <= cap)]
                base = f"https://www.bienici.com/recherche/{'achat' if vente else 'location'}/{slug}/{chemin}?{filtre}"
                k = math.ceil(len(veille) / cible) if len(veille) >= 0.7 * capa else 1
                lim = bornes(veille, k, 1000 if vente else 10) if k > 1 else []
                bas = [None] + [b + 1 for b in lim]; haut = lim + [cap if vente else None]
                pages = []
                for lo, hi in zip(bas, haut):
                    q = (f"&prix-min={lo}" if lo else "") + (f"&prix-max={hi}" if hi else "")
                    pages.append(base + q)
                out.append({"liste": f"{ck} {ty} {quoi}", "ville": ck, "type": ty, "quoi": quoi, "pages": pages})
    today = datetime.datetime.now(ZoneInfo("Europe/Paris")).date().isoformat() if ZoneInfo else datetime.date.today().isoformat()
    consigne = ("Si tools/extraction-bienici.js renvoie un champ « erreur » non nul, attends 10 s et relance-le une fois sur la même page ; "
                "si l'erreur revient, arrête le relevé : n'ouvre plus de page, n'écris pas de relevé, et dis-le dans le message de l'étape 7 "
                "en recopiant cette erreur.")
    print(json.dumps({"date": today, "budget": budget, "source_budget": src, "plafond": cap, "pages_max": C["pages_max"], "consigne": consigne, "listes": out}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
