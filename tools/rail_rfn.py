#!/usr/bin/env python3
"""Grandes lignes de train pour la vue dézoomée de la carte (le fond de carte n'a pas de voies ferrées sous le zoom 8).

Usage : python3 tools/rail_rfn.py [formes.geojson vitesse.json]
  Sans fichiers, lit l'open data de SNCF Réseau (licence ODbL), sans rien écrire d'autre que data/rail.json :
  « Formes des lignes du RFN » (tracés par tronçon, statut) et « Vitesse maximale nominale sur ligne » (vitesse par section, en points kilométriques).

Règle, la même pour toutes les lignes :
- tronçons de type « Ligne » au statut « Exploitée » (pas les raccordements ni les lignes fermées ou neutralisées) ;
- grande vitesse : au moins la moitié de la longueur du tronçon à 250 km/h ou plus ;
- ligne rapide : au moins 40 % de la longueur à 140 km/h ou plus (au-dessous : ligne régionale, non dessinée) ;
- tronçons qui passent dans l'Ouest (longitude −5,6 à 3,2, latitude 45,2 à 50,2), Paris compris ;
- tracés simplifiés à environ 400 m (Douglas-Peucker), coordonnées au millième de degré.
Sortie : data/rail.json, GeoJSON {type, features: [{properties: {v: "lgv" | "gl"}, geometry: LineString}], source, regle, maj}.
"""
import json, math, os, sys, datetime, collections, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/"
EMPRISE = (-5.6, 45.2, 3.2, 50.2)


def lire(arg, ds, fmt):
    if arg: return json.load(open(arg, encoding="utf-8"))
    with urllib.request.urlopen(BASE + ds + "/exports/" + fmt, timeout=180) as r: return json.loads(r.read().decode("utf-8"))


def pk(s):
    a = str(s).replace(" ", "").split("+")
    return float(a[0]) + (float(a[1]) / 1000 if len(a) > 1 else 0)


def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; n = math.hypot(dx, dy) or 1e-12; i, dm = -1, 0
    for k in range(1, len(pts) - 1):
        d = abs(dy * (pts[k][0] - a[0]) - dx * (pts[k][1] - a[1])) / n
        if d > dm: dm, i = d, k
    return dp(pts[:i + 1], eps)[:-1] + dp(pts[i:], eps) if dm > eps else [a, b]


def main():
    args = sys.argv[1:3] + [None, None]
    formes, vit = lire(args[0], "formes-des-lignes-du-rfn", "geojson"), lire(args[1], "vitesse-maximale-nominale-sur-ligne", "json")
    V = collections.defaultdict(list)
    for x in vit:
        try: a, b = pk(x["pkd"]), pk(x["pkf"]); V[x["code_ligne"]].append((min(a, b), max(a, b), int(x["v_max"])))
        except (KeyError, ValueError, TypeError): pass
    def parts(code, a, b):
        a, b = min(a, b), max(a, b); L = H = G = 0
        for p, q, v in V.get(code, []):
            o = min(b, q) - max(a, p)
            if o > 0: L += o; H += o * (v >= 250); G += o * (v >= 140)
        return (H / L, G / L) if L else (0, 0)
    out = []
    for f in formes["features"]:
        p, g = f["properties"], f["geometry"]
        if p.get("libelle") != "Exploitée" or p.get("mnemo_type") != "Ligne" or not g: continue
        try: h, r = parts(p["code_ligne"], pk(p["pk_debut_r"]), pk(p["pk_fin_r"]))
        except (KeyError, ValueError, TypeError): continue
        v = "lgv" if h >= 0.5 else "gl" if r >= 0.4 else None
        if not v: continue
        for L in (g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]):
            if not any(EMPRISE[0] <= x <= EMPRISE[2] and EMPRISE[1] <= y <= EMPRISE[3] for x, y in L): continue
            s = dp([(x, y) for x, y in L], 0.004)
            out.append({"type": "Feature", "properties": {"v": v}, "geometry": {"type": "LineString", "coordinates": [[round(x, 3), round(y, 3)] for x, y in s]}})
    G = {"type": "FeatureCollection", "source": "SNCF Réseau, formes des lignes du RFN et vitesses maximales nominales (ODbL)",
         "regle": "lignes exploitées ; grande vitesse : la moitié au moins à 250 km/h ou plus ; rapide : 40 % au moins à 140 km/h ou plus",
         "maj": datetime.date.today().isoformat(), "features": out}
    with open(os.path.join(R, "data/rail.json"), "w", encoding="utf-8") as f: json.dump(G, f, ensure_ascii=False, separators=(",", ":")); f.write("\n")
    print(json.dumps({"tracés": len(out), "lgv": sum(x["properties"]["v"] == "lgv" for x in out), "rapides": sum(x["properties"]["v"] == "gl" for x in out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
