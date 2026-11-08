# Où acheter notre studio ?

Comparateur de 20 villes de l'Ouest pour un studio meublé en location : prix, loyers, quartiers (IRIS), DPE, annonces Bien'ici, financement et rendement.

Page en ligne : https://lm28000.github.io/immobilier-tool/

## Organisation

| Dossier | Contenu |
|---|---|
| `src/head.html`, `src/body.html`, `src/styles.css` | squelette et styles de la page |
| `src/js/` | le code, découpé par thème ; les fichiers sont assemblés dans l'ordre de leur numéro |
| `data/` | données : fond de carte, villes, quartiers IRIS, annonces du jour (`annoncesdata.js`), historique des prix (`historique.js`), secteurs Bien'ici → IRIS (`secteurs-nouvelles-villes.json` : toutes les villes sauf Le Mans et Saint-Nazaire, dont la carte est d'origine) |
| `mcp/` | serveur MCP : brancher l'outil sur une IA (voir `mcp/README.md`) |
| `tools/` | préparation des données (IRIS, DVF, carte), `maj_annonces.py` (relevé quotidien → données + historique), `extraction-bienici.js` (lecture d'une page de résultats), `fiches.py` et `fiches-bienici.js` (fiche complète de chaque annonce : description, photos, charges, DPE, étage, position) |
| `data/fiches/` | fiches complètes des annonces, une par ville, lues une seule fois par annonce |
| `tests/run.js` | tests de bout en bout (ordinateur et téléphone) avec Playwright, dont les réglages communs à deux personnes sur une liste commune simulée ; `tests/vendor/` : MapLibre pour tester la carte 3D sans réseau |
| `tests/unit.js`, `tests/test_donnees.py` | tests rapides : calcul financier et fiscal, nettoyage des biens partagés, scripts de données, cohérence des villes |
| `publication.json` | annonces dans la page publique ou seulement dans Supabase |
| `build.py` | assemble `index.html` (la page servie) et `dist/` (`test.html` : la même page avec les annonces, pour les tests et le serveur MCP) |
| `src/v2/` | l'interface de l'outil, servie à `index.html` depuis le 8 novembre 2026 : marché filtré par nos critères en carte, tableau ou nuage ; ce qui a bougé depuis la dernière visite ; fiche unique en onglets ; avis, offre, visite et comparaison à deux ; branchée sur le moteur, les fiches et la liste partagée de l'app (`src/js/`) |
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

Les annonces sont relevées chaque jour dans les 20 villes par une routine Claude : elle écrit `data/releve-du-jour.json`, lit les fiches des annonces nouvelles (`python3 tools/fiches.py todo data/releve-du-jour.json`, puis `tools/fiches-bienici.js` dans la page Bien'ici, 60 par soir au plus), puis lance `python3 tools/maj_annonces.py data/releve-du-jour.json`, `python3 tools/fiches.py merge data/fiches-du-jour.json`, `python3 build.py` et `python3 tools/supabase_annonces.py push`.

## Annonces privées (Supabase)

Depuis le 7 novembre 2026, les annonces, leur historique et leurs fiches (descriptions, photos d'agences) ne sont plus dans le dépôt public : la page les lit dans Supabase avec le code de groupe ; sans code, elle n'en affiche aucune. Sur un nouvel ordinateur : `python3 tools/supabase_annonces.py pull`. Mise en place (déjà faite) :

1. Dans Supabase > SQL Editor, coller la partie « Novembre 2026 » de `supabase.sql`, puis Run.
2. Sur le Mac, enregistrer le code de groupe (le même que dans la page, « Liste commune ») :
   `mkdir -p ~/.config/immobilier-tool && pbpaste > ~/.config/immobilier-tool/groupe` (après l'avoir copié).
3. `python3 tools/supabase_annonces.py push` puis `python3 tools/supabase_annonces.py check`.
4. Mettre `"annonces_publiques": false` dans `publication.json`, puis `python3 build.py` : la page publique ne contient plus d'annonces ; la page les lit dans Supabase avec le code.
5. Retirer les fichiers du dépôt (ils restent sur le Mac) : `git rm --cached -r data/annoncesdata.js data/historique.js data/fiches` et les ajouter à `.gitignore`. L'historique git garde les anciennes versions tant qu'il n'est pas réécrit.

Estimations, pas un conseil financier ni fiscal.
