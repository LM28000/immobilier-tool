# Où acheter notre studio ?

Comparateur de 13 villes de l'Ouest pour un studio meublé en location : prix, loyers, quartiers (IRIS), DPE, annonces Bien'ici, financement et rendement.

Page en ligne : https://lm28000.github.io/immobilier-tool/

## Organisation

| Dossier | Contenu |
|---|---|
| `src/head.html`, `src/body.html`, `src/styles.css` | squelette et styles de la page |
| `src/js/` | le code, découpé par thème ; les fichiers sont assemblés dans l'ordre de leur numéro |
| `data/` | données : fond de carte, villes, quartiers IRIS, annonces du jour et historique |
| `tools/` | scripts Python qui ont servi à préparer les données (IRIS, DVF, carte) |
| `tests/run.js`, `tests/visit.js` | tests de bout en bout (ordinateur et téléphone) avec Playwright |
| `build.py` | assemble `index.html` (la page servie) et `dist/` |
| `supabase.sql` | table partagée « Nos biens » (accès par code de groupe) |
| `sync.sh`, `install-sync.sh` | poussent automatiquement les changements sur GitHub (launchd) |

## Modifier

```bash
python3 build.py          # régénère index.html
node tests/run.js         # vérifie (npm i playwright au besoin)
```

Les annonces sont relevées chaque jour par une tâche planifiée qui met à jour `data/annoncesdata.js` puis relance `build.py`.

Estimations, pas un conseil financier ni fiscal.
