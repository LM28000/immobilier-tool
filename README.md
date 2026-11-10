# Où acheter notre studio ?

Comparateur de 22 villes de l'Ouest pour un studio meublé en location : prix, loyers, quartiers (IRIS), DPE, annonces Bien'ici, financement et rendement.

Page en ligne : https://lm28000.github.io/immobilier-tool/

## Organisation

| Dossier | Contenu |
|---|---|
| `src/head.html`, `src/body.html`, `src/styles.css` | squelette et styles de la page |
| `src/js/` | le code, découpé par thème ; les fichiers sont assemblés dans l'ordre de leur numéro |
| `data/` | données : fond de carte, villes, quartiers IRIS, annonces du jour (`annoncesdata.js`), historique des prix (`historique.js`), secteurs Bien'ici → IRIS (`secteurs-nouvelles-villes.json` : toutes les villes sauf Le Mans et Saint-Nazaire, dont la carte est d'origine) |
| `mcp/` | serveur MCP : brancher l'outil sur une IA (voir `mcp/README.md`) |
| `tools/` | préparation des données (IRIS, DVF, carte), `maj_annonces.py` (relevé quotidien → données + historique), `extraction-bienici.js` (lecture d'une page de résultats), `fiches.py` et `fiches-bienici.js` (fiche complète de chaque annonce : description, photos, charges, DPE à jour du calcul de 2027, étage, position), `prix_tendance.py` (prix des appartements depuis 2014, pour la hausse des prix selon la ville), `rail_rfn.py` (grandes lignes de train de la vue dézoomée), `copro_rnic.py` (copropriétés du registre national, une ville par fichier dans `data/copro/`), `concurrence.py` (résidences étudiantes et logements neufs autorisés, une ville par fichier dans `data/conc/`) |
| `data/fiches/` | fiches complètes des annonces, une par ville, lues une seule fois par annonce |
| `tests/run.js` | tests de bout en bout (ordinateur et téléphone) avec Playwright, dont la carte (ce qui est réellement dessiné à chaque zoom), le thème et les réglages communs à deux personnes sur une liste commune simulée ; `tests/vendor/` : MapLibre pour tester la carte 3D sans réseau |
| `tests/unit.js`, `tests/test_donnees.py` | tests rapides : calcul financier et fiscal, nettoyage des biens partagés, scripts de données, cohérence des villes |
| `publication.json` | annonces dans la page publique ou seulement dans Supabase |
| `build.py` | assemble `index.html` (la page servie) et `dist/` (`test.html` : la même page avec les annonces, pour les tests et le serveur MCP) |
| `src/v2/` | l'interface de l'outil, servie à `index.html` depuis le 8 novembre 2026 : marché filtré par nos critères en carte (MapLibre : le zoom montre les villes, puis les quartiers et les annonces, puis les immeubles en 3D, la carte s'inclinant en ville ; quartiers colorés au choix — rendement, prix, loyer, trajet, commerces, étudiants, revenus, DPE, zone inondable — et nommés de près ; annonces en point plein à leur adresse ou à 100 m près, en point creux quand la position est approchée ; nos biens saisis à leur adresse ; lignes de bus et tram des réseaux aux couleurs officielles (`data/lignes.js`, chargé à part), trains, arrêts et commerces autour), tableau ou nuage ; thème clair par défaut ou sombre, au choix de chacun ; ce qui a bougé depuis la dernière visite ; fiche unique en onglets ; avis, offre, visite et comparaison à deux ; branchée sur le moteur, les fiches et la liste partagée de l'app (`src/js/`) |
| `src/js/13-reglages-communs.js` | réglages communs à deux (hypothèses, financement, valeurs par type, critères) dans une ligne spéciale de la liste partagée |
| `v2.html` | ancien lien d'essai : renvoie à l'adresse d'origine |
| `manifest.webmanifest`, `sw.js`, `icons/` | appli installable sur téléphone, utilisable hors ligne (version GitHub) |
| `supabase.sql` | tables partagées « Nos biens » et « annonces » (accès par code de groupe) ; `tools/supabase_annonces.py` envoie les annonces |
| `sync.sh`, `install-sync.sh` | poussent automatiquement les changements sur GitHub (launchd), après vérification des données et de la page ; en cas de refus, notification macOS et ligne « NON PUBLIÉ » dans `sync.log` |

## Modifier

```bash
python3 build.py          # régénère index.html ; refuse une page cassée (données invalides, erreur de syntaxe)
npm install               # une fois : Playwright (version figée dans package-lock.json)
npx playwright install chromium
npm test                  # build + tests du calcul + tests des données + tests de bout en bout (ordinateur et téléphone)
```

`sync.sh` lance aussi les tests rapides avant chaque publication et n'envoie rien s'ils échouent (notification macOS, ligne « NON PUBLIÉ » dans `sync.log`). GitHub relance tous les tests à chaque envoi (`.github/workflows/tests.yml`).

Les annonces sont relevées chaque jour dans les 22 villes par une routine Claude : elle écrit `data/releve-du-jour.json`, lit les fiches des annonces nouvelles (`python3 tools/fiches.py todo data/releve-du-jour.json`, puis `tools/fiches-bienici.js` dans la page Bien'ici, 60 par soir au plus), puis lance `python3 tools/maj_annonces.py data/releve-du-jour.json`, `python3 tools/fiches.py merge data/fiches-du-jour.json`, `python3 build.py` et `python3 tools/supabase_annonces.py push`.

## Annonces privées (Supabase)

Depuis le 7 novembre 2026, les annonces, leur historique et leurs fiches (descriptions, photos d'agences) ne sont plus dans le dépôt public : la page les lit dans Supabase. Depuis le 9 novembre 2026, tout le monde les voit, sans code, par la vue en lecture seule « annonces_publiques » (partie 3 de `supabase.sql` : elle ne montre jamais la colonne du code) ; le code de groupe ne sert plus qu'à « Nos biens » et aux réglages communs. Sur un nouvel ordinateur : `python3 tools/supabase_annonces.py pull`. Mise en place (déjà faite) :

1. Dans Supabase > SQL Editor, coller la partie « Novembre 2026 » de `supabase.sql`, puis Run.
2. Sur le Mac, enregistrer le code de groupe (le même que dans la page, « Liste commune ») :
   `mkdir -p ~/.config/immobilier-tool && pbpaste > ~/.config/immobilier-tool/groupe` (après l'avoir copié).
3. `python3 tools/supabase_annonces.py push` puis `python3 tools/supabase_annonces.py check`.
4. Mettre `"annonces_publiques": false` dans `publication.json`, puis `python3 build.py` : la page publique ne contient plus d'annonces ; la page les lit dans Supabase avec le code.
5. Retirer les fichiers du dépôt (ils restent sur le Mac) : `git rm --cached -r data/annoncesdata.js data/historique.js data/fiches` et les ajouter à `.gitignore`. L'historique git garde les anciennes versions tant qu'il n'est pas réécrit.

## Licence

Le code (`src/`, `tools/`, `tests/`, `mcp/`, `build.py`, scripts) est sous licence MIT (`LICENSE`), © 2026 Louis-Marie Perret du Cray. Les fichiers de `data/` n'en font pas partie : chacun garde la licence de sa source, à citer en cas de réutilisation.

| Données | Source | Licence |
|---|---|---|
| ventes réelles (`dvf.json`), prix des appartements depuis 2014 (`prix-tendance.json`) | DVF (DGFiP) ; Terralyse d'après DVF | Licence Ouverte 2.0 |
| contours des quartiers IRIS et fonds de carte (`irisdata.js`, `mapdata.js`, `citymaps.json`), mairies (`reperes.json`), urbanisme (`territoire.json`) | IGN | Licence Ouverte 2.0 |
| DPE des quartiers (`irisdata.js`) | ADEME | Licence Ouverte 2.0 |
| habitants, revenus, logements vides (`habitants.json`) | Insee | Licence Ouverte 2.0 |
| copropriétés : lots, époque, syndic, parcelles (`copro/<ville>.js`) | registre national d'immatriculation des copropriétés (Anah) | Licence Ouverte 2.0 |
| résidences du Crous, permis de construire de logements, parcelles (`conc/<ville>.js`) | ministère de l'Enseignement supérieur ; Sitadel (SDES) ; cadastre Etalab | Licence Ouverte 2.0 |
| résidences étudiantes privées (`conc/<ville>.js`) | OpenStreetMap et ses contributeurs | ODbL |
| loyers de référence (`loyers-etat.json`) | carte des loyers de l'État | Licence Ouverte 2.0 |
| risques et catastrophes naturelles (`risques-quartiers.json`, `territoire.json`) | Géorisques | Licence Ouverte 2.0 |
| écoles, quartiers prioritaires (`territoire.json`), campus (`reperes.json`) | Éducation nationale ; ANCT, via la Caisse des dépôts ; Enseignement supérieur | Licence Ouverte 2.0 |
| gares et leur fréquentation (`reperes.json`) | SNCF | ODbL |
| commerces (`commerces.json`), trajets à pied et à vélo (`temps-trajets.json`) | OpenStreetMap et ses contributeurs | ODbL |
| lignes de bus et tram, trajets en bus (`lignes.js`, `transports.json`) | horaires GTFS des réseaux (transport.data.gouv.fr) | celle de chaque réseau (souvent ODbL) |
| prix et loyers RealAdvisor des quartiers (dans `irisdata.js`) | RealAdvisor | non couverts : droits de RealAdvisor |
| secteurs Bien'ici reliés aux quartiers (`secteurs-nouvelles-villes.json`) | Bien'ici | non couverts : droits de Bien'ici |

Estimations, pas un conseil financier ni fiscal.
