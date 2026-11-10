#!/usr/bin/env python3
"""Bruit des quartiers : distance du centre de chaque quartier aux grands axes et voies ferrées, et part du quartier exposée au bruit
des routes, des trains et des avions (la vue « Bruit » de la carte).

Usage : python3 tools/bruit_expo.py [ville …]   (n'écrit que data/bruit-quartiers.json, data/bruit-expo.json et data/bruit/<ville>.js ; sans argument : toutes les villes ;
        BRUIT_CACHE=<dossier> : garde les réponses d'OpenStreetMap d'un essai à l'autre, hors du dépôt)
Sources : contours des quartiers IRIS (data/irisdata.js) ; voies d'OpenStreetMap (Overpass, ODbL) : voie rapide = autoroute, voie express
  et leurs bretelles (motorway, trunk), grand axe = route primaire ou secondaire (primary, secondary : selon les villes, OpenStreetMap range
  les grands boulevards dans l'une ou l'autre), voie ferrée = railway=rail hors voies de service ; zones A à D des plans d'exposition au bruit
  des aérodromes (data/peb.json, tools/bruit_aeroports.py).
Règles (les mêmes partout) :
  - centre du quartier = moyenne des sommets de sa plus grande partie (comme tools/collecte/quartiers.js) ; distance à la voie la plus proche
    de chaque sorte, avec son nom (voie rapide : son numéro, sinon son nom ; grand axe : son nom, sinon son numéro ; voie ferrée : son nom, jamais le numéro de ligne SNCF), null au-delà de 3 km ;
  - part exposée : une grille de points couvre le quartier (environ 80 points, de 25 à 150 m d'écart) ; un point est exposé s'il est à 300 m
    au plus d'une voie rapide, à 50 m au plus d'un grand axe, à 100 m au plus d'une voie ferrée, ou dans la zone A, B ou C d'un aérodrome
    (classement sonore des voies, arrêté du 30 mai 1996 : 300 m pour la catégorie 1, 100 m pour la 3, 30 m pour la 4) ; part des points exposés, en %.
  Un repère pour comparer les quartiers, pas une mesure du bruit.
Sorties : data/bruit-quartiers.json {ville: {code IRIS: [[mètres, nom] | null] × 3 (voie rapide, grand axe, voie ferrée)}} ;
  data/bruit-expo.json {"src", "maj", "regle", "villes": {ville: {code IRIS: part exposée en %}}} ;
  data/bruit/<ville>.js : les voies elles-mêmes, simplifiées à 5 m, pour mesurer dans la page à la position d'une annonce ou à une adresse
  sans interroger OpenStreetMap (chargé avec la fiche) : (window.BRUITV=window.BRUITV||{})["<ville>"]={"maj", "bb": [lon min, lat min, lon max, lat max],
  "w": [[0 voie rapide | 1 grand axe | 2 voie ferrée, nom, polyligne encodée (précision 5)], …]}
"""
import hashlib, json, math, os, re, sys, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gtfs_lignes import dp, encode

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(R, "data", "bruit-expo.json")
SERVEURS = ["https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
UA = {"User-Agent": "immobilier-tool (outil personnel de comparaison de villes)"}
CACHE = os.environ.get("BRUIT_CACHE")
DIST = (300, 50, 100)   # voie rapide, grand axe, voie ferrée : mètres
OUTQ = os.path.join(R, "data", "bruit-quartiers.json")


def overpass(q):
    k = os.path.join(CACHE, hashlib.md5(q.encode()).hexdigest() + ".json") if CACHE else None
    if k and os.path.exists(k): return json.load(open(k))
    for essai in range(6):
        for u in SERVEURS:
            try:
                req = urllib.request.Request(u, data=urllib.parse.urlencode({"data": q}).encode(), headers=UA)
                with urllib.request.urlopen(req, timeout=240) as r: d = json.loads(r.read().decode("utf-8"))
                if k: os.makedirs(CACHE, exist_ok=True); json.dump(d, open(k, "w"))
                return d
            except Exception as e:
                print("  ", u.split("/")[2], "indisponible :", str(e)[:60], file=sys.stderr)
        time.sleep(20 * (essai + 1))   # serveurs saturés : on réessaie plus tard
    return None


def iris():
    s = open(os.path.join(R, "data", "irisdata.js"), encoding="utf-8").read()
    I = json.loads(s[s.index("{"):s.rindex("}") + 1]); out = {}
    for ck, v in I.items():
        Q = {}
        for line in v["txt"].split("\n"):
            p = line.split("|")
            if len(p) < 4: continue
            rings = []
            for r in p[3].split(";"):
                X = Y = 0; ring = []
                for xy in r.split(" "):
                    a, b = xy.split(","); X += int(a); Y += int(b); ring.append((X / 1e4, Y / 1e4))   # (lon, lat)
                if len(ring) >= 3: rings.append(ring)
            if rings: Q[p[1]] = rings
        out[ck] = Q
    return out


def dedans(x, y, rings):
    ins = False
    for r in rings:
        j = len(r) - 1
        for i in range(len(r)):
            xi, yi = r[i]; xj, yj = r[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: ins = not ins
            j = i
    return ins


def main():
    villes = sys.argv[1:]; I = iris()
    G = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"villes": {}}
    BQ = json.load(open(OUTQ, encoding="utf-8")) if os.path.exists(OUTQ) else {}
    peb = json.load(open(os.path.join(R, "data", "peb.json"), encoding="utf-8"))
    zones = [z["g"] for z in peb["z"] if z.get("zone") in ("A", "B", "C")]
    for ck, Q in I.items():
        if villes and ck not in villes: continue
        allp = [p for rings in Q.values() for r in rings for p in r]
        lo0, lo1 = min(p[0] for p in allp) - 0.045, max(p[0] for p in allp) + 0.045
        la0, la1 = min(p[1] for p in allp) - 0.03, max(p[1] for p in allp) + 0.03
        bb = "%.4f,%.4f,%.4f,%.4f" % (la0, lo0, la1, lo1)
        q = f'[out:json][timeout:200];(way["highway"~"^(motorway|trunk)(_link)?$"]({bb});way["highway"~"^(primary|secondary)(_link)?$"]({bb});way["railway"="rail"][!"service"]({bb}););out tags geom;'
        print(ck, len(Q), "quartiers", file=sys.stderr); d = overpass(q)
        if d is None: print("  pas de réponse d'OpenStreetMap : ville gardée telle quelle", file=sys.stderr); continue
        la_m = (la0 + la1) / 2; kx, ky = 111320 * math.cos(math.radians(la_m)), 110540
        P = lambda lo, la: ((lo - lo0) * kx, (la - la0) * ky)
        # segments par catégorie, rangés dans une grille de 200 m pour aller vite
        CELL = 200; idx = [{}, {}, {}]; voies = [[], [], []]
        for e in d.get("elements", []):
            g = e.get("geometry") or []; t = e.get("tags") or {}; h = t.get("highway", "")
            c = 0 if re.match(r"(motorway|trunk)", h) else 1 if h else 2
            nom = (t.get("ref") or t.get("name") or "") if c == 0 else (t.get("name") or t.get("ref") or "") if c == 1 else (t.get("name") or "")   # voie ferrée : son nom, pas le numéro SNCF
            pts = [P(n["lon"], n["lat"]) for n in g]
            if len(pts) > 1: voies[c].append((nom[:40], pts))
            for a, b in zip(pts, pts[1:]):
                r = DIST[c]
                for cx in range(int((min(a[0], b[0]) - r) // CELL), int((max(a[0], b[0]) + r) // CELL) + 1):
                    for cy in range(int((min(a[1], b[1]) - r) // CELL), int((max(a[1], b[1]) + r) // CELL) + 1):
                        idx[c].setdefault((cx, cy), []).append((a, b))
        def pres(x, y):
            for c in range(3):
                r2 = DIST[c] ** 2
                for (a, b) in idx[c].get((int(x // CELL), int(y // CELL)), ()):
                    dx, dy = b[0] - a[0], b[1] - a[1]; L = dx * dx + dy * dy
                    t = max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)) if L else 0
                    if (a[0] + t * dx - x) ** 2 + (a[1] + t * dy - y) ** 2 <= r2: return True
            return False
        def proche(x, y, c):
            m, nm = 1e18, ""
            for nom, pts in voies[c]:
                for a, b in zip(pts, pts[1:]):
                    dx, dy = b[0] - a[0], b[1] - a[1]; L = dx * dx + dy * dy
                    t = max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)) if L else 0
                    d2 = (a[0] + t * dx - x) ** 2 + (a[1] + t * dy - y) ** 2
                    if d2 < m: m, nm = d2, nom
            m = math.sqrt(m); return [round(m), nm] if m <= 3000 else None
        res, cen = {}, {}
        for code, rings in Q.items():
            big = max(rings, key=len); cx, cy = P(sum(p[0] for p in big) / len(big), sum(p[1] for p in big) / len(big))
            cen[code] = [proche(cx, cy, c) for c in range(3)]
            xs = [p[0] for r in rings for p in r]; ys = [p[1] for r in rings for p in r]
            w, h = (max(xs) - min(xs)) * kx, (max(ys) - min(ys)) * ky
            s = min(150, max(25, math.sqrt(max(w * h, 1) / 160)))   # environ 80 points dans le quartier (la moitié de la boîte, en moyenne)
            n = ex = 0; y = min(ys) + s / ky / 2
            while y < max(ys):
                x = min(xs) + s / kx / 2
                while x < max(xs):
                    if dedans(x, y, rings):
                        n += 1
                        if pres(*P(x, y)) or any(dedans(x, y, z) for z in zones): ex += 1
                    x += s / kx
                y += s / ky
            if n: res[code] = round(ex / n * 100)
        G["villes"][ck] = res; BQ[ck] = cen
        W = []
        for e in d.get("elements", []):
            g = [(n["lat"], n["lon"]) for n in (e.get("geometry") or []) if n]
            if len(g) < 2: continue
            t = e.get("tags") or {}; h = t.get("highway", ""); c = 0 if re.match(r"(motorway|trunk)", h) else 1 if h else 2
            nom = (t.get("ref") or t.get("name") or "") if c == 0 else (t.get("name") or t.get("ref") or "") if c == 1 else (t.get("name") or "")
            xy = [P(lo, la) for la, lo in g]; W.append([c, nom[:40], encode([g[i] for i in dp(xy, 5.0)])])
        os.makedirs(os.path.join(R, "data", "bruit"), exist_ok=True)
        with open(os.path.join(R, "data", "bruit", ck + ".js"), "w", encoding="utf-8") as f:
            f.write('(window.BRUITV=window.BRUITV||{})["%s"]=' % ck + json.dumps({"maj": time.strftime("%Y-%m-%d"), "bb": [round(lo0, 4), round(la0, 4), round(lo1, 4), round(la1, 4)], "w": W}, ensure_ascii=False, separators=(",", ":")) + ";\n")
        print("  exposés en médiane :", sorted(res.values())[len(res) // 2] if res else None, "%", file=sys.stderr)
    G.update({"src": "OpenStreetMap et ses contributeurs (ODbL) ; plans d'exposition au bruit des aérodromes (DGAC, Géoplateforme de l'IGN) ; contours IRIS (IGN)",
              "maj": time.strftime("%Y-%m-%d"), "regle": "part du quartier à 300 m au plus d'une voie rapide, à 50 m au plus d'un grand axe (route primaire ou secondaire), à 100 m au plus d'une voie ferrée, ou en zone A, B ou C d'un aérodrome"})
    G["villes"] = dict(sorted(G["villes"].items()))
    with open(OUT, "w", encoding="utf-8") as f: json.dump(G, f, ensure_ascii=False, separators=(",", ":")); f.write("\n")
    with open(OUTQ, "w", encoding="utf-8") as f: json.dump({k: BQ[k] for k in sorted(BQ)}, f, ensure_ascii=False, separators=(",", ":")); f.write("\n")
    print(json.dumps({ck: len(v) for ck, v in G["villes"].items()}))


if __name__ == "__main__":
    main()
