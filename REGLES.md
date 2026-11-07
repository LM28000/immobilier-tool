# Règles de l'app

Une seule règle par donnée, la même pour toutes les villes. Quand une donnée manque, l'app le dit et prend le niveau au-dessus (le bien prend le quartier, le quartier prend la ville). Aucun réglage propre à une ville dans le code : si une ville semble demander une exception, c'est la règle qu'il faut revoir.

## Niveaux
| Niveau | Ce qu'il faut | Ce qu'on obtient |
|---|---|---|
| Ville | code commune dans `tools/villes.json`, prix/loyers médians, taux de taxe foncière | calcul, classement, ventes réelles, catastrophes naturelles, habitants |
| Quartiers | contours IRIS (`tools/collecte/iris.js`) ; RealAdvisor en plus quand il publie les quartiers | carte, fiches quartier, prix et DPE par quartier, écoles, urbanisme, quartiers prioritaires, commerces, risques, trajets à pied et à vélo |
| Trajets | repères (gare, campus, centre) + horaires du réseau (GTFS) | temps réels à pied, à vélo, en bus ; mois vides selon l'emplacement |
| Annonces | relevé quotidien Bien'ici de la ville, studios, T2 et T3 (mêmes bornes de surface que les ventes DVF) | annonces du type choisi, loyers demandés mélangés au calcul |
| Fiches d'annonces | fiche complète de chaque annonce, lue une fois (`tools/fiches.py`) | description, photos, charges de copropriété, DPE, étage, position ; quartier exact de l'annonce |

## Règles
- **Prix d'un studio** : médiane des ventes DVF 2023-2025 d'appartements d'une pièce vendus seuls (9 à 45 m², 500 à 12 000 €/m²) ; même règle pour T2 et T3 avec leur nombre de pièces. Quartier : ses ventes, mélangées à la ville (8 ventes pèsent autant que la ville). L'écart RealAdvisor du quartier est gardé à la puissance β, β étant mesuré sur les ventes réelles de la ville (entre 0 et 1 ; 0,5 s'il y a moins de 5 quartiers avec 5 ventes). Sans aucune vente : prix moyen des appartements × surcote.
- **Prix d'un quartier sans RealAdvisor** : ses propres ventes, mélangées à la ville (poids de 8 ventes) ; le loyer suit le prix avec l'exposant 0,229 mesuré là où RealAdvisor publie les loyers.
- **Type de bien** (réglage commun à toutes les villes) : défini par le nombre de pièces, comme dans les ventes DVF, la carte des loyers de l'État et les annonces : studio (1 pièce), T2 (2 pièces), T3 (3 pièces). La surface ne sert qu'à écarter les erreurs de saisie, avec des bornes larges (studio 9–45 m², T2 25–75 m², T3 40–110 m²). Chaque type a son prix DVF par ville et par quartier, sa surface type et ses frais par défaut : meubles 1 500 € + 1 500 € par pièce, travaux 105 €/m², copropriété 2,3 €/m²/mois. L'écart RealAdvisor par quartier ne s'applique qu'aux studios.
- **Loyer** : loyer médian de la ville ramené à la surface type du bien (22, 42 ou 62 m²) avec un exposant mesuré par ville sur l'État (T1-T2 à 37 m² contre T3+ à 72 m², borné 0,4–0,9), puis à la surface exacte avec l'exposant mesuré sur les annonces de location du même nombre de pièces (toutes villes relevées, chaque ville centrée sur sa moyenne, borné 0,15–0,9 ; 0,25 pour un studio en novembre 2026) : à nombre de pièces égal, le loyer monte peu avec la surface ; écart RealAdvisor du quartier (ou estimé depuis le prix), mélangé aux annonces du même type dans le secteur dès 4 annonces (poids n ÷ (n + 6), loyers ramenés à la surface du bien), écart plafonné à ±15 %. Lots identiques (même secteur, surface et loyer) comptés une fois.
- **Fiche d'une annonce** : quand la position est connue à 300 m près, l'annonce est rattachée au quartier IRIS de ce point ; sinon, au quartier du secteur Bien'ici (le plus fourni en DPE). Les charges de copropriété annoncées remplacent l'estimation et sont comptées en entier côté propriétaire (prudent : une partie est récupérable sur le locataire) ; bornes 60 à 12 000 €/an contre les erreurs de saisie. Le DPE annoncé suit la même règle que le DPE saisi (F et G signalés). Une location en colocation (chambre) est écartée des loyers de comparaison.
- **Mois vides** : 1 mois à 10 min ou moins du repère le plus proche, jusqu'à 2,5 mois à 50 min.
- **Repères** (`tools/collecte/reperes.js`) : gare = la gare de voyageurs de la commune la plus fréquentée (SNCF) ; campus = sites du supérieur public à moins de 8 km, regroupés à 800 m, gardés à partir de 1 500 inscrits et d'un quart du plus gros (3 au plus, sinon le plus gros) ; centre = la mairie principale (lieux de l'IGN, hors mairies annexes ou déléguées).
- **Centre d'un quartier** : centre de sa plus grande partie (même point pour trajets, écoles, urbanisme et quartiers prioritaires).
- **Marché locatif** : part de logements vides (Insee) : tendu sous 7 %, normal de 7 à 10 %, détendu à 10 % et plus ; en contexte, locataires du privé et étudiants par logement de moins de 30 m².
- **Étiquettes de quartier** : centre-ville / près de la gare / près de la fac à 10 min ou moins ; quartier prioritaire d'après la liste 2024.
- **Taxe foncière** : avis de référence (40 €/mois, 22 m², taux 47,8 %) proportionnel au taux de la commune et à la surface.
- **Habitants** : recensement Insee par IRIS ; revenus Filosofi (non publiés pour les petits IRIS).

## Ajouter une ville
1. Ajouter son code commune dans `tools/villes.json` et sa ligne dans `src/js/00-villes-calcul.js`.
2. Dans la page publique, lancer `tools/collecte/dvf.js` puis `tools/collecte/territoire.js` (navigateur : ces API refusent les appels depuis le Mac), copier le résultat dans `data/dvf.json` et `data/territoire.json`.
3. Sur le Mac : `python3 tools/insee_habitants.py` (fichiers Insee dans `data/insee/`).
4. Repères : `tools/collecte/reperes.js` (navigateur) → `data/reperes.json`. Pour les quartiers : `tools/collecte/iris.js` (contours et DPE) puis `python3 tools/iris_fusion.py sortie.json`, relancer `dvf.js` et `territoire.js`, puis `tools/collecte/quartiers.js` (trajets à pied et à vélo, risques, commerces) ; pour les bus : le GTFS du réseau (transport.data.gouv.fr), `python3 tools/gtfs_filtre.py` pour les gros réseaux, puis `node tools/gtfs_temps.js dossier origines.json cibles.json` (un mardi de période scolaire, départs 7 h 45, 8 h, 8 h 15).
5. `python3 build.py` puis les tests.
- **Bus et tram** : `tools/gtfs_temps.js` sur le GTFS du réseau (un mardi de période scolaire, départs 7 h 45, 8 h, 8 h 15). Il tourne aussi dans la page publique avec JSZip quand le serveur du réseau accepte les appels du navigateur ; sinon, déposer le zip dans `data/gtfs/`.
