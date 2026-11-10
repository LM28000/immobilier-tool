#!/usr/bin/env python3
"""Étudiants de chaque ville, rentrée par rentrée : tendance de la demande étudiante.

Usage : python3 tools/etudiants.py      (n'écrit que data/etudiants.json)
Source : atlas régional des effectifs d'étudiants inscrits, jeu agrégeable (ministère de l'Enseignement supérieur, SIES, Licence Ouverte),
  par unité urbaine (zonage 2020, le même pour toutes les années), public et privé, tous inscrits (« effectif », comme le chiffre de la ville
  dans src/js/00-villes-calcul.js).
Règles :
  - unité urbaine de la commune de la ville ;
  - rentrée de référence : la dernière complète (la plus récente est provisoire pour les écoles paramédicales et sociales) ;
  - tendance : évolution annuelle moyenne entre 2015 et la rentrée de référence (2015 : les apprentis de BTS sont comptés à partir de là,
    les années d'avant ne sont pas comparables).
Sortie : {"src", "maj", "ref" (rentrée de référence), "prov" (rentrée provisoire), "depuis", "villes": {ville: {"uu", "nom", "serie": {rentrée: inscrits}, "tend": % par an}}}
"""
import json, os, sys, time, urllib.parse, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = "https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-atlas_regional-effectifs-d-etudiants-inscrits_agregeables/records"
DEPUIS = 2015


def records(params):
    out, off = [], 0
    while True:
        q = urllib.parse.urlencode(dict(params, limit=100, offset=off))
        with urllib.request.urlopen(B + "?" + q, timeout=120) as r: d = json.loads(r.read().decode("utf-8"))
        out += d["results"]; off += 100
        if len(d["results"]) < 100: return out
        time.sleep(0.3)


def main():
    V = json.load(open(os.path.join(R, "tools", "villes.json"), encoding="utf-8"))
    com = records({"select": "com_id,uucr_id,uucr_nom", "group_by": "com_id,uucr_id,uucr_nom", "where": "com_id in (%s)" % ",".join('"%s"' % c for c in V.values())})
    uu = {r["com_id"]: (r["uucr_id"], r["uucr_nom"]) for r in com if r.get("uucr_id")}
    rows = records({"select": "uucr_id,rentree,sum(effectif) as eff", "group_by": "uucr_id,rentree", "where": "uucr_id in (%s)" % ",".join('"%s"' % u for u, _ in set(uu.values()))})
    S = {}
    for r in rows: S.setdefault(r["uucr_id"], {})[str(r["rentree"])] = int(r["eff"] or 0)
    ans = sorted({a for s in S.values() for a in s}); prov = ans[-1]; ref = ans[-2]
    out = {}
    for ck, c in V.items():
        if c not in uu: print("sans unité urbaine :", ck, file=sys.stderr); continue
        u, nom = uu[c]; s = {a: n for a, n in sorted(S.get(u, {}).items()) if int(a) >= DEPUIS}
        a0, a1 = s.get(str(DEPUIS)), s.get(ref)
        out[ck] = {"uu": u, "nom": nom, "serie": s, "tend": round(((a1 / a0) ** (1 / (int(ref) - DEPUIS)) - 1) * 100, 2) if a0 and a1 else None}
    G = {"src": "Atlas régional des effectifs d'étudiants inscrits (ministère de l'Enseignement supérieur, SIES), Licence Ouverte", "maj": time.strftime("%Y-%m-%d"),
         "ref": ref, "prov": prov, "depuis": str(DEPUIS), "villes": out}
    with open(os.path.join(R, "data", "etudiants.json"), "w", encoding="utf-8") as f: json.dump(G, f, ensure_ascii=False, separators=(",", ":")); f.write("\n")
    print(json.dumps({ck: [v["serie"].get(ref), v["tend"]] for ck, v in out.items()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
