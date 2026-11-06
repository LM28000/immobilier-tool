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
code = "\n".join([
    rd("data/mapdata.js"),
    jd("DVFALL", "data/dvf.json"), jd("TTQ", "data/temps-trajets.json"), jd("RISQ", "data/risques-quartiers.json"), jd("TCQ", "data/transports.json"), jd("LOYQ", "data/loyers-etat.json"), jd("POIQ", "data/commerces.json"), jd("TERQ", "data/territoire.json"), jd("HABQ", "data/habitants.json"),
    "const CITYMAP=" + rd("data/citymaps.json") + ";",
    *[open(p, encoding="utf-8").read() for p in before],
    rd("data/irisdata.js"),
    rd("data/annoncesdata.js"),
    rd("data/historique.js") if os.path.exists(os.path.join(R, "data/historique.js")) else "const HIST={};",
    *[open(p, encoding="utf-8").read() for p in after],
])
page = rd("src/head.html") + "<style>\n" + rd("src/styles.css") + "</style>\n" + rd("src/body.html") + "<script>\n" + code + "</script>\n"
os.makedirs(os.path.join(R, "dist"), exist_ok=True)
w = lambda p, s: open(os.path.join(R, p), "w", encoding="utf-8").write(s)
w("dist/artifact.html", page)
w("dist/test.html", '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + page)
head = ('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
        + (rd("src/pwa-head.html") if os.path.exists(os.path.join(R, "src/pwa-head.html")) else "")
        + '</head><body>')
full = head + page + "</body></html>"
w("dist/index.html", full)
w("index.html", full)
print("ok", len(page), "octets")
