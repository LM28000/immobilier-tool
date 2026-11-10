# Scripts archivés

Premiers scripts du projet, gardés pour mémoire. Ils ne servent plus : ne pas les lancer.

| Script | Rôle d'origine | Remplacé par |
|---|---|---|
| `annonces.py` | médianes de loyers à partir d'annonces copiées à la main (Le Mans, Saint-Nazaire) | `tools/maj_annonces.py` (relevé quotidien) |
| `rdt.py` | première simulation de rendement (numpy) | `src/js/00b-financement-impots.js`, testé par `tests/unit.js` |
| `mkiris.py` | premier `irisdata.js` pour 2 villes ; **réécrit le fichier dans le dossier courant** | `tools/collecte/iris.js` puis `tools/iris_fusion.py` |
| `mkcity.py` | fonds de carte détaillés de 2 villes (`citymaps.json`, shapely) | la carte MapLibre ; `data/citymaps.json` a été retiré le 10 novembre 2026 (plus rien ne le lisait) |
| `mkmap.py` | fond de carte des départements (`mapdata.js`, shapely) | la carte MapLibre ; `data/mapdata.js` ne garde que l'échelle `S` de la projection des contours IRIS (les départements ont été retirés le 10 novembre 2026) |
