#!/usr/bin/env python3
"""Assemble la page à partir de src/ et data/.
Sorties :
  dist/index.html     page autonome (GitHub Pages)
  dist/artifact.html  même page sans squelette (artifact Claude)
  dist/test.html      copie locale pour les tests Playwright
  index.html          copie de dist/index.html servie par GitHub Pages
"""
import os, glob, sys
R = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(R, p), encoding="utf-8").read()
js = sorted(glob.glob(os.path.join(R, "src/js/*.js")))
names = [os.path.basename(p) for p in js]
before = [p for p, n in zip(js, names) if n < "02"]   # villes, calcul, fiche
after = [p for p, n in zip(js, names) if n >= "02"]   # carte et la suite
jd = lambda n, f: "const %s=%s;" % (n, rd(f) if os.path.exists(os.path.join(R, f)) else "{}")
import json
# fiches des annonces (tools/fiches.py) : FICX = champs utiles au calcul pour les annonces du relevé ; FICHES = fiches complètes
FICH = {os.path.basename(p)[:-5]: json.load(open(p, encoding="utf-8")) for p in sorted(glob.glob(os.path.join(R, "data/fiches/*.json")))}
_ads = rd("data/annoncesdata.js"); _ads = json.loads(_ads[_ads.index("{"):_ads.rindex("}") + 1])
_ids = set()
for _v in _ads.values():
    if isinstance(_v, dict):
        for _b in [_v] + list((_v.get("t") or {}).values()):
            _ids |= {str(a[3]).split("/")[-1] for a in _b.get("ventes", [])} | {str(a[4]).split("/")[-1] for a in _b.get("ads", [])}
FICX = {i: {k: f[k] for k in ("la", "lo", "r", "dpe", "cop", "coloc", "proc") if k in f} for c in FICH.values() for i, f in c.items() if i in _ids}
FICX = {i: v for i, v in FICX.items() if v}
FICHES_JS = json.dumps(FICH, ensure_ascii=False, separators=(",", ":"))
code = "\n".join([
    rd("data/mapdata.js"),
    jd("DVFALL", "data/dvf.json"), jd("TTQ", "data/temps-trajets.json"), jd("RISQ", "data/risques-quartiers.json"), jd("TCQ", "data/transports.json"), jd("LOYQ", "data/loyers-etat.json"), jd("POIQ", "data/commerces.json"), jd("TERQ", "data/territoire.json"), jd("HABQ", "data/habitants.json"), jd("REPQ", "data/reperes.json"),
    "const CITYMAP=" + rd("data/citymaps.json") + ";",
    *[open(p, encoding="utf-8").read() for p in before],
    rd("data/irisdata.js"),
    rd("data/annoncesdata.js").replace("const ADS=", "const ADSRAW=", 1),
    "const FICX=" + json.dumps(FICX, ensure_ascii=False, separators=(",", ":")) + ";\nconst FICHES=/*FICHES*/null;",
    rd("src/ads-vue.js"),
    rd("data/historique.js") if os.path.exists(os.path.join(R, "data/historique.js")) else "const HIST={};",
    *[open(p, encoding="utf-8").read() for p in after],
])
page = rd("src/head.html") + "<style>\n" + rd("src/styles.css") + "</style>\n" + rd("src/body.html") + "<script>\n" + code + "</script>\n"
os.makedirs(os.path.join(R, "dist"), exist_ok=True)
w = lambda p, s: open(os.path.join(R, p), "w", encoding="utf-8").write(s)
# artefact et page de test : fiches complètes dans la page ; GitHub Pages : chargées à la demande (data/fiches/<ville>.json)
inl = page.replace("const FICHES=/*FICHES*/null;", "const FICHES=" + FICHES_JS + ";", 1)
assert inl != page, "marqueur FICHES introuvable"
w("dist/artifact.html", inl)
w("dist/test.html", '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + inl)
head = ('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
        + (rd("src/pwa-head.html") if os.path.exists(os.path.join(R, "src/pwa-head.html")) else "")
        + '</head><body>')
full = head + page + "</body></html>"
w("dist/index.html", full)
w("index.html", full)
print("ok", len(page), "octets ;", len(FICX), "annonces avec fiche ;", len(inl) - len(page), "octets de fiches dans l'artefact")
