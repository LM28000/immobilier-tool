<p align="center">
  <img src="docs/images/banniere.png" alt="Insula : où acheter un studio à louer dans l'Ouest" width="640">
</p>

<p align="center">
  <a href="https://insula.du-cray.eu"><img alt="Site" src="https://img.shields.io/badge/site-insula.du--cray.eu-2c4766"></a>
  <img alt="22 villes" src="https://img.shields.io/badge/villes-22-2c4766">
  <img alt="Licence MIT (code)" src="https://img.shields.io/badge/licence%20du%20code-MIT-2c4766">
  <img alt="Sans dépendance à l'exécution" src="https://img.shields.io/badge/page-un%20seul%20fichier-2c4766">
</p>

**Insula** aide à choisir où acheter un petit logement à louer meublé (studio, T2 ou T3) dans 22 villes de l'Ouest de la France. On peut comparer les villes et leurs quartiers, puis les annonces relevées chaque soir. Chaque bien est chiffré : budget tout compris, mensualité, cash-flow et rendement sur 15 ans revente comprise, avec les impôts du loueur en meublé (LMNP).

C'est un outil personnel, fait pour un couple puis pour la famille et les amis. Il n'y a ni compte, ni publicité, ni mesure d'audience.

- **Site** : https://insula.du-cray.eu (installable sur téléphone, utilisable hors ligne)
- **App Android** : Insula, en test sur le Play Store (dépôt privé, même moteur de calcul)

<p align="center">
  <img src="docs/images/ordinateur.jpg" alt="Insula sur ordinateur : la carte des 22 villes et leur classement" width="72%">
  &nbsp;
  <img src="docs/images/telephone.jpg" alt="Insula sur téléphone : la carte et la liste des villes" width="22%">
</p>

## Ce que fait l'app

| Espace | Contenu |
|---|---|
| **Explorer** | l'Ouest, puis une ville, en carte, en liste ou en graphique. De loin, les villes sont colorées par rendement. De près, on voit les quartiers (IRIS) colorés selon la mesure choisie, les annonces à leur position, les lignes de bus et de tram, et les immeubles en 3D. |
| **La fiche** | l'essentiel d'abord. Puis le prix comparé aux ventes réelles du quartier, le calcul (modifiable), le quartier (trajets, commerces, risques, bruit, habitants, copropriété) et l'achat (prix à proposer, documents à demander). |
| **Nos biens** | les biens suivis, étape par étape : à voir, visité, offre, compromis, acheté. Avec l'avis de chacun, l'offre, la grille de visite, les échéances et un comparateur. |
| **Projet** | ce qui est commun au groupe : critères, crédit, associés (1 à 6) et impôts, hypothèses, ce qui pèse le plus. |
| **Réglages** | prénom, code de groupe, thème clair ou sombre, scénario (prudent, central, favorable), aide. |

Un bien suivi peut être partagé dans un **groupe**, réservé à ceux qui ont le code : un foyer, sa liste et ses réglages. Les annonces et les calculs sont les mêmes pour tout le monde.

## Démarrer

```bash
npm install                       # Playwright (tests) et le SDK MCP
npx playwright install chromium   # une fois
python3 tools/supabase_annonces.py pull   # annonces du jour (privées, lues dans Supabase)
npm test                          # construit la page puis lance toutes les suites
```

`python3 build.py` assemble la page servie (`index.html`) à partir de `src/` et `data/`. Il refuse de produire une page cassée.

Sur le Mac de travail, une tâche `launchd` publie automatiquement les changements (`sync.sh`). Voir [docs/publication.md](docs/publication.md) avant d'écrire quoi que ce soit dans le dossier.

## Documentation

| Document | Pour |
|---|---|
| [Architecture](docs/architecture.md) | comprendre l'organisation du code, l'assemblage de la page et les interfaces |
| [Design system](docs/design.md) | couleurs, polices, formes, règles d'usage et composants, communs au site et à l'app |
| [Le calcul](docs/calculs.md) | le modèle financier : crédit, loyers, impôts LMNP, revente, rendement |
| [Règles des données](REGLES.md) | une règle par donnée, la même pour toutes les villes ; ajouter une ville |
| [Données et sources](docs/donnees.md) | d'où vient chaque fichier de `data/`, sa licence, l'outil qui le produit |
| [Annonces et groupes](docs/annonces-et-groupes.md) | le relevé du soir, Supabase, les codes de groupe |
| [Publication](docs/publication.md) | construction, publication automatique, domaine, app installable, app Android |
| [Tests](docs/tests.md) | les cinq suites et ce qu'elles vérifient |
| [Serveur MCP](mcp/README.md) | brancher l'outil sur une IA (classer, chercher, simuler) |
| [Journal des changements](CHANGELOG.md) | les grandes étapes |

## Pile technique

Page unique en HTML, CSS et JavaScript, sans framework ni étape de compilation JavaScript. La carte utilise [MapLibre GL](https://maplibre.org), avec les fonds vectoriels d'[OpenFreeMap](https://openfreemap.org). La préparation des données est en Python. Les annonces et la liste commune sont stockées dans [Supabase](https://supabase.com). Les tests de bout en bout tournent sous [Playwright](https://playwright.dev). Le site est hébergé sur GitHub Pages, derrière Cloudflare.

## Licence

Le code (`src/`, `tools/`, `tests/`, `mcp/`, `build.py` et les scripts) est sous [licence MIT](LICENSE), © 2026 Louis-Marie Perret du Cray.

Les fichiers de `data/` n'en font pas partie : chacun garde la licence de sa source, la plupart sous Licence Ouverte 2.0 ou ODbL. Le détail est dans [docs/donnees.md](docs/donnees.md).

> Les chiffres sont des estimations faites à partir de sources publiques. Ce n'est ni un conseil financier, ni un conseil fiscal : vérifiez avec la banque, le notaire et un comptable avant de signer.
