# Contribuer

C'est un outil personnel, pour un couple puis la famille et les amis. Les remarques sont bienvenues : par le bouton « Une remarque ? » de l'app, ou par un ticket (modèles « Problème » et « Idée »).

## Règles du code

- **Une seule règle par donnée**, la même pour toutes les villes ([REGLES.md](REGLES.md)). Pas de cas particulier pour une ville : si une ville semble en demander un, c'est la règle qu'il faut revoir.
- **Le moteur est commun** (`src/js/`) au site, au serveur MCP et à l'app Android. Un changement de calcul y change tous les chiffres : mettez à jour `tests/unit.js` et [docs/calculs.md](docs/calculs.md).
- **Textes en français simple**, sans jargon, pour quelqu'un qui découvre l'immobilier locatif.
- **Rien de privé dans le dépôt** : pas d'annonces, pas de code de groupe, pas de clé. Voir [docs/annonces-et-groupes.md](docs/annonces-et-groupes.md).
- **Licences des données** : une nouvelle source se cite dans [docs/donnees.md](docs/donnees.md), avec sa licence.

## Avant d'envoyer

```bash
npm test
```

Les cinq lignes « N/N tests réussis » doivent être complètes ([docs/tests.md](docs/tests.md)). Les messages de commit disent, en français, ce qui change pour la personne qui utilise l'app.
