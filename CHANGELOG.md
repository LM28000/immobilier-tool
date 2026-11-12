# Journal des changements

Les grandes étapes du site. Le détail de chaque changement est dans l'historique git, où les messages de commit sont rédigés. Les notes de l'app Android sont dans son propre dépôt.

## 12 novembre 2026 — Insula devient le site

- La nouvelle interface (`src/v3`) est servie à l'adresse d'origine, https://insula.du-cray.eu. Elle a quatre espaces identiques sur ordinateur et téléphone : Explorer, Nos biens, Projet, Réglages.
- L'app installable s'appelle Insula, avec l'icône de l'app Android. `essai.html` renvoie à la page.
- `.well-known/assetlinks.json` : les liens du site (invitation `#g=`, fiche `#f=`) ouvrent l'app Android.
- La fiche à emporter titre les ventes réelles selon le type du bien.

## 11 novembre 2026 — Famille et amis

- Un groupe par foyer : code tiré au hasard, invitation par lien, mode d'emploi, remarques envoyées depuis l'app.
- Insula à l'essai (`essai.html`), à côté de l'interface d'alors.
- `dist/moteur.js` : le moteur sans interface, repris par l'app Android.
- Calcul du rendement 3 à 4 fois plus rapide, avec les mêmes chiffres.
- Pages de confidentialité et de suppression des données.

## 10 novembre 2026 — Le quartier en détail

- Copropriétés du registre national, résidences étudiantes et logements neufs autour des biens.
- Zone tendue, demande étudiante, stock d'annonces à la revente.
- Vue « Bruit » de la carte, lignes de bus et tram dans les rues.
- Documents à demander avant une offre. Audit de cohérence du calcul et des fiches.
- Codes de groupe gardés seulement en empreinte dans la base.

## 9 novembre 2026 — 22 villes et le fond du calcul

- Nantes puis Rouen ajoutées (22 villes). Grandes lignes de train, lignes de transport sur la carte.
- Gestion par agence, hausse des prix selon la ville, mois vides mesurés sur le relevé, DPE à jour du calcul de 2027.
- Biens non louables hors calcul. Photos en grand.
- Annonces visibles par tout le monde (vue en lecture seule), le code de groupe ne servant plus qu'à « Nos biens ».
- Code sous licence MIT ; données sous la licence de leur source.

## 8 novembre 2026 — La version 2

- Nouvelle interface : carte d'abord, fiche en onglets, annonces en tableau ou en nuage, scénarios prudent, central et favorable.
- Carte MapLibre en 3D, quartiers colorés, thème clair ou sombre.
- Sept villes ajoutées (Évreux, Bourges, Niort, Limoges, Brest, Alençon, Cherbourg) ; annonces relevées dans 20 villes.
- Associés : de 1 à 6 personnes. Mode « Tous » : studios, T2 et T3 ensemble.
- Réglages communs à deux ; « Ce qui a bougé » depuis la visite précédente.

## 7 novembre 2026 — Annonces complètes et privées

- Fiche complète de chaque annonce (description, photos, charges, DPE, étage, position).
- Annonces, historique et fiches retirés du dépôt public, rangés dans Supabase.
- Serveur MCP. Prix DVF ramenés à la surface type ; loyers recalés sur les annonces.

## 5 novembre 2026 — Première version

- Comparateur de villes pour un studio meublé : prix, loyers, quartiers IRIS, ventes réelles, liste commune.
