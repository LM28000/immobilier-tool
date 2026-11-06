#!/usr/bin/env python3
"""Ajoute (ou remplace) des villes dans data/irisdata.js à partir de la sortie de tools/collecte/iris.js.
Une ville sans prix RealAdvisor par quartier prend le prix de ses ventes (règle dans src/js/02-carte.js).
Usage : python3 tools/iris_fusion.py sortie.json"""
import json, sys, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(R, "data/irisdata.js"); s = open(p, encoding="utf-8").read()
I = json.loads(s[len("const IRIS="):s.rstrip().rindex(";")])
for k, v in json.load(open(sys.argv[1], encoding="utf-8")).items():
    old = I.get(k, {})
    I[k] = {"txt": v["txt"], "dpe": v["dpe"], "ra": old.get("ra", {"city": 0, "q": {}, "fit": [0, 0.229]}), "q": old.get("q", {})}
open(p, "w", encoding="utf-8").write("const IRIS=" + json.dumps(I, ensure_ascii=False, separators=(",", ":")) + ";")
print("ok", sorted(I))
