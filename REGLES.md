# Règles de l'app

Une seule règle par donnée, la même pour toutes les villes. Quand une donnée manque, l'app le dit et prend le niveau au-dessus (le bien prend le quartier, le quartier prend la ville). Aucun réglage propre à une ville dans le code : si une ville semble demander une exception, c'est la règle qu'il faut revoir.

## Niveaux
| Niveau | Ce qu'il faut | Ce qu'on obtient |
|---|---|---|
| Ville | code commune dans `tools/villes.json`, prix/loyers médians, taux de taxe foncière | calcul, classement, ventes réelles, catastrophes naturelles, habitants |
| Quartiers | contours IRIS + prix et loyers RealAdvisor | carte, fiches quartier, écoles, urbanisme, quartiers prioritaires, commerces, risques |
| Trajets | repères (gare, campus, centre) + horaires du réseau (GTFS) | temps réels à pied, à vélo, en bus ; mois vides selon l'emplacement |
| Annonces | relevé quotidien Bien'ici de la ville | annonces, loyers demandés mélangés au calcul |

## Règles
- **Prix d'un studio** : médiane des ventes DVF 2023-2025 d'appartements d'une pièce de 12 à 35 m² vendus seuls (500 à 12 000 €/m²). Quartier : ses ventes, mélangées à la ville (8 ventes pèsent autant que la ville). L'écart RealAdvisor du quartier est gardé à la puissance β, β étant mesuré sur les ventes réelles de la ville (entre 0 et 1 ; 0,5 s'il y a moins de 5 quartiers avec 5 ventes). Sans aucune vente : prix moyen des appartements × surcote.
- **Loyer** : loyer médian de la ville ramené à la surface (exposant 0,6), écart RealAdvisor du quartier (ou estimé depuis le prix), mélangé aux annonces du secteur dès 4 annonces (poids n ÷ (n + 6)), écart plafonné à ±15 %. Lots identiques (même secteur, surface et loyer) comptés une fois.
- **Mois vides** : 1 mois à 10 min ou moins du repère le plus proche, jusqu'à 2,5 mois à 50 min.
- **Repères** : un type par clé (`gare`, `univ`, `centre`) ; autant de campus que nécessaire (`univ`, `univ2`…). Encore placés à la main : à remplacer par une règle (gare principale, sites du supérieur public les plus fréquentés, mairie) avant d'ajouter des villes.
- **Étiquettes de quartier** : centre-ville / près de la gare / près de la fac à 10 min ou moins ; quartier prioritaire d'après la liste 2024.
- **Taxe foncière** : avis de référence (40 €/mois, 22 m², taux 47,8 %) proportionnel au taux de la commune et à la surface.
- **Habitants** : recensement Insee par IRIS ; revenus Filosofi (non publiés pour les petits IRIS).

## Ajouter une ville
1. Ajouter son code commune dans `tools/villes.json` et sa ligne dans `src/js/00-villes-calcul.js`.
2. Dans la page publique, lancer `tools/collecte/dvf.js` puis `tools/collecte/territoire.js` (navigateur : ces API refusent les appels depuis le Mac), copier le résultat dans `data/dvf.json` et `data/territoire.json`.
3. Sur le Mac : `python3 tools/insee_habitants.py` (fichiers Insee dans `data/insee/`).
4. Pour les quartiers : contours IRIS et prix RealAdvisor ; pour les bus : le GTFS du réseau dans `data/gtfs/` puis `node tools/gtfs_temps.js`.
5. `python3 build.py` puis les tests.
