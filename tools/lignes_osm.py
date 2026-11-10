#!/usr/bin/env python3
"""Tracés des lignes de bus et tram dans les rues : remplace, dans data/lignes.js, le tracé publié par le réseau (souvent grossier, un point
tous les 200 m environ, qui coupe les virages et les pâtés de maisons) par celui d'OpenStreetMap, quand la ligne y est retrouvée.

Usage : python3 tools/lignes_osm.py [ville …]   (après tools/gtfs_lignes.py, qui réécrit les tracés du réseau ; n'écrit que data/lignes.js ;
        LIGNES_CACHE=<dossier> : garde les réponses d'OpenStreetMap d'un essai à l'autre, hors du dépôt)
Source : relations « route » de bus, tram, trolleybus et métro d'OpenStreetMap (Overpass, ODbL), dans l'emprise des lignes de la ville.
Règles (les mêmes pour toutes les villes) :
 1. Candidates : relations dont le numéro (ref) est celui de la ligne (majuscules, espaces, zéros de tête et mot « Ligne » ignorés).
 2. Une relation est gardée si elle recouvre le tracé du réseau dans les deux sens : 70 % au moins des points du tracé du réseau (un tous
    les 25 m) sont à 120 m au plus de ses voies, et 70 % au moins des points de ses voies sont à 150 m au plus du tracé du réseau
    (écarte un car régional, ou une ligne d'une autre ville, qui porte le même numéro).
 3. Tracé : les voies des relations gardées (ni arrêts ni quais), chacune une fois, mises bout à bout, simplifiées à 4 m.
 4. Ligne sans relation gardée : le tracé du réseau reste. Une ligne dont le tracé vient d'OpenStreetMap porte "o": 1.
"""
import hashlib, json, math, os, re, sys, time, urllib.parse, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, "tools"))
from gtfs_lignes import dp, encode, SORTIE

SERVEURS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
UA = {"User-Agent": "immobilier-tool (outil personnel de comparaison de villes)"}
CACHE = os.environ.get("LIGNES_CACHE")
COUV, D_RES, D_OSM, PAS, TOL = 0.70, 120.0, 150.0, 25.0, 4.0


def overpass(q):
    k = os.path.join(CACHE, hashlib.md5(q.encode()).hexdigest() + ".json") if CACHE else None
    if k and os.path.exists(k): return json.load(open(k))
    for essai in range(6):
        for u in SERVEURS:
            try:
                req = urllib.request.Request(u, data=urllib.parse.urlencode({"data": q}).encode(), headers=UA)
                with urllib.request.urlopen(req, timeout=300) as r: d = json.loads(r.read().decode("utf-8"))
                if k: os.makedirs(CACHE, exist_ok=True); json.dump(d, open(k, "w"))
                return d
            except Exception as e:
                print("  ", u.split("/")[2], "indisponible :", str(e)[:60], file=sys.stderr)
        time.sleep(20 * (essai + 1))   # serveurs saturés : on réessaie plus tard
    return None


def decode(p):
    pts, i, la, lo = [], 0, 0, 0
    while i < len(p):
        for k in (0, 1):
            r = sh = 0
            while True:
                b = ord(p[i]) - 63; i += 1; r |= (b & 0x1f) << sh; sh += 5
                if b < 0x20: break
            d = ~(r >> 1) if r & 1 else r >> 1
            if k == 0: la += d
            else: lo += d
        pts.append((la / 1e5, lo / 1e5))
    return pts


def norm(ref):
    s = re.sub(r"\s+", "", re.sub(r"(?i)^ligne\s+", "", str(ref or "").strip())).upper()
    return s.lstrip("0") or s


class Proj:
    def __init__(self, la0, lo0): self.la0, self.lo0, self.ky, self.kx = la0, lo0, 110574.0, 111320.0 * math.cos(math.radians(la0))
    def xy(self, la, lo): return ((lo - self.lo0) * self.kx, (la - self.la0) * self.ky)


def dense(xy, pas):
    out = []
    for (ax, ay), (bx, by) in zip(xy, xy[1:]):
        n = max(1, int(math.hypot(bx - ax, by - ay) / pas))
        out += [(ax + (bx - ax) * k / n, ay + (by - ay) * k / n) for k in range(n)]
    if xy: out.append(xy[-1])
    return out


def couverture(A, B, d):
    """part des points de A à d mètres au plus d'un point de B (B densifié finement)"""
    if not A or not B: return 0.0
    g = {}
    for x, y in B: g.setdefault((int(x // d), int(y // d)), []).append((x, y))
    ok = 0
    for x, y in A:
        cx, cy = int(x // d), int(y // d)
        if any((px - x) ** 2 + (py - y) ** 2 <= d * d for i in (-1, 0, 1) for j in (-1, 0, 1) for px, py in g.get((cx + i, cy + j), ())): ok += 1
    return ok / len(A)


def chaines(ways):
    """voies mises bout à bout quand elles se touchent (pour moins de morceaux)"""
    W = [list(w) for w in ways if len(w) > 1]; out = []
    key = lambda p: (round(p[0], 6), round(p[1], 6))
    while W:
        c = W.pop(); grew = True
        while grew:
            grew = False
            for i, w in enumerate(W):
                if key(w[0]) == key(c[-1]): c += w[1:]
                elif key(w[-1]) == key(c[-1]): c += w[::-1][1:]
                elif key(w[-1]) == key(c[0]): c = w + c[1:]
                elif key(w[0]) == key(c[0]): c = w[::-1] + c[1:]
                else: continue
                W.pop(i); grew = True; break
        out.append(c)
    return out


def main():
    txt = open(SORTIE, encoding="utf-8").read().strip(); L = json.loads(txt[len("const LIGNES="):].rstrip(";"))
    villes = sys.argv[1:] or list(L["villes"])
    for ck in villes:
        v = L["villes"].get(ck)
        if not v: print(ck, "absente de data/lignes.js", file=sys.stderr); continue
        allp = [p for l in v["l"] for g in l["g"] for p in decode(g)]
        la0, la1, lo0, lo1 = min(p[0] for p in allp) - 0.01, max(p[0] for p in allp) + 0.01, min(p[1] for p in allp) - 0.01, max(p[1] for p in allp) + 0.01
        q = '[out:json][timeout:300];relation["type"="route"]["route"~"^(bus|tram|trolleybus|subway|light_rail)$"](%.4f,%.4f,%.4f,%.4f);out geom;' % (la0, lo0, la1, lo1)
        print(ck, len(v["l"]), "lignes", file=sys.stderr); d = overpass(q)
        if d is None: print("  pas de réponse d'OpenStreetMap : tracés du réseau gardés", file=sys.stderr); continue
        P = Proj((la0 + la1) / 2, (lo0 + lo1) / 2)
        rel = {}
        for e in d.get("elements", []):
            if e.get("type") != "relation": continue
            ways = [(m["ref"], [(n["lat"], n["lon"]) for n in m["geometry"] if n]) for m in e.get("members", [])
                    if m.get("type") == "way" and m.get("geometry") and not re.search(r"platform|stop", m.get("role") or "")]
            if ways: rel.setdefault(norm((e.get("tags") or {}).get("ref")), []).append(ways)
        n_osm = 0
        for l in v["l"]:
            l.pop("o", None)
            cand = rel.get(norm(l["n"]), [])
            if not cand: continue
            G = [P.xy(*p) for g in l["g"] for p in decode(g)]
            Gf = [q for g in l["g"] for q in dense([P.xy(*p) for p in decode(g)], 10)]
            Gs = [q for g in l["g"] for q in dense([P.xy(*p) for p in decode(g)], PAS)]
            gard = {}
            for ways in cand:
                Wf = [q for _, w in ways for q in dense([P.xy(*p) for p in w], 10)]
                Ws = [q for _, w in ways for q in dense([P.xy(*p) for p in w], PAS)]
                if couverture(Gs, Wf, D_RES) >= COUV and couverture(Ws, Gf, D_OSM) >= COUV:
                    for wid, w in ways: gard[wid] = w
            if not gard or not G: continue
            out = []
            for c in chaines(list(gard.values())):
                xy = [P.xy(*p) for p in c]; keep = dp(xy, TOL); out.append(encode([c[i] for i in keep]))
            l["g"], l["o"] = out, 1; n_osm += 1
        print("  %d lignes sur %d tracées d'après OpenStreetMap" % (n_osm, len(v["l"])), file=sys.stderr)
    txt = "const LIGNES=" + json.dumps(L, separators=(",", ":"), ensure_ascii=False) + ";"
    open(SORTIE, "w", encoding="utf-8").write(txt)
    print("data/lignes.js : %.1f Ko" % (len(txt.encode()) / 1024))


if __name__ == "__main__":
    main()
