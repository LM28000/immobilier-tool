#!/usr/bin/env python3
"""Prix des appartements anciens de chaque ville, année par année (2014-2025), pour la hausse des prix selon la ville.

Usage : python3 tools/prix_tendance.py [fichier.csv]
  Sans fichier, lit la série nationale de Terralyse sur data.gouv.fr (« Prix immobilier par commune, ventes 2014 à 2025 (DVF) »,
  Licence Ouverte 2.0, source : Terralyse d'après DVF), sans rien écrire d'autre que data/prix-tendance.json.

Sortie : data/prix-tendance.json = {source, url, licence, maj, regle, villes: {ville: {p: {année: prix médian au m² des appartements anciens}, g}}}
  g = hausse annuelle moyenne sur 10 ans, de la moyenne (logarithmique) de 2014-2015 à celle de 2024-2025, en % par an ;
  null quand l'une des deux périodes manque (Rennes et Nantes n'ont pas d'années avant 2021 dans cette série).
La page en tire la pente entre la hausse et la part de logements vides (src/js/00b-financement-impots.js, pxPente) : rien n'est réglé à la main.
"""
import csv, io, json, math, os, sys, datetime, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://static.data.gouv.fr/resources/prix-immobilier-par-commune-ventes-2014-a-2025-dvf-millesime-2026/20261026-112727/prix-immobilier-communes-series-2014-2025.csv"
PAGE = "https://www.data.gouv.fr/datasets/prix-immobilier-par-commune-ventes-2014-a-2025-dvf-millesime-2026"
DEBUT, FIN = (2014, 2015), (2024, 2025)


def tendance(p):
    def moy(ys):
        v = [math.log(p[y]) for y in ys if p.get(y)]
        return sum(v) / len(v) if v else None
    a, z = moy(DEBUT), moy(FIN)
    if a is None or z is None: return None
    ans = (sum(FIN) - sum(DEBUT)) / 2
    return round((math.exp((z - a) / ans) - 1) * 100, 2)


def main():
    villes = json.load(open(os.path.join(R, "tools/villes.json"), encoding="utf-8"))
    inv = {v: k for k, v in villes.items()}
    if len(sys.argv) > 1: txt = open(sys.argv[1], encoding="utf-8").read()
    else:
        with urllib.request.urlopen(URL, timeout=120) as r: txt = r.read().decode("utf-8")
    P = {k: {} for k in villes}
    for row in csv.DictReader(io.StringIO(txt)):
        k = inv.get(row.get("code_insee"))
        if k and row.get("prix_m2_median_appartement"): P[k][int(row["annee"])] = int(float(row["prix_m2_median_appartement"]))
    manque = [k for k in villes if not P[k]]
    if manque: sys.exit("pas de série pour : " + ", ".join(manque))
    out = {"source": "Terralyse d'après DVF (DGFiP)", "url": PAGE, "licence": "Licence Ouverte 2.0",
           "maj": datetime.date.today().isoformat(),
           "regle": "prix médian au m² des appartements anciens vendus dans l'année (5 ventes au moins) ; g = hausse annuelle moyenne de 2014-2015 à 2024-2025",
           "villes": {k: {"p": {str(y): P[k][y] for y in sorted(P[k])}, "g": tendance(P[k])} for k in villes}}
    with open(os.path.join(R, "data/prix-tendance.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1); f.write("\n")
    print(json.dumps({k: v["g"] for k, v in out["villes"].items()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
