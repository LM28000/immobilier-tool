#!/usr/bin/env python3
"""Tracés des lignes de bus, tram et métro de chaque ville, depuis les GTFS officiels (transport.data.gouv.fr).
Écrit data/lignes.js : const LIGNES={"date":…,"villes":{clé:{"reseau","jour","l":[{n,nm,c,t,f,g:[polylignes]}]}}}.
Usage : python3 tools/gtfs_lignes.py [ville …]   (sans argument : toutes les villes ; les villes non recalculées sont conservées)
Télécharge les zips manquants dans data/gtfs/<clé>.zip (ou utilise celui qui s'y trouve ; dossier ignoré par git).

Règles (les mêmes pour toutes les villes) :
1. Jour de référence : mardi 2026-11-10. Si le calendrier du flux ne le couvre pas (ou s'il y a nettement moins de
   courses ce jour-là, jour férié ou vacances), on prend le mardi le plus proche qui a un service normal (≥ 70 % du maximum
   des mardis alentour). Service actif = calendar.txt (jours de semaine entre début et fin) puis exceptions de calendar_dates.txt
   (un flux peut n'avoir que calendar_dates).
2. Lignes « régulières » : route_type 0 (tram), 1 (métro), 3 (bus) ou 11 (trolleybus), avec au moins 8 courses ce jour-là
   (écarte lignes scolaires et transport à la demande).
3. Tracé par ligne : pour chaque direction_id, le shape_id le plus utilisé ce jour-là, plus les autres tracés qui ont au moins
   30 % de ses courses (antennes). Sans shapes.txt (ou course sans tracé) : suite d'arrêts de l'itinéraire le plus fréquent.
   Un tracé est ensuite écarté si au moins 85 % de ses points sont à moins de 40 m des tracés déjà gardés de la ligne
   (retire le sens retour qui passe par les mêmes rues).
4. Seules les lignes ayant au moins un point à ~13 km du centre (±0,12° de latitude, ±0,18° de longitude) sont gardées.
5. Simplification de Douglas-Peucker à 10 m (mètres équirectangulaires locaux), puis polyligne encodée Google, précision 5.
6. Couleur : route_color en #RRGGBB ; absente ou quasi blanche (tous canaux > 0xE8) : #6250d6 (tram, métro) ou #5b6472 (bus).
Tri : tram/métro d'abord, puis nombre de courses décroissant."""
import csv, io, json, math, os, re, subprocess, sys, zipfile, datetime, collections

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOSSIER = os.path.join(RACINE, "data", "gtfs")
SORTIE = os.path.join(RACINE, "data", "lignes.js")
JOUR = datetime.date(2026, 11, 10)
D = "https://www.data.gouv.fr/api/1/datasets/r/"
# clé : (réseau, url, lat, lon)
VILLES = {
    "lemans": ("Setram", D + "dee9adc5-044c-4f68-9cd3-eefbdf7a6abd", 48.00, 0.20),
    "angers": ("Irigo", D + "32f30b64-33f7-43bb-9b6f-34c21c2f83a3", 47.47, -0.55),
    "tours": ("Fil Bleu", D + "198b7602-5e74-4d88-b6bc-483af85a2430", 47.39, 0.69),
    "poitiers": ("Vitalis", D + "82146378-f019-4048-aa16-7328081b0369", 46.58, 0.34),
    "laval": ("TUL", D + "bd780aef-b3c5-405a-8450-8365a7a0c315", 48.07, -0.77),
    "orleans": ("TAO", D + "b2dfbaa3-47e9-4749-b6a4-750bebd760e7", 47.90, 1.91),
    "chartres": ("Filibus", D + "8d4c3e5c-1702-4649-b47a-b16c6016dcc6", 48.45, 1.49),
    "stnazaire": ("Ycéo", D + "a1867718-7921-42a6-b672-c53b8c583aa3", 47.27, -2.21),
    "rennes": ("STAR", D + "0644f537-575e-4cce-9570-06165d6f3b27", 48.11, -1.68),
    "blois": ("Azalys", D + "e6e0228d-9916-4216-bb5f-7d3edf57866c", 47.59, 1.335),
    "caen": ("Twisto", D + "a5a8f046-e282-4010-91c5-82bc1f70ff73", 49.18, -0.37),
    "cholet": ("Choletbus", D + "71e8ee8e-0b55-40a1-a297-21ef89aba4dc", 47.06, -0.88),
    "laroche": ("Impulsyon", D + "735f1b54-94ee-4a21-b378-05c2b44ad70f", 46.67, -1.43),
    "evreux": ("Transurbain", "https://transport.data.gouv.fr/resources/80613/download", 49.02, 1.141),
    "bourges": ("AggloBus", D + "ef2f826c-c1c6-4eb4-9da3-4c2f37b3afaf", 47.08, 2.398),
    "niort": ("Tanlib", D + "d724a6df-7dc4-4b2d-be15-fc8b1d52c8ea", 46.33, -0.461),
    "limoges": ("TCL", D + "99e0887d-4855-47f7-a03b-a8235dfc86b7", 45.86, 1.226),
    "brest": ("Bibus", D + "583d1419-058b-481b-b378-449cab744c82", 48.41, -4.5),
    "alencon": ("Alto", "https://transport.data.gouv.fr/resources/81942/download", 48.43, 0.092),
    "cherbourg": ("Cap Cotentin", D + "2e97c9b3-a59f-42dd-9b9e-a232fa771f21", 49.63, -1.636),
    "nantes": ("Naolib", D + "65bdd7e4-a8e7-4a54-893a-808e71c34d68", 47.2184, -1.5536),
}
# filtre d'agence par ville (flux régional) : expression sur agency_name
AGENCE = {"alencon": r"alto|alen[cç]on"}
TYPES = {0: 0, 1: 1, 3: 3, 11: 11}
MIN_COURSES, SEUIL_BRANCHE, SEUIL_DOUBLON, DIST_DOUBLON, TOL = 8, 0.30, 0.85, 40.0, 10.0
DLAT, DLON = 0.12, 0.18


def telecharge(cle):
    p = os.path.join(DOSSIER, cle + ".zip")
    if os.path.exists(p) and os.path.getsize(p) > 1000: return p
    os.makedirs(DOSSIER, exist_ok=True)
    subprocess.run(["curl", "-L", "-sS", "--fail", "-o", p, VILLES[cle][1]], check=True)
    return p


def lire(z, nom):
    """Lignes d'un fichier du zip, en flux (None si absent)."""
    for n in z.namelist():
        if n.split("/")[-1] == nom:
            f = io.TextIOWrapper(z.open(n), encoding="utf-8-sig", newline="")
            return csv.DictReader(f)
    return None


def type_route(t):
    try: t = int(t)
    except (TypeError, ValueError): return None
    if t in TYPES: return TYPES[t]
    if 700 <= t < 800: return 3
    if 900 <= t < 1000: return 0
    if 400 <= t < 500: return 1
    if 800 <= t < 900: return 11
    return None


def services_actifs(z, jour):
    """Ensemble des service_id actifs ce jour-là."""
    ds = jour.strftime("%Y%m%d"); wd = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][jour.weekday()]
    actifs = set(); r = lire(z, "calendar.txt")
    if r:
        for row in r:
            if row.get(wd, "").strip() == "1" and row["start_date"].strip() <= ds <= row["end_date"].strip(): actifs.add(row["service_id"])
    r = lire(z, "calendar_dates.txt")
    if r:
        for row in r:
            if row["date"].strip() == ds:
                if row["exception_type"].strip() == "1": actifs.add(row["service_id"])
                elif row["exception_type"].strip() == "2": actifs.discard(row["service_id"])
    return actifs


def calendrier(z):
    """Charge calendrier en mémoire : (calendar rows, exceptions) pour évaluer plusieurs jours."""
    cal = []; r = lire(z, "calendar.txt")
    if r:
        for row in r: cal.append((row["service_id"], [row.get(k, "").strip() == "1" for k in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")], row["start_date"].strip(), row["end_date"].strip()))
    exc = collections.defaultdict(list); r = lire(z, "calendar_dates.txt")
    if r:
        for row in r: exc[row["date"].strip()].append((row["service_id"], row["exception_type"].strip()))
    return cal, exc


def actifs_le(cal, exc, jour):
    ds = jour.strftime("%Y%m%d"); a = {s for s, w, d1, d2 in cal if w[jour.weekday()] and d1 <= ds <= d2}
    for s, t in exc.get(ds, []):
        if t == "1": a.add(s)
        elif t == "2": a.discard(s)
    return a


def choisit_jour(z, courses_par_service):
    """Mardi de référence : 2026-11-10 ou le mardi le plus proche à service normal."""
    cal, exc = calendrier(z); cand = []
    for k in range(0, 60):
        for s in ((0,) if k == 0 else (-1, 1)):
            j = JOUR + datetime.timedelta(weeks=k * s)
            cand.append((k, j, sum(courses_par_service.get(x, 0) for x in actifs_le(cal, exc, j))))
    # on ne regarde que ±8 semaines pour estimer le « normal »
    maxi = max(c[2] for c in cand if c[0] <= 8)
    if maxi == 0: maxi = max(c[2] for c in cand)
    for k, j, n in sorted(cand, key=lambda c: (c[0], c[1])):
        if n and n >= 0.7 * maxi: return j, actifs_le(cal, exc, j)
    return JOUR, set()


def metres(lat0):
    return 110574.0, 111320.0 * math.cos(math.radians(lat0))


def dp(pts, tol):
    """Douglas-Peucker itératif sur des points (x, y) en mètres ; renvoie les indices gardés."""
    n = len(pts)
    if n < 3: return list(range(n))
    garde = [False] * n; garde[0] = garde[-1] = True; pile = [(0, n - 1)]
    while pile:
        a, b = pile.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
        dm, im = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if L == 0: d = math.hypot(px - ax, py - ay)
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L)); d = math.hypot(px - ax - t * dx, py - ay - t * dy)
            if d > dm: dm, im = d, i
        if dm > tol: garde[im] = True; pile.append((a, im)); pile.append((im, b))
    return [i for i in range(n) if garde[i]]


def encode(pts):
    """Polyligne Google précision 5 (latitude d'abord) ; pts = [(lat, lon)]."""
    out = []; pl = po = 0
    for la, lo in pts:
        a, o = round(la * 1e5), round(lo * 1e5)
        for v in (a - pl, o - po):
            v = ~(v << 1) if v < 0 else v << 1
            while v >= 0x20: out.append(chr((0x20 | (v & 0x1f)) + 63)); v >>= 5
            out.append(chr(v + 63))
        pl, po = a, o
    return "".join(out)


def densifie(xy, pas=20.0):
    out = []
    for i in range(len(xy) - 1):
        (ax, ay), (bx, by) = xy[i], xy[i + 1]; n = max(1, int(math.hypot(bx - ax, by - ay) / pas))
        for k in range(n): out.append((ax + (bx - ax) * k / n, ay + (by - ay) * k / n))
    if xy: out.append(xy[-1])
    return out


def couleur(c, t):
    c = (c or "").strip().lstrip("#")
    if re.fullmatch(r"[0-9a-fA-F]{6}", c) and not all(int(c[i:i + 2], 16) > 0xE8 for i in (0, 2, 4)): return "#" + c.upper()
    return "#6250d6" if t in (0, 1) else "#5b6472"


def calcule(cle):
    reseau, _, lat0, lon0 = VILLES[cle]; zp = telecharge(cle); z = zipfile.ZipFile(zp); info = {"cle": cle, "reseau": reseau}
    # routes
    agences = None
    if cle in AGENCE:
        agences = {r["agency_id"] for r in (lire(z, "agency.txt") or []) if re.search(AGENCE[cle], r.get("agency_name", ""), re.I)}
        info["agences"] = sorted(r for r in agences)
    routes = {}
    for r in lire(z, "routes.txt"):
        t = type_route(r.get("route_type"))
        if t is None: continue
        if agences is not None and r.get("agency_id", "") not in agences: continue
        routes[r["route_id"]] = {"n": (r.get("route_short_name") or "").strip() or (r.get("route_long_name") or "").strip(), "nm": (r.get("route_long_name") or "").strip(), "c": r.get("route_color"), "t": t}
    # courses
    trips = []; cps = collections.Counter()
    for r in lire(z, "trips.txt"):
        if r["route_id"] in routes: trips.append((r["trip_id"], r["route_id"], r["service_id"], r.get("direction_id", "").strip(), (r.get("shape_id") or "").strip())); cps[r["service_id"]] += 1
    jour, actifs = choisit_jour(z, cps); info["jour"] = jour.isoformat()
    trips = [t for t in trips if t[2] in actifs]
    nb = collections.Counter(t[1] for t in trips)
    gardees = {rid for rid, n in nb.items() if n >= MIN_COURSES}
    trips = [t for t in trips if t[1] in gardees]
    # tracés nécessaires
    shapes_besoin = {t[4] for t in trips if t[4]}; shapes = collections.defaultdict(list)
    r = lire(z, "shapes.txt")
    if r:
        for row in r:
            s = row["shape_id"]
            if s in shapes_besoin: shapes[s].append((int(float(row["shape_pt_sequence"])), float(row["shape_pt_lat"]), float(row["shape_pt_lon"])))
    sans = {t[0] for t in trips if not t[4] or t[4] not in shapes}
    patt = {}
    if sans:
        seq = collections.defaultdict(list)
        for row in lire(z, "stop_times.txt"):
            if row["trip_id"] in sans: seq[row["trip_id"]].append((int(row["stop_sequence"]), row["stop_id"]))
        for k, v in seq.items(): v.sort(); patt[k] = tuple(s for _, s in v)
        arrets = {}
        for row in lire(z, "stops.txt"):
            try: arrets[row["stop_id"]] = (float(row["stop_lat"]), float(row["stop_lon"]))
            except (ValueError, KeyError): pass
    info["sans_shape"] = len(sans)
    # candidats par ligne
    cand = collections.defaultdict(collections.Counter)
    for tid, rid, sid, d, sh in trips:
        if tid in sans:
            if tid in patt: cand[(rid, d)][("p", patt[tid])] += 1
        else: cand[(rid, d)][("s", sh)] += 1
    parligne = collections.defaultdict(list)
    for (rid, d), cn in cand.items():
        top = cn.most_common(1)[0][1]
        for k, n in cn.items():
            if n >= SEUIL_BRANCHE * top: parligne[rid].append((n, d, k))
    ky, kx = metres(lat0); lignes = []; pts_tot = 0
    for rid, lst in parligne.items():
        lst.sort(key=lambda x: (-x[0], x[1], str(x[2])))
        gardes = []; grille = set(); polys = []
        for n, d, (typ, v) in lst:
            if typ == "s": ll = [(a, b) for _, a, b in sorted(shapes[v])]
            else: ll = [arrets[s] for s in v if s in arrets]
            if len(ll) < 2: continue
            xy = [((b - lon0) * kx, (a - lat0) * ky) for a, b in ll]; dens = densifie(xy, 20.0)
            if grille:
                proche = 0
                for x, y in dens:
                    cx, cy = int(x // DIST_DOUBLON), int(y // DIST_DOUBLON)
                    if any((cx + i, cy + j) in grille and _pres(grille, x, y, cx + i, cy + j) for i in (-1, 0, 1) for j in (-1, 0, 1)): proche += 1
                if proche >= SEUIL_DOUBLON * len(dens): continue
            for x, y in dens: grille_add(grille, x, y)
            idx = dp(xy, TOL); polys.append(encode([ll[i] for i in idx])); gardes.append(ll)
        if not polys: continue
        if not any(abs(a - lat0) <= DLAT and abs(b - lon0) <= DLON for ll in gardes for a, b in ll): continue
        ro = routes[rid]
        lignes.append({"n": ro["n"], "nm": ro["nm"], "c": couleur(ro["c"], ro["t"]), "t": ro["t"], "f": nb[rid], "g": polys})
    lignes.sort(key=lambda l: (l["t"] not in (0, 1), -l["f"], l["n"]))
    info["nl"] = len(lignes); info["ntram"] = sum(1 for l in lignes if l["t"] in (0, 1))
    return {"reseau": reseau, "jour": info["jour"], "l": lignes}, info


_G = {}
def grille_add(grille, x, y):
    cx, cy = int(x // DIST_DOUBLON), int(y // DIST_DOUBLON); grille.add((cx, cy)); _G.setdefault((id(grille), cx, cy), []).append((x, y))
def _pres(grille, x, y, cx, cy):
    return any(math.hypot(x - a, y - b) <= DIST_DOUBLON for a, b in _G.get((id(grille), cx, cy), ()))


def main():
    cles = sys.argv[1:] or list(VILLES)
    for c in cles:
        if c not in VILLES: sys.exit("ville inconnue : " + c)
    actuel = {"date": JOUR.isoformat(), "villes": {}}
    if os.path.exists(SORTIE):
        try: actuel = json.loads(open(SORTIE, encoding="utf-8").read().strip()[len("const LIGNES="):].rstrip(";"))
        except Exception: pass
    for c in cles:
        try:
            v, info = calcule(c)
        except Exception as e:
            print(c, "ÉCHEC :", repr(e)); continue
        actuel["villes"][c] = v; ko = len(json.dumps(v, separators=(",", ":"), ensure_ascii=False).encode()) / 1024
        print("%-10s %-12s jour %s  %3d lignes (%d tram/métro, %d bus)  %5.1f Ko  sans tracé: %d%s" % (c, info["reseau"], info["jour"], info["nl"], info["ntram"], info["nl"] - info["ntram"], ko, info["sans_shape"], "  agences " + str(info["agences"]) if "agences" in info else ""))
    actuel["villes"] = {k: actuel["villes"][k] for k in VILLES if k in actuel["villes"]}
    txt = "const LIGNES=" + json.dumps(actuel, separators=(",", ":"), ensure_ascii=False) + ";"
    open(SORTIE, "w", encoding="utf-8").write(txt)
    print("data/lignes.js : %.1f Ko" % (len(txt.encode()) / 1024))


if __name__ == "__main__": main()
