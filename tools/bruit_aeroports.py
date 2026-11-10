#!/usr/bin/env python3
"""Zones de bruit des aéroports (plans d'exposition au bruit, PEB) autour des 22 villes.

Usage : python3 tools/bruit_aeroports.py     (n'écrit que data/peb.json ; PEB_CACHE=<dossier> : garde les réponses pour un nouvel essai)
Source : Géoplateforme de l'IGN, couches de la DGAC : aérodromes et arrêtés (WFS dgac_peb_arrete_wfs), zones A à D (WMS-V dgac_peb_plan_wmsv,
  lues par GetFeatureInfo en JSON : il n'y a pas de WFS des zones). Une zone touche-t-elle le point demandé ? Le service répond pour une
  petite marge de pixels : on l'interroge sur une grille de points autour de chaque aérodrome et on garde chaque zone une fois.
Règles : aérodromes à 25 km au plus du centre d'une ville ; contours simplifiés à environ 30 m, coordonnées au cent-millième de degré.
  Zone A (bruit très fort) et B (fort) : construction de logements interdite ; C (modéré) : très limitée ; D : isolation renforcée.
Sortie : {"src", "maj", "aero": [{oaci, nom, arrete, date}], "z": [{oaci, zone, lden (indice Lden de la limite extérieure), g: [[[lon, lat], …], …]}]}
"""
import json, math, os, re, sys, time, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WFS = "https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=dgac_peb_arrete_wfs:dgac_peb_arrete_wfs&COUNT=1000&OUTPUTFORMAT=application/json"
WMS = ("https://data.geopf.fr/wms-v/ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=dgac_peb_plan_wmsv&QUERY_LAYERS=dgac_peb_plan_wmsv"
       "&CRS=EPSG:4326&BBOX=%f,%f,%f,%f&WIDTH=101&HEIGHT=101&I=%d&J=%d&INFO_FORMAT=application/json&FEATURE_COUNT=50")
UA = {"User-Agent": "immobilier-tool (outil personnel de comparaison de villes)"}
# noms d'usage (la source les abrège : « B. Bretagne », « O. St-Denis »)
NOMS = {"LFOT": "Tours-Val de Loire", "LFRB": "Brest-Bretagne", "LFRL": "Lanvéoc-Poulmic (aéronavale)", "LFOV": "Laval-Entrammes", "LFRK": "Caen-Carpiquet", "LFBN": "Niort-Souché", "LFOZ": "Orléans-Saint-Denis-de-l'Hôtel", "LFJR": "Angers-Marcé", "LFOF": "Alençon-Valframbert", "LFRC": "Cherbourg-Maupertus", "LFEF": "Amboise-Dierre", "LFOE": "Évreux-Fauville (base aérienne)", "LFRI": "La Roche-sur-Yon-Les Ajoncs", "LFRM": "Le Mans-Arnage", "LFBL": "Limoges-Bellegarde", "LFOR": "Chartres-Métropole", "LFRS": "Nantes-Atlantique", "LFOJ": "Orléans-Bricy (base aérienne)", "LFBI": "Poitiers-Biard", "LFRN": "Rennes-Saint-Jacques", "LFOP": "Rouen-Vallée de Seine", "LFOA": "Avord (base aérienne)", "LFRZ": "Saint-Nazaire-Montoir", "LFOU": "Cholet-Le Pontreau", "LFLD": "Bourges"}


CACHE = os.environ.get("PEB_CACHE")   # dossier où garder les réponses d'un essai à l'autre (facultatif, hors du dépôt)


def get(u):
    if CACHE:
        import hashlib
        k = os.path.join(CACHE, hashlib.md5(u.encode()).hexdigest())
        if os.path.exists(k): return json.load(open(k))
        d = get_net(u)
        if d: os.makedirs(CACHE, exist_ok=True); json.dump(d, open(k, "w"))
        return d
    return get_net(u)


def get_net(u):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=90) as r: return json.loads(r.read().decode("utf-8"))
        except Exception:
            time.sleep(3 * (i + 1))
    return {}


def km(a, b, c, d):
    return 6371 * 2 * math.asin(math.sqrt(math.sin(math.radians(c - a) / 2) ** 2 + math.cos(math.radians(a)) * math.cos(math.radians(c)) * math.sin(math.radians(d - b) / 2) ** 2))


def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; n = math.hypot(dx, dy) or 1e-12; i, dm = -1, 0
    for k in range(1, len(pts) - 1):
        d = abs(dy * (pts[k][0] - a[0]) - dx * (pts[k][1] - a[1])) / n
        if d > dm: dm, i = d, k
    return dp(pts[:i + 1], eps)[:-1] + dp(pts[i:], eps) if dm > eps else [a, b]


def anneau(ring, eps):
    """anneau fermé simplifié : coupé au point le plus éloigné du premier (sinon Douglas-Peucker, dont les deux bouts sont confondus, le réduit à rien)"""
    pts = [tuple(p[:2]) for p in ring]
    if pts[0] != pts[-1]: pts.append(pts[0])
    k = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
    out = dp(pts[:k + 1], eps)[:-1] + dp(pts[k:], eps)
    return out if len(out) >= 4 else pts


def anneaux(g):
    P = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]] if g["type"] == "Polygon" else []
    return [[[round(x, 5), round(y, 5)] for x, y in anneau(ring, 0.0003)] for poly in P for ring in poly if len(ring) >= 4]


def main():
    s = open(os.path.join(R, "src", "js", "00-villes-calcul.js"), encoding="utf-8").read()
    V = [(float(m.group(1)), float(m.group(2))) for m in re.finditer(r'\{k:"\w+",name:"[^"]+",lat:([\d.\-]+),lon:([\d.\-]+)', s)]
    A = [f for f in get(WFS).get("features", []) if f.get("geometry") and any(km(la, lo, f["geometry"]["coordinates"][1], f["geometry"]["coordinates"][0]) <= 25 for la, lo in V)]
    aero, Z = [], {}
    for f in A:
        lo0, la0 = f["geometry"]["coordinates"][:2]; p = f["properties"]
        dl, dg = 0.12, 0.18; seen = 0
        for J in (5, 20, 35, 50, 65, 80, 95):
            for I in (5, 20, 35, 50, 65, 80, 95):
                u = WMS % (la0 - dl, lo0 - dg, la0 + dl, lo0 + dg, I, J); cached = CACHE and os.path.exists(os.path.join(CACHE, __import__("hashlib").md5(u.encode()).hexdigest()))
                d = get(u)
                if not cached: time.sleep(1.05)   # 1 requête par seconde (Géoplateforme)
                for z in d.get("features", []):
                    q = z.get("properties", {})
                    if z.get("id") in Z or not z.get("geometry") or q.get("code_oaci") not in (p.get("oaci"), None): continue
                    Z[z["id"]] = {"oaci": q.get("code_oaci") or p.get("oaci"), "zone": q.get("zone"), "lden": q.get("indldenext"), "date": q.get("date_arret"), "g": anneaux(z["geometry"])}; seen += 1
        aero.append({"oaci": p.get("oaci"), "nom": NOMS.get(p.get("oaci")) or re.sub(r"^\w{4}\s*-\s*", "", p.get("nom") or "").strip().title(), "arrete": p.get("arrete_peb"), "date": next((z["date"] for z in Z.values() if z["oaci"] == p.get("oaci") and z["date"]), None)})
        print(p.get("oaci"), p.get("nom"), seen, "zones", file=sys.stderr)
    G = {"src": "Plans d'exposition au bruit des aérodromes (DGAC), Géoplateforme de l'IGN", "maj": time.strftime("%Y-%m-%d"), "aero": aero,
         "z": sorted(({k: v for k, v in z.items() if k != "date"} for z in Z.values()), key=lambda z: (z["oaci"], z["zone"] or ""))}
    with open(os.path.join(R, "data", "peb.json"), "w", encoding="utf-8") as f: json.dump(G, f, ensure_ascii=False, separators=(",", ":")); f.write("\n")
    print(json.dumps({"aérodromes": len(aero), "zones": len(G["z"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
