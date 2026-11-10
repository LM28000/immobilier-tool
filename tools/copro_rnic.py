#!/usr/bin/env python3
"""Copropriétés des 22 villes, tirées du registre national d'immatriculation des copropriétés (Anah, Licence Ouverte 2.0).

Usage : python3 tools/copro_rnic.py [registre.csv]
  Sans fichier, télécharge l'actualisation quotidienne publiée sur data.gouv.fr (environ 400 Mo, dans le dossier temporaire du système,
  effacée ensuite) et n'écrit que data/copro/<ville>.js. À relancer de temps en temps (le registre change peu d'un mois à l'autre).

Sortie, une ville par fichier, chargé par la page quand on ouvre une annonce ou un bien de la ville (script, comme data/lignes.js,
  pour marcher aussi en fichier local) : COPROQ["<ville>"] = {"src", "maj" (date du registre), "per": [[libellé, de, à], …] (périodes de construction), "noms": [syndics professionnels],
   "c": [[lon, lat, immatriculation, lots, lots principaux, logements, parkings, période, syndic, mandat, nom, drapeaux, parcelles, adresse], …]}
  - lots principaux : habitation, bureaux et commerces (sans parkings ni caves) ;
  - période : indice dans « per », -1 inconnue ; syndic : 1 professionnel, 2 bénévole, 0 non déclaré ;
  - mandat : 0 en cours, 1 aucun mandat déclaré, 2 expiré sans successeur, 3 expiré avec successeur déclaré ;
  - nom : indice dans « noms » (syndics professionnels seulement : le registre ne publie pas le nom des syndics bénévoles), -1 sinon ;
  - drapeaux : 1 résidence-service, 2 aidée par l'Anah depuis 2014, 4 dans un quartier prioritaire (2024) ;
  - parcelles : section et numéro (« AB0782 »), séparés par une espace ; référence complète quand la parcelle est sur une commune déléguée ;
  - adresse : première adresse du règlement de copropriété (numéro et voie, abrégés comme dans le registre).
Le registre ouvert ne donne ni les charges, ni les impayés, ni les procédures : ces points restent à lire dans les documents de la vente.
"""
import csv, json, os, re, sys, tempfile, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JEU = "https://www.data.gouv.fr/api/1/datasets/62da71c068871f4c54258c7c/"
SRC = "Registre national d'immatriculation des copropriétés (Anah), Licence Ouverte 2.0"
MANDAT = {"Mandat en cours": 0, "Pas de mandat en cours": 1, "Mandat expiré sans successeur déclaré": 2, "Mandat expiré avec successeur déclaré": 3}
SYNDIC = {"professionnel": 1, "bénévole": 2}


def periode(s):
    """« De 1949 à 1974 », « AVANT_1949 », « DE_1961_A_1974 », « APRES_2010 », « À compter de 2022 » → (libellé, de, à) ; None si inconnue"""
    t = (s or "").replace("_", " ").strip().lower()
    y = [int(x) for x in re.findall(r"\d{4}", t)]
    if not y: return None
    if t.startswith("avant"): return ("avant %d" % y[0], 0, y[0] - 1)
    if t.startswith("apr"): return ("après %d" % y[0], y[0] + 1, 9999)
    if "compter" in t: return ("depuis %d" % y[0], y[0], 9999)
    return ("de %d à %d" % (y[0], y[-1]), y[0], y[-1]) if len(y) > 1 else None


def entier(s):
    s = (s or "").strip()
    return int(s) if s.isdigit() else None


def parcelles(r, insee):
    out = []
    for i in (1, 2, 3):
        sec, num = (r.get("section_parcelle_%d" % i) or "").strip().upper(), (r.get("numero_parcelle_%d" % i) or "").strip()
        if not sec or not num.isdigit(): continue
        com, pre = (r.get("code_insee_parcelle_%d" % i) or "").strip(), (r.get("prefixe_parcelle_%d" % i) or "000").strip() or "000"
        k = sec + num.zfill(4)
        out.append(k if (com in ("", insee) and pre == "000") else com + pre + k)
    return " ".join(dict.fromkeys(out))


def source():
    """chemin du registre : argument, sinon téléchargement de l'actualisation quotidienne"""
    if len(sys.argv) > 1: return sys.argv[1], None, False
    with urllib.request.urlopen(JEU, timeout=60) as r: d = json.loads(r.read().decode("utf-8"))
    res = [x for x in d["resources"] if (x.get("format") or "").lower() == "csv" and "quotidienne" in (x.get("title") or "").lower()]
    res = res or sorted((x for x in d["resources"] if (x.get("format") or "").lower() == "csv" and (x.get("filesize") or 0) > 1e8), key=lambda x: x.get("last_modified") or "", reverse=True)
    if not res: sys.exit("registre introuvable sur data.gouv.fr")
    x = res[0]; fd, p = tempfile.mkstemp(suffix=".csv"); os.close(fd)
    with urllib.request.urlopen(x["url"], timeout=600) as r, open(p, "wb") as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)
    return p, (x.get("last_modified") or "")[:10], True


def extraire(path, villes):
    codes = {v: k for k, v in villes.items()}
    C = {k: [] for k in villes}; maj = ""
    with open(path, encoding="utf-8", errors="replace", newline="") as f:
        for r in csv.DictReader(f):
            ck = codes.get((r.get("code_officiel_commune") or "").strip()) or codes.get((r.get("commune") or "").strip())
            if not ck: continue
            try: lon, lat = float(r["longitude"]), float(r["latitude"])
            except (KeyError, ValueError): continue
            maj = max(maj, (r.get("date_derniere_maj") or "")[:10])
            C[ck].append((r, lon, lat))
    return C, maj


def ville(rows, insee):
    per, noms, out = [], [], []
    for r, lon, lat in rows:
        p = periode(r.get("periode_construction"))
        if p and list(p) not in per: per.append(list(p))
        syn = SYNDIC.get((r.get("type_syndic") or "").strip(), 0)
        nom = (r.get("raison_sociale_representant_legal") or "").strip() if syn == 1 else ""
        if nom and nom not in noms: noms.append(nom)
        fl = (1 if (r.get("residence_service") or "").strip().lower() == "oui" else 0) | (2 if (r.get("copro_aidee") or "").strip().lower() == "oui" else 0) | (4 if (r.get("code_qp_2024") or "").strip() else 0)
        out.append([round(lon, 5), round(lat, 5), (r.get("numero_immatriculation") or "").strip(), entier(r.get("nombre_total_lots")),
                    entier(r.get("nombre_lots_habitation_bureaux_commerces")), entier(r.get("nombre_lots_habitation")),
                    entier(r.get("nombre_lots_stationnement")), p, syn, MANDAT.get((r.get("mandat_en_cours") or "").strip(), 1), nom, fl, parcelles(r, insee),
                    re.sub(r"\s+", " ", (r.get("numero_voie_adresse") or "").strip())[:60]])
    per.sort(key=lambda x: (x[1], x[2])); noms.sort()
    pi, ni = {tuple(x): i for i, x in enumerate(per)}, {n: i for i, n in enumerate(noms)}
    for x in out: x[7] = pi[tuple(x[7])] if x[7] else -1; x[10] = ni[x[10]] if x[10] else -1
    out.sort(key=lambda x: x[2])
    return per, noms, out


def main():
    villes = json.load(open(os.path.join(R, "tools", "villes.json"), encoding="utf-8"))
    path, date, tmp = source()
    try: C, maj = extraire(path, villes)
    finally:
        if tmp: os.remove(path)
    os.makedirs(os.path.join(R, "data", "copro"), exist_ok=True)
    res = {}
    for ck, rows in sorted(C.items()):
        if not rows: continue
        per, noms, out = ville(rows, villes[ck])
        G = {"src": SRC, "maj": date or maj, "per": per, "noms": noms}
        with open(os.path.join(R, "data", "copro", ck + ".js"), "w", encoding="utf-8") as f:
            f.write("(window.COPROQ=window.COPROQ||{})[%s]=" % json.dumps(ck) + json.dumps(G, ensure_ascii=False, separators=(",", ":"))[:-1] + ',"c":[\n')
            f.write(",\n".join(json.dumps(x, ensure_ascii=False, separators=(",", ":")) for x in out) + "\n]};\n")
        res[ck] = len(out)
    print(json.dumps({"maj": date or maj, "copropriétés": sum(res.values()), "par_ville": res}, ensure_ascii=False))


if __name__ == "__main__":
    main()
