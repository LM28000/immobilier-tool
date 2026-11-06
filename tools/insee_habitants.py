#!/usr/bin/env python3
"""Habitants par quartier IRIS (Insee), même règle pour toutes les villes qui ont des quartiers.
Entrées (data/insee/, téléchargées à la main sur insee.fr, non versionnées) :
  base-ic-evol-struct-pop-AAAA_csv.zip      population, 18-24 ans, 25-39 ans
  base-ic-diplomes-formation-AAAA_csv.zip   18-24 ans encore en études
  BASE_TD_FILO_IRIS_AAAA_DISP_CSV.zip       revenu médian et taux de pauvreté
  base_ic_logement_AAAA_xlsx.zip            logements, vacants, locataires, HLM, 1 pièce, moins de 30 m², emménagés depuis moins de 2 ans
Sortie : data/habitants.json  {q:{ville:{iris:[pop, p1824, scol1824, p2539, revenu médian, taux de pauvreté,
                                               logements, vacants, rés. principales, locataires, HLM, 1 pièce, moins de 30 m², ménages, emménagés < 2 ans]}}, city:{…}}
Lit aussi un zip tronqué tant que le début du fichier couvre les villes voulues."""
import json, glob, struct, zlib, zipfile, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMS = json.load(open(os.path.join(R, "tools/villes.json")))          # ville -> code commune
INV = {v: k for k, v in COMS.items()}
def first_member(path):
    try:
        z = zipfile.ZipFile(path); n = [x for x in z.namelist() if not x.lower().startswith("meta")][0]; return z.read(n).decode("latin1")
    except zipfile.BadZipFile:                                          # zip incomplet : on décompresse ce qui est là
        b = open(path, "rb").read(); n, e = struct.unpack("<HH", b[26:30]); return zlib.decompressobj(-15).decompress(b[30 + n + e:]).decode("latin1")
def rows(text):
    L = text.split("\n"); h = L[0].strip().split(";")
    for l in L[1:]:
        v = l.strip().split(";")
        if len(v) == len(h): yield dict(zip(h, v))
num = lambda x: float(x.replace(",", ".")) if x not in (None, "", "ns", "nd", "s") else None
out = {}
def put(r, **kv):
    c = r["IRIS"][:5]
    if c in INV: out.setdefault(INV[c], {}).setdefault(r["IRIS"][5:], {}).update(kv)
for r in rows(first_member(glob.glob(os.path.join(R, "data/insee/base-ic-evol-struct-pop-*_csv.zip"))[0])):
    y = [k for k in r if k.endswith("_POP")][0][:3]
    put(r, pop=round(num(r[y + "_POP"]) or 0), p1824=round(num(r[y + "_POP1824"]) or 0), p2539=round(num(r[y + "_POP2539"]) or 0))
for r in rows(first_member(glob.glob(os.path.join(R, "data/insee/base-ic-diplomes-formation-*_csv.zip"))[0])):
    y = [k for k in r if k.endswith("_SCOL1824")][0][:3]; put(r, scol1824=round(num(r[y + "_SCOL1824"]) or 0))
for r in rows(first_member(glob.glob(os.path.join(R, "data/insee/BASE_TD_FILO_IRIS_*_DISP_CSV.zip"))[0])):
    med = [k for k in r if k.startswith("DISP_MED")][0]; tp = [k for k in r if k.startswith("DISP_TP60")][0]; put(r, med=num(r[med]), tp=num(r[tp]))
LG = glob.glob(os.path.join(R, "data/insee/base_ic_logement_*_xlsx.zip"))
if LG:
    import openpyxl, io
    z = zipfile.ZipFile(LG[0]); ws = openpyxl.load_workbook(io.BytesIO(z.read(z.namelist()[0])), read_only=True)
    sh = [s for s in ws.sheetnames if s.startswith("IRIS")][0]; it = ws[sh].iter_rows(values_only=True); h = list(next(it))
    col = lambda lab: h.index(lab)
    C2 = {"log": col("Logements (princ)"), "vac": col("Logements vacants (princ)"), "rp": col("Résid principales (princ)"), "loc": col("Résid princ occupées Locataires (princ)"),
          "hlm": col("Résid princ HLM louée vide (princ)"), "p1": col("Résid princ 1 pièce (princ)"), "s30": col("Rés princ de moins de 30 m2 (princ)"),
          "men": col("Ménages (princ)"), "em2": col("Ménages emménagés moins 2 ans (princ)")}
    for r in it:
        code = str(r[0] or "")
        if code[:5] in INV: out.setdefault(INV[code[:5]], {}).setdefault(code[5:], {}).update({k: round(float(r[i] or 0)) for k, i in C2.items()})
LK = ["log", "vac", "rp", "loc", "hlm", "p1", "s30", "men", "em2"]
q, city = {}, {}
for ck, v in out.items():
    q[ck] = {k: [d.get("pop", 0), d.get("p1824", 0), d.get("scol1824", 0), d.get("p2539", 0), d.get("med"), d.get("tp")] + [d.get(x, 0) for x in LK] for k, d in v.items()}
    P = sum(x[0] for x in q[ck].values()) or 1; W = [x for x in q[ck].values() if x[4]]; W2 = [x for x in q[ck].values() if x[5] is not None]
    city[ck] = [P, round(sum(x[1] for x in q[ck].values()) / P * 100, 1), round(sum(x[2] for x in q[ck].values()) / P * 100, 1), round(sum(x[3] for x in q[ck].values()) / P * 100, 1),
                round(sum(x[0] * x[4] for x in W) / sum(x[0] for x in W)) if W else None, round(sum(x[0] * x[5] for x in W2) / sum(x[0] for x in W2), 1) if W2 else None] + [sum(x[6 + i] for x in q[ck].values()) for i in range(len(LK))]
json.dump({"date": __import__("datetime").date.today().isoformat(), "q": q, "city": city}, open(os.path.join(R, "data/habitants.json"), "w"), separators=(",", ":"))
print({k: len(v) for k, v in q.items()})
