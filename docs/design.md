# Design system

Insula suit un seul design system, la direction **Ardoise** : fonds gris-bleu clairs, un accent ardoise, et des couleurs vives réservées à ce qui a un sens (le rendement, l'état d'un point, la carte). Les valeurs ci-dessous sont celles du code. C'est lui qui fait foi :

- **site** : les variables en tête de `src/v3/v3.css` (`:root`, puis le thème sombre) ;
- **app Android** : `src/theme.ts` du dépôt `insula-app`, mêmes valeurs sous d'autres noms (`accentSoft` pour `--accent-soft`…).

Une couleur ou une taille qui change se change **dans les deux**.

## Couleurs

### Fonds et texte

| Jeton | Clair | Sombre | Usage |
|---|---|---|---|
| `--bg` | `#eef1f5` | `#10161e` | fond de la page |
| `--surface` | `#ffffff` | `#18212d` | cartes, panneaux, barres |
| `--sunk` | `#e6ebf2` | `#222d3b` | creux : boutons segmentés, colonnes, champs |
| `--line` | `#d9dfe7` | `#2a3647` | filets et bordures |
| `--fg` | `#18212d` | `#e6ecf3` | texte |
| `--muted` | `#52606f` | `#9caabb` | texte secondaire |
| `--accent` | `#2c4766` | `#93b4da` | l'ardoise : boutons principaux, espace courant, liens |
| `--accent-soft` | `#dbe4ef` | `#22324a` | fond d'un élément choisi |
| `--on-accent` | `#ffffff` | `#10161e` | texte sur l'accent |
| `--fenetre` | `#f2c14e` | `#f2c14e` | le jaune de la fenêtre du logo : à signaler, première visite |

### États

| Jeton | Clair | Sombre | Sens |
|---|---|---|---|
| `--ok` / `--ok-soft` | `#18703f` / `#d9f0e3` | `#5cc98a` / `#163327` | bon |
| `--warn` / `--warn-soft` | `#a15600` / `#fbe9cd` | `#f0a640` / `#3a2b12` | moyen, à vérifier |
| `--bad` / `--bad-soft` | `#b3261e` / `#f8dcd9` | `#ff8a7a` / `#3d1a1f` | faible, attention |

Le texte de ces trois couleurs tient un contraste d'au moins 5,5:1 sur `--surface`, en clair comme en sombre. Le texte courant dépasse 14:1, le texte secondaire 5,7:1.

### Carte

| Jeton | Clair | Sombre | Usage |
|---|---|---|---|
| `--map-ok`, `--map-warn`, `--map-bad` | `#2f9b5a`, `#d98a1e`, `#c0392b` | `#5cc98a`, `#f0a640`, `#ff8a7a` | villes, quartiers et annonces selon le rendement |
| `--q-1` … `--q-5` | `#e3e9f1` → `#2c4766` | `#22324a` → `#b7cde6` | quartiers colorés par une autre mesure : une seule teinte, 5 classes |
| `--poi-transport`, `--poi-commerce` | `#6250d6`, `#d55181` | `#9085e9`, `#e87ba4` | arrêts et commerces |
| `--land`, `--water` | `#e4e8ee`, `#c9d6e4` | `#1a222d`, `#22324a` | fond de carte |

## Règles d'usage

- **Rouge, orange et vert ne servent qu'au rendement.** Les seuils sont les mêmes partout : sous 2,5 % en rouge, de 2,5 à 5 % en orange, 5 % et plus en vert (`yieldColor` dans l'app). Le chiffre est toujours écrit à côté : la couleur n'est jamais seule à porter l'information.
- **Les autres mesures des quartiers** (prix, loyer, trajet, commerces, étudiants, revenus, DPE, bruit) utilisent la teinte `--q` en 5 classes. Les bornes sont les quintiles des quartiers des 22 villes. La zone inondable n'a que deux classes.
- **Annonces sur la carte** :
  - un point plein pour une adresse exacte ou à 100 m près, un point creux pour une position approchée ;
  - un anneau jaune (`--fenetre`) autour d'un bien suivi, un anneau ardoise (`--accent`) autour d'une annonce nouvelle ;
  - la taille d'une ville dépend du nombre d'annonces pour nos critères.
- **L'accent ardoise** marque ce qui est choisi : l'espace courant, le type de bien, la vue, le bouton principal.
- **Le jaune** reste rare : la fenêtre du logo, les premières visites, les biens suivis sur la carte.

## Typographie

| Rôle | Police | Où |
|---|---|---|
| titres, nom du lieu, marque | **Space Grotesk** 600, interlettrage −0,01 em | barre du haut, titres de fiche et de section |
| texte et chiffres | **Inter** (400, 600, 700) | tout le reste ; chiffres en `tabular-nums` dans les listes |

Le texte courant est en 15 px sur le site. Les chiffres clés d'une fiche sont en 17 à 20 px, en gras. Les petites capitales (« INSULA », « LES VILLES ») sont en 10 à 12 px, gras, espacées, en `--muted`.

## Formes et espaces

| Jeton | Valeurs |
|---|---|
| arrondis `--radius-sm/md/lg/xl/pill` | 8, 12, 16, 20, 999 px |
| espaces `--space-1` … `--space-8` | 4, 8, 12, 16, 20, 24, 32 px |
| zone tactile `--touch` | 44 px au moins sur téléphone |
| ombres | `--shadow-pop` (bulles, légende), `--shadow-float` (panneaux sur la carte), `--shadow-sheet` (panneau du bas) |

Les boutons et les champs sont arrondis en `md`, les cartes et les panneaux en `lg`, les fenêtres en `xl`. Les pastilles (type de bien, filtres) sont arrondies en `pill`.

## Composants

| Composant | Description |
|---|---|
| **barre du haut** | sur ordinateur : la marque, les espaces (soulignés en accent quand ils sont choisis), le type de bien en boutons segmentés, puis le rond Réglages. Sur téléphone : le lieu en titre à gauche (« INSULA » au-dessus de L'Ouest, « ‹ ville » en ville), le type de bien en pastille bordée, puis les trois vues en icônes. |
| **menu du bas** (téléphone) | quatre espaces. Celui où l'on est a un trait de 28 × 3 px en accent en haut, une icône remplie et son nom en gras et en couleur. La barre a une ombre légère, pas de filet. |
| **boutons segmentés** | un creux `--sunk`, et le choix en `--surface` (vues) ou en `--accent` (type de bien, Villes / Annonces). |
| **lignes de liste** | à gauche, le nom et une ligne de faits (« 75 k€ tout compris · −58 €/mois · Paris 3 h 35 ») ; à droite, le rendement en couleur, avec la fourchette prudent / favorable en dessous. |
| **fiche** | un en-tête compact (vignette, titre, trois chiffres), puis des onglets ; « L'essentiel » d'abord. Sur téléphone, un panneau à trois hauteurs (bandeau, demi-écran, plein écran). |
| **légende de la carte** | repliée en pastille ; ouverte, l'échelle, ce qu'on voit autour et le choix de la mesure. |
| **marque** | une maison ardoise, avec une fenêtre jaune (`tools/icone.svg`, `icons/`). |

## Thèmes

Il y a un thème clair, un sombre, et « comme l'appareil ». Le choix est propre à chacun (Réglages) et se garde sur l'appareil. Le thème sombre n'est pas une inversion : chaque jeton a sa valeur, et la carte a ses propres fonds (style OpenFreeMap `dark`).

## Écarts connus entre le site et l'app

- **Thème par défaut** : clair sur le site, « comme l'appareil » dans l'app.
- **Voies ferrées** : `--rail` (`#7c6f8e`) est défini dans les variables du site mais n'est utilisé nulle part. La carte, sur le site comme dans l'app, dessine les voies en `#5b6472` (clair) et `#8b96a6` (sombre).
