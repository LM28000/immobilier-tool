#!/usr/bin/env python3
"""Résidences étudiantes et logements neufs autorisés autour de nos biens (concurrence pour les studios), ville par ville.

Usage : python3 tools/concurrence.py   (CONC_CACHE=<dossier> : garde les téléchargements pour un nouvel essai)
  Télécharge, dans le dossier temporaire du système (effacé ensuite), et n'écrit que data/conc/<ville>.js :
  - résidences du Crous : « Ensemble des logements proposés aux étudiants par le réseau des Crous » (ministère de l'Enseignement supérieur,
    Licence Ouverte) ; nombre de logements lu dans le texte de présentation (« comportant 618 studios… ») quand il y est ;
  - permis de construire et déclarations créant des logements (base Sitadel, SDES, Licence Ouverte), filtrés par commune ;
    placés au centre de leurs parcelles (cadastre Etalab, Licence Ouverte), sinon à leur adresse (Base Adresse Nationale, Licence Ouverte :
    parcelles renumérotées depuis le permis) ;
  - résidences étudiantes d'OpenStreetMap (building=dormitory, amenity=dormitory, residential=student ; ODbL), pour les résidences privées
    plus anciennes que la base Sitadel (2013).
Règles :
  - résidences : Crous à moins de 10 km du centre de la ville ; résidences étudiantes des permis (type « étudiants », 10 logements au moins) ;
    OpenStreetMap : éléments à moins de 120 m regroupés en un site, sauf ceux à moins de 150 m d'une résidence du Crous ou d'un permis
    (le site donne alors son nom à la résidence d'un permis terminée la plus proche, jamais à un projet pas encore construit) ;
  - permis : autorisés depuis 2016, pas annulés, 5 logements collectifs au moins (ou 5 logements en résidence) ; état : autorisé, commencé, terminé.
Sortie : (window.CONCQ=window.CONCQ||{})["<ville>"] = {"maj", "src", "res": [[lon, lat, nom, logements, source, état, année], …],
  "pc": [[lon, lat, autorisé "AAAA-MM", état, commencé, terminé, logements, studios, T2, en résidence, type de résidence, logements sociaux, demandeur, adresse], …]}
  - source : "crous", "pc" (permis), "osm" ; état : 2 autorisé, 5 commencé, 6 terminé, 0 en service (Crous, OpenStreetMap) ;
  - type de résidence (Sitadel) : 1 personnes âgées, 2 étudiants, 3 tourisme, 4 hôtelière à vocation sociale, 5 sociale, 6 handicapés, 7 autre, 8 plusieurs.
"""
import csv, gzip, io, json, math, os, re, sys, tempfile, time, urllib.parse, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CROUS = "https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr_crous_logement_france_entiere/exports/json"
SITADEL = "https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/8b35affb-55fc-4c1f-915b-7750f974446a/csv?withColumnName=true&COMM=eq:%s"
CADASTRE = "https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/%s/%s/cadastre-%s-parcelles.json.gz"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
UA = {"User-Agent": "immobilier-tool (outil personnel de comparaison de villes)"}
SRC = {"crous": "Crous (ministère de l'Enseignement supérieur), Licence Ouverte", "pc": "Sitadel (SDES), permis créant des logements, Licence Ouverte ; parcelles : cadastre Etalab",
       "osm": "OpenStreetMap et ses contributeurs, ODbL"}
NUM = re.compile(r"(\d[\d\s.]{0,6})\s*(?:logements?|chambres?|studios?|lits|appartements?|places|studettes?|T1(?:\s?bis)?\b)", re.I)
GENERIQUE = re.compile(r"^(?:b[âa]timent|bat\.?|bloc|immeuble|r[ée]sidence(?: universitaire| [ée]tudiante| crous)?|foyer(?: des [ée]tudiants)?|crous)\b\s*[\w-]{0,3}$", re.I)


CACHE = os.environ.get("CONC_CACHE")   # dossier où garder les téléchargements d'un essai à l'autre (facultatif, hors du dépôt)


def get(url, data=None, tries=3, timeout=180):
    if CACHE:
        import hashlib
        k = os.path.join(CACHE, hashlib.md5(url.encode() + (data or b"")).hexdigest())
        if os.path.exists(k): return open(k, "rb").read()
        b = get_net(url, data, tries, timeout); os.makedirs(CACHE, exist_ok=True); open(k, "wb").write(b); return b
    return get_net(url, data, tries, timeout)


def get_net(url, data=None, tries=3, timeout=180):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r: return r.read()
        except Exception:
            if i == tries - 1: raise
            time.sleep(5 * (i + 1))


def km(a, b, c, d):
    return 6371 * 2 * math.asin(math.sqrt(math.sin(math.radians(c - a) / 2) ** 2 + math.cos(math.radians(a)) * math.cos(math.radians(c)) * math.sin(math.radians(d - b) / 2) ** 2))


def villes():
    """code commune (tools/villes.json) et centre de chaque ville (src/js/00-villes-calcul.js)"""
    V = json.load(open(os.path.join(R, "tools", "villes.json"), encoding="utf-8"))
    s = open(os.path.join(R, "src", "js", "00-villes-calcul.js"), encoding="utf-8").read()
    pos = {m.group(1): (float(m.group(2)), float(m.group(3))) for m in re.finditer(r'\{k:"(\w+)",name:"[^"]+",lat:([\d.\-]+),lon:([\d.\-]+)', s)}
    return {k: {"insee": v, "lat": pos[k][0], "lon": pos[k][1]} for k, v in V.items() if k in pos}


def accents(s):
    """textes de Sitadel encodés deux fois, accents perdus (« RAÃ\\x82Â\\x89PUBLIQUE » → « RÉPUBLIQUE »)"""
    s = s or ""
    for _ in range(3):
        if not re.search("[ÃÂ]", s): break
        try: s = s.encode("latin-1").decode("utf-8")
        except UnicodeError: break
    return re.sub(r"A([\x80-\xbf])", lambda m: chr(0xC0 + ord(m.group(1)) - 0x80), s)


def joli(s):
    """« 16D - 16E RUE DU JOUANET » → « 16D - 16E rue du Jouanet »"""
    s = re.sub(r"\s+", " ", accents(s)).strip()
    if s != s.upper(): return s
    PETITS = {"de", "du", "des", "la", "le", "les", "et", "d", "l", "à", "au", "aux", "en", "sur", "sous"}
    TYPES = {"rue", "avenue", "boulevard", "place", "allée", "allee", "impasse", "chemin", "route", "square", "cours", "quai", "passage", "rond-point", "mail", "esplanade", "promenade", "faubourg", "résidence", "lieu-dit"}
    SIGLES = {"sccv", "snc", "sas", "sasu", "sci", "sa", "sarl", "sem", "spl", "oph", "crous", "eurl", "scic", "sa.", "hlm", "ehpad"}
    AB = {"bd": "boulevard", "boul": "boulevard", "boule": "boulevard", "bld": "boulevard", "av": "avenue", "ave": "avenue", "r": "rue", "pl": "place", "all": "allée", "imp": "impasse", "che": "chemin", "chem": "chemin",
          "rte": "route", "sq": "square", "fg": "faubourg", "qu": "quai", "pass": "passage", "res": "résidence"}
    W = s.lower().split(" ")
    SURS = {"bd", "boul", "boule", "bld", "ave", "imp", "rte", "fg"}   # abréviations sans ambiguïté : partout ; les autres juste après le numéro (« 12 B », « 19 -2 », « 85 & »)
    W = [AB.get(w, w) if (w in SURS or i == 0 or re.match(r"^[\d&\-–/]", W[i - 1]) or re.match(r"^(?:et|bis|ter|[a-z])$", W[i - 1])) else w for i, w in enumerate(W)]
    out = []
    for i, w in enumerate(W):
        out.append(w.upper() if w in SIGLES or re.match(r"^\d", w) else w if (w in PETITS or w in TYPES) and i else "-".join(x[:1].upper() + x[1:] for x in w.split("-")))
    return " ".join(out)


def capacite(t):
    ns = [int(re.sub(r"\D", "", m.group(1))) for m in NUM.finditer(t or "")]
    ns = [n for n in ns if 5 <= n <= 3000]
    return max(ns) if ns else None


def centre(geom):
    """centre (moyenne pondérée par l'aire) de l'anneau extérieur du plus grand polygone"""
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    best = None
    for P in polys:
        ring = P[0]; a = cx = cy = 0
        for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
            f = x0 * y1 - x1 * y0; a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f
        if a and (best is None or abs(a) > best[0]): best = (abs(a), cx / (3 * a), cy / (3 * a))
    if best: return best[1], best[2]
    ring = polys[0][0]; return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)


def parcelles(insee):
    """(section sans zéro de tête, numéro) → [(préfixe, lon, lat)]"""
    raw = gzip.decompress(get(CADASTRE % (insee[:2], insee, insee), timeout=300))
    out = {}
    for f in json.loads(raw)["features"]:
        p = f["properties"]
        try: k = (str(p["section"]).lstrip("0").upper(), int(p["numero"]))
        except (KeyError, ValueError): continue
        x, y = centre(f["geometry"]); out.setdefault(k, []).append((p.get("prefixe") or "000", x, y))
    return out


def geocode(rows, insee):
    """adresses → (lon, lat) par la Base Adresse Nationale (envoi groupé) : numéro trouvé (score 0,5 et plus) ou rue sûre (0,75 et plus)"""
    if not rows: return {}
    buf = io.StringIO(); w = csv.writer(buf); w.writerow(["i", "adresse", "citycode"])
    for i, a in rows: w.writerow([i, a, insee])
    b = "----conc%d" % int(time.time()); body = ("--%s\r\nContent-Disposition: form-data; name=\"data\"; filename=\"a.csv\"\r\nContent-Type: text/csv\r\n\r\n%s\r\n" % (b, buf.getvalue())
        + "".join("--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n" % (b, k, v) for k, v in (("columns", "adresse"), ("citycode", "citycode"))) + "--%s--\r\n" % b).encode("utf-8")
    try:
        req = urllib.request.Request("https://api-adresse.data.gouv.fr/search/csv/", data=body, headers=dict(UA, **{"Content-Type": "multipart/form-data; boundary=" + b}))
        with urllib.request.urlopen(req, timeout=300) as r: out = r.read().decode("utf-8")
    except Exception as e:
        print("adresses non géocodées pour", insee, e, file=sys.stderr); return {}
    res = {}
    for r in csv.DictReader(io.StringIO(out)):
        try: sc, ty = float(r.get("result_score") or 0), r.get("result_type")
        except ValueError: continue
        if r.get("result_citycode") == insee and ((ty == "housenumber" and sc >= 0.5) or (ty == "street" and sc >= 0.75)):
            res[r["i"]] = (float(r["longitude"]), float(r["latitude"]))
    return res


def permis(insee, P):
    """permis gardés, placés au centre de leurs parcelles, sinon à leur adresse ; résidences étudiantes qui en sortent"""
    raw = get(SITADEL % insee, timeout=300).decode("utf-8", "replace")
    rows, sans = [], []
    for r in csv.DictReader(io.StringIO(raw), delimiter=";"):
        if r.get("ETAT_DAU") == "4" or (r.get("DATE_REELLE_AUTORISATION") or "")[:4] < "2016": continue
        n = lambda k: int(r.get(k) or 0) if (r.get(k) or "0").lstrip("-").isdigit() else 0
        col, nres = n("NB_LGT_COL_CREES"), n("NB_LGT_RES")
        if col < 5 and nres < 5: continue
        pts = []
        for i in range(1, 26):
            s, m = (r.get("SEC_CADASTRE%d" % i) or "").strip().lstrip("0").upper(), (r.get("NUM_CADASTRE%d" % i) or "").strip()
            if s and m.isdigit(): pts += P.get((s, int(m)), [])
        typ = int(r.get("RESIDENCE") or 9) if (r.get("RESIDENCE") or "9").isdigit() else 9
        adr = joli(" ".join(x for x in ((r.get("ADR_NUM_TER") or "").strip(), (r.get("ADR_LIBVOIE_TER") or "").strip()) if x) or (r.get("ADR_LIEUDIT_TER") or ""))
        x = [None, None, r["DATE_REELLE_AUTORISATION"][:7], int(r.get("ETAT_DAU") or 2), (r.get("DATE_REELLE_DOC") or "")[:7], (r.get("DATE_REELLE_DAACT") or "")[:7],
             n("NB_LGT_TOT_CREES"), n("NB_LGT_1P"), n("NB_LGT_2P"), nres, typ if typ != 9 else 0, n("NB_LGT_PRET_LOC_SOCIAL"), joli(r.get("DENOM_DEM") or "")[:60], adr[:70],
             typ == 2 or (typ == 8 and r.get("RES_ETUDIANTS") == "true")]
        if pts:
            pre = max(set(q[0] for q in pts), key=lambda q: sum(z[0] == q for z in pts))   # commune déléguée : le préfixe le plus cité
            pts = [q for q in pts if q[0] == pre]; x[0], x[1] = sum(q[1] for q in pts) / len(pts), sum(q[2] for q in pts) / len(pts)
        elif adr and re.search(r"[a-zA-Z]{3}", adr): sans.append((str(len(rows)), adr))
        rows.append(x)
    G = geocode(sans, insee)   # parcelles renumérotées depuis le permis (division) : l'adresse
    for i, ll in G.items(): rows[int(i)][0], rows[int(i)][1] = ll
    out, res = [], []
    for x in rows:
        if x[0] is None: continue
        x[0], x[1] = round(x[0], 5), round(x[1], 5); etu = x.pop()
        out.append(x)
        if etu and max(x[9], x[6]) >= 10:
            an = (x[5] or x[4] or x[2])[:4]
            res.append([x[0], x[1], "Résidence étudiante" + (", " + x[13] if x[13] else ""), max(x[9], x[6]), "pc", x[3], int(an) if an.isdigit() else None])   # le demandeur (souvent une SCCV) n'est pas un nom de résidence
    out.sort(key=lambda x: (x[2], x[0]))
    print("  %s : %d permis, %d placés par la parcelle, %d par l'adresse, %d sans position" % (insee, len(rows), len(rows) - len(sans), len(G), len(sans) - len(G)), file=sys.stderr)
    return out, res


def osm(v):
    dl, dg = 0.1, 0.15
    bb = "%f,%f,%f,%f" % (v["lat"] - dl, v["lon"] - dg, v["lat"] + dl, v["lon"] + dg)
    q = '[out:json][timeout:90];(nwr["building"="dormitory"](%s);nwr["amenity"="dormitory"](%s);nwr["residential"="student"](%s););out tags center;' % (bb, bb, bb)
    for u in OVERPASS:
        try: return json.loads(get(u, data=urllib.parse.urlencode({"data": q}).encode(), tries=2, timeout=150))["elements"]
        except Exception: continue
    print("OpenStreetMap injoignable pour", v["insee"], file=sys.stderr); return []


def sites_osm(E):
    """éléments à moins de 120 m regroupés ; nom le plus précis du groupe"""
    pts = []
    for e in E:
        c = e.get("center") or ({"lat": e["lat"], "lon": e["lon"]} if "lat" in e else None)
        if c: pts.append((c["lon"], c["lat"], (e.get("tags") or {})))
    groups = []
    for p in pts:
        g = next((g for g in groups if any(km(p[1], p[0], q[1], q[0]) < 0.12 for q in g)), None)
        (g.append(p) if g else groups.append([p]))
    out = []
    for g in groups:
        names = [t.get("name", "").strip() for _, _, t in g if t.get("name")]
        good = [x for x in names if not GENERIQUE.match(x)]
        op = " ".join(t.get("operator", "") for _, _, t in g).lower()
        out.append((sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g), max(good, key=len) if good else "", "crous" in op))
    return out


def main():
    V = villes()
    crous = json.loads(get(CROUS))
    os.makedirs(os.path.join(R, "data", "conc"), exist_ok=True)
    today = time.strftime("%Y-%m-%d"); bilan = {}
    for ck, v in sorted(V.items()):
        P = parcelles(v["insee"])
        pc, res = permis(v["insee"], P)
        for x in crous:
            g = x.get("geocalisation") or {}
            if not g or km(v["lat"], v["lon"], g["lat"], g["lon"]) > 10: continue
            t = " ".join(str(x.get(k) or "") for k in ("infos", "short_desc"))
            res.append([round(g["lon"], 5), round(g["lat"], 5), re.sub(r"\s+", " ", x.get("title") or "Résidence du Crous").strip()[:60], capacite(t), "crous", 0, None])
        # un permis d'étudiants terminé à côté d'une résidence du Crous : c'est elle (gardée une fois)
        cr = [r for r in res if r[4] == "crous"]
        res = [r for r in res if not (r[4] == "pc" and r[5] == 6 and any(km(r[1], r[0], c[1], c[0]) < 0.15 for c in cr))]
        for lon, lat, nom, isc in sites_osm(osm(v)):
            near = sorted((km(lat, lon, r[1], r[0]), i) for i, r in enumerate(res) if km(lat, lon, r[1], r[0]) < 0.15)
            if near:
                r = res[near[0][1]]   # le nom d'OpenStreetMap remplace celui du demandeur pour une résidence construite, la plus proche du site
                if r[4] == "pc" and r[5] == 6 and nom and not isc: r[2] = nom
                continue
            if isc: continue
            res.append([round(lon, 5), round(lat, 5), nom or "Résidence étudiante", None, "osm", 0, None])
        res.sort(key=lambda r: (r[4], r[2]))
        G = {"maj": today, "src": SRC, "res": res}
        with open(os.path.join(R, "data", "conc", ck + ".js"), "w", encoding="utf-8") as f:
            f.write("(window.CONCQ=window.CONCQ||{})[%s]=" % json.dumps(ck) + json.dumps(G, ensure_ascii=False, separators=(",", ":"))[:-1] + ',"pc":[\n')
            f.write(",\n".join(json.dumps(x, ensure_ascii=False, separators=(",", ":")) for x in pc) + "\n]};\n")
        bilan[ck] = {"résidences": len(res), "dont crous": sum(r[4] == "crous" for r in res), "permis": len(pc), "logements": sum(x[6] for x in pc), "studios": sum(x[7] for x in pc)}
        print(ck, bilan[ck], file=sys.stderr); time.sleep(2)
    print(json.dumps(bilan, ensure_ascii=False))


if __name__ == "__main__":
    main()
