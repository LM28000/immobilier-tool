# Données et sources

Tout ce qui est dans `data/` est **public**. Les fichiers sont préparés par les scripts de `tools/`, puis intégrés à la page par `build.py`. Quelques fichiers lourds (`copro/`, `conc/`, `bruit/`, `lignes.js`, `rail.json`) sont chargés seulement quand on en a besoin.

Les annonces, leur historique et leurs fiches complètes ne sont **pas** dans le dépôt : elles sont dans Supabase (voir [annonces-et-groupes.md](annonces-et-groupes.md)).

Les règles de calcul tirées de ces données (médianes, bornes, exposants) sont dans [REGLES.md](../REGLES.md).

## Fichiers et outils

| Fichier de `data/` | Contenu | Produit par |
|---|---|---|
| `irisdata.js`, `mapdata.js` | contours des quartiers IRIS, DPE, prix et loyers des quartiers | `tools/collecte/iris.js`, `tools/iris_fusion.py` |
| `dvf.json` | ventes réelles par ville, quartier et type ; pente prix au m² / surface | `tools/collecte/dvf.js` |
| `prix-tendance.json` | prix des appartements depuis 2014 (hausse des prix selon la ville) | `tools/prix_tendance.py` |
| `loyers-etat.json` | loyers de référence de la carte des loyers de l'État | à la main, par ville |
| `habitants.json` | habitants, revenus, logements vides par quartier | `tools/insee_habitants.py` |
| `reperes.json` | gare, campus, centre, mairies | `tools/collecte/reperes.js` |
| `territoire.json` | écoles, urbanisme, quartiers prioritaires, catastrophes naturelles | `tools/collecte/territoire.js` |
| `temps-trajets.json`, `commerces.json`, `risques-quartiers.json` | trajets à pied et à vélo, commerces, risques par quartier | `tools/collecte/quartiers.js` |
| `transports.json`, `lignes.js` | trajets en bus ; tracés des lignes de bus et tram | `tools/gtfs_lignes.py`, `tools/gtfs_temps.js`, `tools/lignes_osm.py` |
| `rail.json` | grandes lignes de train de la vue dézoomée | `tools/rail_rfn.py` |
| `etudiants.json` | inscrits par rentrée depuis 2015 | `tools/etudiants.py` |
| `copro/<ville>.js` | copropriétés du registre national | `tools/copro_rnic.py` |
| `conc/<ville>.js` | résidences étudiantes et logements neufs autorisés | `tools/concurrence.py` |
| `peb.json` | zones de bruit des aéroports | `tools/bruit_aeroports.py` |
| `bruit-quartiers.json`, `bruit-expo.json`, `bruit/<ville>.js` | grands axes et voies ferrées, part exposée au bruit | `tools/bruit_expo.py` |
| `secteurs-nouvelles-villes.json` | secteurs Bien'ici reliés aux quartiers | `tools/collecte/secteurs.js` |

Les scripts de `tools/collecte/` se lancent dans la page de test (`dist/test.html`), ouverte par Playwright. Les scripts Python se lancent sur le Mac. La marche à suivre complète pour **ajouter une ville** est dans [REGLES.md](../REGLES.md#ajouter-une-ville).

## Licences

Le code est sous licence MIT. Les fichiers de `data/` n'en font pas partie : chacun garde la licence de sa source, à citer en cas de réutilisation.

| Données | Source | Licence |
|---|---|---|
| ventes réelles (`dvf.json`), prix des appartements depuis 2014 (`prix-tendance.json`) | DVF (DGFiP) ; Terralyse d'après DVF | Licence Ouverte 2.0 |
| contours des quartiers IRIS et projection de l'ancienne carte (`irisdata.js`, `mapdata.js`), mairies (`reperes.json`), urbanisme (`territoire.json`) | IGN | Licence Ouverte 2.0 |
| DPE des quartiers (`irisdata.js`) | ADEME | Licence Ouverte 2.0 |
| habitants, revenus, logements vides (`habitants.json`) | Insee | Licence Ouverte 2.0 |
| copropriétés : lots, époque, syndic, parcelles (`copro/<ville>.js`) | registre national d'immatriculation des copropriétés (Anah) | Licence Ouverte 2.0 |
| résidences du Crous, permis de construire de logements, parcelles (`conc/<ville>.js`) | ministère de l'Enseignement supérieur ; Sitadel (SDES) ; cadastre Etalab | Licence Ouverte 2.0 |
| résidences étudiantes privées (`conc/<ville>.js`) | OpenStreetMap et ses contributeurs | ODbL |
| étudiants par rentrée (`etudiants.json`), campus et leurs inscrits (`reperes.json`) | ministère de l'Enseignement supérieur (SIES, atlas régional) | Licence Ouverte 2.0 |
| grands axes et voies ferrées (`bruit-quartiers.json`), part exposée au bruit (`bruit-expo.json`), voies de chaque ville (`bruit/<ville>.js`), tracés des lignes dans `lignes.js` | OpenStreetMap et ses contributeurs | ODbL |
| zones de bruit des aéroports (`peb.json`) | DGAC, plans d'exposition au bruit, Géoplateforme de l'IGN | conditions de la Géoplateforme (cartes.gouv.fr) |
| zone tendue (`ZTEN` dans `src/js/00-villes-calcul.js`) | zonage TLV, ministère de la Transition écologique | Licence Ouverte 2.0 |
| loyers de référence (`loyers-etat.json`) | carte des loyers de l'État | Licence Ouverte 2.0 |
| risques et catastrophes naturelles (`risques-quartiers.json`, `territoire.json`) | Géorisques | Licence Ouverte 2.0 |
| écoles, quartiers prioritaires (`territoire.json`), campus (`reperes.json`) | Éducation nationale ; ANCT, via la Caisse des dépôts ; Enseignement supérieur | Licence Ouverte 2.0 |
| gares et leur fréquentation (`reperes.json`) | SNCF | ODbL |
| commerces (`commerces.json`), trajets à pied et à vélo (`temps-trajets.json`) | OpenStreetMap et ses contributeurs | ODbL |
| lignes de bus et tram, trajets en bus (`lignes.js`, `transports.json`) | horaires GTFS des réseaux (transport.data.gouv.fr) | celle de chaque réseau (souvent ODbL) |
| prix et loyers RealAdvisor des quartiers (dans `irisdata.js`) | RealAdvisor | non couverts : droits de RealAdvisor |
| secteurs Bien'ici reliés aux quartiers (`secteurs-nouvelles-villes.json`) | Bien'ici | non couverts : droits de Bien'ici |

Fond de carte : © OpenStreetMap et ses contributeurs (ODbL), tuiles OpenFreeMap.

## Services appelés par la page

Ces services sont appelés au moment où l'on utilise la fonction concernée. Rien n'y est envoyé d'autre que la demande elle-même.

| Service | Pour |
|---|---|
| OpenFreeMap | fond de carte vectoriel |
| cdnjs (Cloudflare), Google Fonts | bibliothèque MapLibre GL, polices |
| Géoplateforme de l'IGN (géocodage, API Carto) | adresse d'un bien, parcelle et urbanisme à l'adresse |
| Géorisques | risques à l'adresse d'un bien |
| routing.openstreetmap.de | trajets depuis l'adresse d'un bien |
| Overpass (OpenStreetMap) | grands axes et voies ferrées autour de l'adresse d'un bien |
| photos Bien'ici (`file.bienici.com`) | photos des annonces |
| Supabase | annonces du soir, liste commune d'un groupe |
