# Annonces et groupes

## Le relevé du soir

Chaque soir, une routine Claude relève les annonces Bien'ici des 22 villes : studios, T2 et T3, à vendre et à louer. Elle s'arrête au plafond tiré du budget du groupe. Son texte complet est dans [tools/routine-releve.md](../tools/routine-releve.md). Elle ouvre les pages comme un visiteur, une par une, sans appeler d'API en masse et sans contourner de blocage.

```
tools/releve_plan.py              le plan : villes, types, tranches de prix, pages à ouvrir
  └─ tools/extraction-bienici.js  lit chaque page de résultats → data/releve-du-jour.json
tools/fiches.py todo              les annonces nouvelles dont il faut lire la fiche (150 au plus)
  └─ tools/fiches-bienici.js      lit les fiches → data/fiches-du-jour.json
tools/maj_annonces.py             annonces du jour, historique des prix, annonces vendues
tools/fiches.py merge             range les fiches par ville
build.py                          reconstruit la page
tools/supabase_annonces.py push   envoie annonces, historique et fiches dans Supabase
```

Règles de prudence de `maj_annonces.py` :

- une annonce absente de **deux** relevés de suite est comptée comme vendue ;
- une page qui renvoie moins de la moitié des annonces de la veille garde la liste de la veille ;
- si aucun relevé n'a abouti, le script s'arrête en erreur et rien n'est republié.

## Ce qui est privé

Depuis le 7 novembre 2026, les annonces, leur historique et leurs fiches (descriptions, photos d'agences) **ne sont plus dans le dépôt public**. `.gitignore` les écarte :

- `data/annoncesdata.js` ;
- `data/historique.js` ;
- `data/fiches/` ;
- les fichiers `*-du-jour.json`.

La page les lit dans Supabase. Sur un nouvel ordinateur, on les récupère avec `python3 tools/supabase_annonces.py pull`.

> L'historique git garde les versions d'avant le 7 novembre tant qu'il n'est pas réécrit.

## Supabase

Le schéma complet est dans [supabase.sql](../supabase.sql). Il est découpé en étapes datées, à coller dans l'éditeur SQL de Supabase.

| Table ou vue | Contenu | Accès |
|---|---|---|
| `biens` | la liste « Nos biens » d'un groupe et ses réglages communs (une ligne spéciale) | lecture et écriture avec le code du groupe |
| `annonces` | annonces, historique, champs de calcul, fiches par ville | **fermée** : aucune lecture publique |
| `annonces_publiques` (vue) | les mêmes, en lecture seule, sans la colonne du code | tout le monde, depuis le 9 novembre 2026 |
| `retours`, `retours_lecture` (vue) | remarques envoyées depuis l'app | écriture par tous, lecture avec notre code |

Les protections sont posées dans la base, pas dans la page :

- la page envoie le code dans l'en-tête `x-groupe`. La base n'en garde que l'empreinte SHA-256 et ne montre que les lignes de ce groupe ;
- un code de moins de 12 caractères ne donne aucune empreinte : rien n'est lisible ni écrit sans un vrai code ;
- un groupe a au plus 500 biens. La forme et la taille des écritures sont bornées. La date de modification est posée par la base ;
- seul le groupe qui a déjà des annonces peut en ajouter.

## Les groupes

Un groupe correspond à un foyer. On le crée dans **Nos biens › Créer notre groupe** : un code de 15 caractères est tiré au hasard. **Inviter** envoie un lien `https://insula.du-cray.eu/#g=<code>`. Le code reste après le `#` : il n'est jamais envoyé au serveur de la page. Il ouvre l'app sur ce groupe, sur le site comme dans l'app Android.

Un groupe garde sa liste, les avis, les offres, les grilles de visite et les réglages du Projet. Les annonces et les calculs sont les mêmes pour tous.

Sur le Mac, le code de notre groupe est dans `~/.config/immobilier-tool/groupe`. Il n'est jamais dans le dépôt. `tools/supabase_annonces.py` et le serveur MCP le lisent là.

## Données personnelles

La politique est décrite dans [confidentialite.html](../confidentialite.html) : ce qui reste sur l'appareil et ce qui est partagé avec le groupe. L'effacement des données est expliqué dans [suppression.html](../suppression.html).

L'app n'a ni compte, ni publicité, ni mesure d'audience.
