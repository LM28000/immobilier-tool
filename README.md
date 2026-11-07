# Où acheter notre studio ?

Comparateur de 13 villes de l'Ouest pour un studio meublé en location : prix, loyers, quartiers (IRIS), DPE, annonces Bien'ici, financement et rendement.

Page en ligne : https://lm28000.github.io/immobilier-tool/

## Organisation

| Dossier | Contenu |
|---|---|
| `src/head.html`, `src/body.html`, `src/styles.css` | squelette et styles de la page |
| `src/js/` | le code, découpé par thème ; les fichiers sont assemblés dans l'ordre de leur numéro |
| `data/` | données : fond de carte, villes, quartiers IRIS, annonces du jour (`annoncesdata.js`), historique des prix (`historique.js`), secteurs Bien'ici → IRIS des nouvelles villes |
| `tools/` | préparation des données (IRIS, DVF, carte), `maj_annonces.py` (relevé quotidien → données + historique), `extraction-bienici.js` (lecture d'une page de résultats), `fiches.py` et `fiches-bienici.js` (fiche complète de chaque annonce : description, photos, charges, DPE, étage, position) |
| `data/fiches/` | fiches complètes des annonces, une par ville, lues une seule fois par annonce |
| `tests/run.js`, `tests/visit.js` | tests de bout en bout (ordinateur et téléphone) avec Playwright |
| `build.py` | assemble `index.html` (la page servie) et `dist/` |
| `manifest.webmanifest`, `sw.js`, `icons/` | appli installable sur téléphone, utilisable hors ligne (version GitHub) |
| `supabase.sql` | table partagée « Nos biens » (accès par code de groupe) |
| `sync.sh`, `install-sync.sh` | poussent automatiquement les changements sur GitHub (launchd), après vérification des données et de la page ; en cas de refus, notification macOS et ligne « NON PUBLIÉ » dans `sync.log` |

## Modifier

```bash
python3 build.py          # régénère index.html
node tests/run.js         # vérifie (npm i playwright au besoin)
```

Les annonces sont relevées chaque jour (Le Mans, Saint-Nazaire, Angers, Caen, Orléans) par une tâche planifiée : elle écrit `data/releve-du-jour.json`, lit les fiches des annonces nouvelles (`python3 tools/fiches.py todo data/releve-du-jour.json`, puis `tools/fiches-bienici.js` dans la page Bien'ici, 60 par soir au plus), puis lance `python3 tools/maj_annonces.py data/releve-du-jour.json`, `python3 tools/fiches.py merge data/fiches-du-jour.json` et `python3 build.py`.

Estimations, pas un conseil financier ni fiscal.
