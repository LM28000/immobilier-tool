# Scripts archivés

Premiers scripts du projet, gardés pour mémoire. Ils ne servent plus : ne pas les lancer.

| Script | Rôle d'origine | Remplacé par |
|---|---|---|
| `annonces.py` | médianes de loyers à partir d'annonces copiées à la main (Le Mans, Saint-Nazaire) | `tools/maj_annonces.py` (relevé quotidien) |
| `rdt.py` | première simulation de rendement (numpy) | `src/js/00b-financement-impots.js`, testé par `tests/unit.js` |
| `mkiris.py` | premier `irisdata.js` pour 2 villes ; **réécrit le fichier dans le dossier courant** | `tools/collecte/iris.js` puis `tools/iris_fusion.py` |
| `mkcity.py` | fonds de carte détaillés de 2 villes (`citymaps.json`, shapely) | la vraie carte (Leaflet) ; `data/citymaps.json` reste lu par la carte dessinée |
| `mkmap.py` | fond de carte des départements (`mapdata.js`, shapely) | inchangé depuis : relancer seulement pour changer l'emprise de la carte |
