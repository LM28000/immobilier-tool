# Architecture

Insula est **une seule page HTML**, autonome, assemblée par `build.py` à partir de trois choses : le moteur (`src/js/`), une interface (`src/v3/`) et les données publiques (`data/`). Il n'y a pas de framework, pas de bundler et pas de serveur applicatif. Seules les annonces et la liste commune viennent d'un service, Supabase.

```
data/*.json, *.js ─┐
src/js/00…99-*.js ─┼─► build.py ─► index.html      la page servie (GitHub Pages)
src/v3/v3.{js,css} ┤               dist/essai-test.html   la même, annonces incluses (tests)
src/head.html …   ─┘               dist/test.html   ancienne interface v2 (tests, serveur MCP)
                                   dist/moteur.js   moteur et données sans interface (app Android)
                                   sw.js            numéro de version de l'app installable
```

## Dossiers

| Dossier ou fichier | Contenu |
|---|---|
| `src/js/` | le **moteur** : données des villes, calcul, fiches, carte, liste commune. Les fichiers sont assemblés dans l'ordre de leur numéro. |
| `src/v3/` | l'**interface** du site (Insula), servie depuis le 12 novembre 2026 |
| `src/v2/` | l'ancienne interface, gardée seulement pour ses tests et pour le serveur MCP |
| `src/head.html`, `src/body.html`, `src/styles.css`, `src/pwa-head.html` | squelette, styles communs, balises de l'app installable |
| `src/ads-vue.js` | lecture des annonces et recalage des loyers sur les annonces de location |
| `data/` | données publiques, préparées par `tools/` (voir [donnees.md](donnees.md)) |
| `tools/` | préparation des données et relevé des annonces (Python et scripts de navigateur) |
| `tools/archive/` | premiers scripts, gardés pour mémoire ; à ne pas lancer |
| `mcp/` | serveur MCP qui expose le moteur à une IA ([mcp/README.md](../mcp/README.md)) |
| `tests/` | tests du calcul, des données, du serveur MCP et de bout en bout ([tests.md](tests.md)) |
| `supabase.sql` | tables, vues et règles d'accès de Supabase, par étapes datées |
| `build.py` | assemblage et contrôles de la page |
| `sync.sh`, `install-sync.sh` | publication automatique depuis le Mac ([publication.md](publication.md)) |
| `confidentialite.html`, `suppression.html` | pages demandées par le Play Store |
| `.well-known/assetlinks.json` | liens du site qui ouvrent l'app Android |
| `essai.html`, `v2.html` | anciennes adresses : elles renvoient à la page, en gardant `#f=` et `#g=` |

## Le moteur (`src/js/`)

Le numéro fixe l'ordre d'assemblage. `build.py` place les données des quartiers et des annonces entre `01-*` et `02-*`.

| Fichiers | Thème |
|---|---|
| `00-villes-calcul.js`, `00a-types-bien.js`, `00b-financement-impots.js` | villes, types de bien, hypothèses par défaut (`H`), crédit, impôts, rendement (TRI) |
| `01-fiche-ville.js`, `02-carte.js`, `03-recalcul.js`, `05-financement-ui.js` | fiche d'une ville, quartiers, recalcul quand un réglage change |
| `10-reperes.js` à `13-reglages-communs.js` | repères (gare, campus, centre), Nos biens, ce qui pèse sur un bien, réglages communs au groupe |
| `20-ventes.js` à `25-annonces-cloud.js` | ventes réelles, liste partagée, historique des prix, revente, données de quartier, fiches d'annonces, copropriétés, résidences et chantiers, documents à demander, annonces lues dans Supabase |
| `30-annonces-fiche.js` à `33-fiche-bien.js` | fiche d'une annonce, grille de visite, fiche d'un bien suivi |
| `42-fraicheur.js` à `50-accueil-suivi.js` | fraîcheur des données, infobulles, marché, contours, adresse, territoire, bruit, fiches complètes, type de bien, accueil |
| `99-demarrage.js` | démarrage |

Le moteur ne contient **aucun réglage propre à une ville**. Chaque donnée suit une seule règle, décrite dans [REGLES.md](../REGLES.md).

## Les interfaces

L'interface `src/v3/` est un seul fichier JavaScript et un seul fichier CSS. Elle s'appuie sur le moteur. Elle propose quatre espaces, identiques sur ordinateur et sur téléphone :

- **Explorer** : carte, liste ou graphique, pour les villes ou les annonces ;
- **Nos biens** ;
- **Projet** ;
- **Réglages**.

Sur ordinateur, ils sont dans la barre du haut, avec Réglages dans le rond à droite. Sur téléphone, ils sont dans la barre du bas. La fiche s'ouvre sur « L'essentiel ». Sur ordinateur, elle prend la place de la liste ; sur téléphone, elle s'ouvre dans un panneau en bas.

La carte (MapLibre) change de contenu avec le zoom :

1. les villes ;
2. puis les quartiers colorés et les annonces : point plein à l'adresse, point creux pour une position approchée ;
3. puis les immeubles en 3D, la carte s'inclinant.

`src/v2/` reste dans le dépôt parce que `tests/run.js` et le serveur MCP ouvrent `dist/test.html`. Le serveur MCP n'en lit que le moteur.

## L'app Android

L'app Insula (Expo et React Native, dépôt privé) reprend `dist/moteur.js` : le moteur et les données publiques, sans interface. Elle donne donc exactement les mêmes chiffres que le site. Les liens `https://insula.du-cray.eu/#g=…` (invitation) et `#f=…` (fiche partagée) l'ouvrent directement, grâce à `.well-known/assetlinks.json`.

## Contrôles de `build.py`

La page n'est pas écrite si l'un de ces contrôles échoue :

- un fichier de données manque ;
- un même nom est déclaré deux fois dans le moteur ;
- le script assemblé ne se lit pas (`node --check`, pour v2 comme pour v3) ;
- la page publique dépasse 3 Mo.

Chaque fichier est écrit d'un coup (fichier temporaire puis renommage) : `sync.sh`, qui surveille `index.html`, ne voit jamais une page à moitié écrite.

Le réglage `publication.json` → `"annonces_publiques": false` retire les annonces, l'historique et les fiches de la page publique, qui les lit alors dans Supabase.
